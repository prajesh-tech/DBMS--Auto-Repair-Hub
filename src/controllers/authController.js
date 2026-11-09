const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const {
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    COOKIE_SECURE,
    BCRYPT_ROUNDS,
    ALLOWED_ROLES
} = require('../config/env');
const { invalidateUserCache } = require('../middleware/authMiddleware');
const { isLocked, recordFailure, clearFailures } = require('../middleware/loginLockout');

const AUTH_COOKIE_BASE = {
    httpOnly: true,
    sameSite: 'strict',
    secure: COOKIE_SECURE,
    path: '/'
};

function buildUserPayload(user) {
    return {
        id: user.user_id,
        employee_id: user.employee_id || null,
        username: user.username,
        role: String(user.role || '').toLowerCase(),
        must_change_password: !!user.must_change_password
    };
}

function passwordByteLength(password) {
    return Buffer.byteLength(String(password), 'utf8');
}

const validatePasswordComplexity = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (passwordByteLength(password) > 72) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSpecial;
};

async function persistRefreshToken(jti, userId, expiresAt, connection = db) {
    await connection.query(
        'INSERT INTO RefreshToken (jti, user_id, expires_at) VALUES (?, ?, ?)',
        [jti, userId, expiresAt]
    );
}

async function revokeRefreshToken(jti) {
    await db.query(
        'UPDATE RefreshToken SET revoked_at = CURRENT_TIMESTAMP WHERE jti = ? AND revoked_at IS NULL',
        [jti]
    );
}

async function revokeAllUserRefreshTokens(userId, connection = db) {
    await connection.query(
        'UPDATE RefreshToken SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL',
        [userId]
    );
}

async function issueTokenCookies(res, userRow, connection = db) {
    const payload = {
        id: userRow.user_id,
        username: userRow.username,
        role: String(userRow.role || '').toLowerCase()
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const jti = crypto.randomUUID();
    const refreshToken = jwt.sign({ ...payload, jti }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await persistRefreshToken(jti, userRow.user_id, expiresAt, connection);

    res.cookie('access_token', accessToken, { ...AUTH_COOKIE_BASE, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, {
        ...AUTH_COOKIE_BASE,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return buildUserPayload(userRow);
}

function clearAuthCookies(res) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
}

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required strings'
            });
        }

        const trimmedUsername = username.trim();
        const lock = isLocked(trimmedUsername);
        if (lock.locked) {
            return res.status(429).json({
                success: false,
                message: `Too many failed login attempts. Try again in ${lock.retryAfterSec} seconds.`
            });
        }

        const [users] = await db.query('SELECT * FROM User WHERE username = ?', [trimmedUsername]);
        if (!users || users.length === 0) {
            recordFailure(trimmedUsername);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            recordFailure(trimmedUsername);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        clearFailures(trimmedUsername);
        const userPayload = await issueTokenCookies(res, user);

        res.json({
            success: true,
            message: 'Login successful',
            user: userPayload
        });
    } catch (err) {
        next(err);
    }
};

const refreshToken = async (req, res, next) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) return res.status(401).json({ success: false, message: 'Refresh Token required' });
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    clearAuthCookies(res);
    return res.status(403).json({ success: false, message: 'Invalid or expired Refresh Token' });
  }
  if (!decoded.jti) return res.status(403).json({ success: false, message: 'Invalid refresh token' });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    // Lock the user first so rotations and replay revocations for all sessions serialize.
    const [users] = await connection.query(
      'SELECT user_id, username, role, must_change_password, employee_id FROM User WHERE user_id = ? FOR UPDATE', [decoded.id]
    );
    const [rows] = await connection.query(
      'SELECT jti, user_id, expires_at, revoked_at FROM RefreshToken WHERE jti = ? FOR UPDATE', [decoded.jti]
    );
    const stored = rows[0];
    if (!users.length || !stored || stored.user_id !== decoded.id) {
      await connection.rollback();
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'Invalid refresh session' });
    }
    if (stored.revoked_at) {
      await connection.query('UPDATE RefreshToken SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL', [stored.user_id]);
      await connection.commit();
      clearAuthCookies(res);
      return res.status(403).json({ success: false, message: 'Refresh token reuse detected. All sessions revoked.' });
    }
    if (new Date(stored.expires_at).getTime() <= Date.now()) {
      await connection.rollback();
      clearAuthCookies(res);
      return res.status(403).json({ success: false, message: 'Expired refresh token' });
    }
    await connection.query('UPDATE RefreshToken SET revoked_at = CURRENT_TIMESTAMP WHERE jti = ? AND revoked_at IS NULL', [decoded.jti]);
    const user = await issueTokenCookies(res, users[0], connection);
    await connection.commit();
    res.json({ success: true, message: 'Token refreshed successfully', user });
  } catch (err) {
    if (connection) await connection.rollback();
    clearAuthCookies(res);
    next(err);
  } finally {
    if (connection) connection.release();
  }
};

const logout = async (req, res, next) => {
    try {
        const token = req.cookies ? req.cookies.refresh_token : null;
        let decoded;
        if (token) {
            try { decoded = jwt.verify(token, JWT_REFRESH_SECRET); } catch (err) { /* Invalid cookies can still be cleared. */ }
        }
        if (decoded && decoded.jti) await revokeRefreshToken(decoded.jti);
        clearAuthCookies(res);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

const register = async (req, res, next) => {
    try {
        const { username, password, role } = req.body;

        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
            return res.status(400).json({
                success: false,
                message: 'Username must be between 3 and 30 characters'
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            return res.status(400).json({
                success: false,
                message: 'Username can only contain alphanumeric characters and underscores'
            });
        }

        if (passwordByteLength(password) > 72) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at most 72 bytes'
            });
        }

        if (!validatePasswordComplexity(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
            });
        }

        const assignedRole = role ? String(role).trim().toLowerCase() : '';
        if (!ALLOWED_ROLES.includes(assignedRole)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role specified. Allowed roles are: ${ALLOWED_ROLES.join(', ')}`
            });
        }

        const [existing] = await db.query('SELECT user_id FROM User WHERE username = ?', [trimmedUsername]);
        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username is already taken'
            });
        }

        const employeeId = req.body.employee_id || null;
        if (employeeId) {
            const [employees] = await db.query('SELECT employee_id FROM Employee WHERE employee_id = ? AND is_deleted = FALSE', [employeeId]);
            if (!employees.length) return res.status(400).json({ success: false, message: 'Employee does not exist' });
        }
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const [result] = await db.query(
            'INSERT INTO User (username, password_hash, role, must_change_password, employee_id) VALUES (?, ?, ?, TRUE, ?)',
            [trimmedUsername, hashedPassword, assignedRole, employeeId]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId,
            user: {
                id: result.insertId,
                username: trimmedUsername,
                role: assignedRole,
                must_change_password: true
            }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Username or employee already linked' });
        next(err);
    }
};

const changePassword = async (req, res, next) => {
  let connection;
  try {
    const { currentPassword, newPassword } = req.body;
    if (!validatePasswordComplexity(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must meet complexity requirements and be at most 72 bytes' });
    }
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.query('SELECT * FROM User WHERE user_id = ? FOR UPDATE', [req.user.id]);
    if (!users.length || !(await bcrypt.compare(currentPassword, users[0].password_hash))) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    const user = users[0];
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await connection.query('UPDATE User SET password_hash = ?, must_change_password = FALSE WHERE user_id = ?', [passwordHash, user.user_id]);
    await revokeAllUserRefreshTokens(user.user_id, connection);
    const payload = await issueTokenCookies(res, { ...user, must_change_password: false }, connection);
    await connection.commit();
    invalidateUserCache(user.user_id);
    res.json({ success: true, message: 'Password changed successfully', user: payload });
  } catch (err) {
    if (connection) await connection.rollback();
    clearAuthCookies(res);
    next(err);
  } finally {
    if (connection) connection.release();
  }
};

const linkEmployee = async (req, res, next) => {
  try {
    const employeeId = req.body.employee_id;
    if (employeeId !== null) {
      const [employees] = await db.query('SELECT employee_id FROM Employee WHERE employee_id = ? AND is_deleted = FALSE', [employeeId]);
      if (!employees.length) return res.status(400).json({ success: false, message: 'Employee does not exist' });
    }
    const [result] = await db.query('UPDATE User SET employee_id = ? WHERE user_id = ?', [employeeId, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found' });
    invalidateUserCache(req.params.id);
    res.json({ success: true, message: 'Employee link updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Employee is already linked' });
    next(err);
  }
};

const getMe = async (req, res, next) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    register,
    changePassword,
    getMe,
    linkEmployee,
    ALLOWED_ROLES,
    validatePasswordComplexity
};
