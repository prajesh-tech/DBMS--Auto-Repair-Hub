const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, JWT_REFRESH_SECRET, isProduction } = require('../config/env');

const ALLOWED_ROLES = ['admin', 'staff', 'mechanic', 'customer'];

// Helper to send HTTP-Only cookies
const sendTokenCookies = (res, userPayload) => {
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(userPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const cookieOptions = {
        httpOnly: true,
        sameSite: 'strict',
        secure: isProduction,
        path: '/'
    };

    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15m
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7d

    return { accessToken, refreshToken };
};

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

        // Enforce database-backed authentication using bcrypt password verification
        const [users] = await db.query('SELECT * FROM User WHERE username = ?', [trimmedUsername]);
        if (!users || users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        const userPayload = { 
            id: user.user_id, 
            username: user.username, 
            role: (user.role || 'customer').toLowerCase() 
        };
        const { accessToken } = sendTokenCookies(res, userPayload);

        res.json({
            success: true,
            message: 'Login successful',
            token: accessToken,
            user: userPayload
        });
    } catch (err) {
        next(err);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies ? req.cookies.refresh_token : (req.body ? req.body.refreshToken : null);

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Refresh Token required' 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
            const userPayload = { 
                id: decoded.id, 
                username: decoded.username, 
                role: (decoded.role || 'customer').toLowerCase() 
            };

            // Rotate tokens and set new cookies
            const { accessToken } = sendTokenCookies(res, userPayload);

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                token: accessToken,
                user: userPayload
            });
        } catch (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired Refresh Token' 
            });
        }
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/' });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

// Password complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
const validatePasswordComplexity = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSpecial;
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

        if (!validatePasswordComplexity(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
            });
        }

        const assignedRole = (role ? String(role).trim().toLowerCase() : 'customer');
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO User (username, password_hash, role) VALUES (?, ?, ?)',
            [trimmedUsername, hashedPassword, assignedRole]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId,
            user: {
                id: result.insertId,
                username: trimmedUsername,
                role: assignedRole
            }
        });
    } catch (err) {
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
    getMe,
    ALLOWED_ROLES,
    validatePasswordComplexity
};
