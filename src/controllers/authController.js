const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'auto_repair_hub_jwt_secret_key_2026_super_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'auto_repair_hub_jwt_refresh_secret_key_2026_super_secure';

// Helper to send HTTP-Only cookies
const sendTokenCookies = (res, userPayload) => {
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(userPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const cookieOptions = {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    };

    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15m
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7d

    return { accessToken, refreshToken };
};

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        // Hardcoded user profile fallbacks for initial login setup
        if ((username === 'admin' || username === 'staff' || username === 'mechanic') && (password === '1234' || password === 'Admin@123')) {
            const role = username;
            const userPayload = { id: role === 'admin' ? 1 : role === 'staff' ? 2 : 3, username, role };
            const { accessToken } = sendTokenCookies(res, userPayload);
            return res.json({
                success: true,
                message: 'Login successful',
                token: accessToken,
                user: userPayload
            });
        }

        const [users] = await db.query('SELECT * FROM User WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const userPayload = { id: user.user_id, username: user.username, role: user.role };
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
            return res.status(401).json({ success: false, message: 'Refresh Token required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
            const userPayload = { id: decoded.id, username: decoded.username, role: decoded.role };

            // Rotate tokens and set new cookies
            const { accessToken } = sendTokenCookies(res, userPayload);

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                token: accessToken,
                user: userPayload
            });
        } catch (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired Refresh Token' });
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

const register = async (req, res, next) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        const [existing] = await db.query('SELECT user_id FROM User WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO User (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role || 'staff']
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId
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
    getMe
};
