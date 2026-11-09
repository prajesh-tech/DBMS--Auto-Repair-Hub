const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../config/env');

// Compatibility hooks for callers/tests; users are reloaded on every request.
function invalidateUserCache() {}
function clearUserCache() {}

async function loadUserById(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return null;

    const [rows] = await db.query(
        'SELECT user_id, username, role, must_change_password, employee_id FROM User WHERE user_id = ?',
        [id]
    );
    if (!rows || rows.length === 0) {
        return null;
    }

    const row = rows[0];
    const user = {
        id: row.user_id,
        employee_id: row.employee_id || null,
        username: row.username,
        role: String(row.role || '').toLowerCase(),
        must_change_password: !!row.must_change_password
    };

    return user;
}

const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies ? req.cookies.access_token : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied: No authentication token provided'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }

        const userId = decoded.id;
        const user = await loadUserById(userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }

        const allowedDuringPasswordChange = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout', '/api/auth/refresh'];
        if (user.must_change_password && !allowedDuringPasswordChange.includes(req.originalUrl.split('?')[0])) {
            return res.status(403).json({ success: false, message: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' });
        }
        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

const requireRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Authentication required'
            });
        }

        const userRole = (req.user.role || '').toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

        if (!normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Role '${req.user.role}' does not have permission to access this resource`
            });
        }

        next();
    };
};

const requireAdmin = requireRole(['admin']);

module.exports = {
    verifyToken,
    requireAdmin,
    requireRole,
    loadUserById,
    invalidateUserCache,
    clearUserCache
};
