const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../config/env');

const USER_CACHE_TTL_MS = 30 * 1000;
/** @type {Map<number, { user: object, expiresAt: number }>} */
const userCache = new Map();

function invalidateUserCache(userId) {
    if (userId !== undefined && userId !== null) {
        userCache.delete(Number(userId));
    }
}

function clearUserCache() {
    userCache.clear();
}

async function loadUserById(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return null;

    const cached = userCache.get(id);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        return cached.user;
    }

    const [rows] = await db.query(
        'SELECT user_id, username, role, must_change_password FROM User WHERE user_id = ?',
        [id]
    );
    if (!rows || rows.length === 0) {
        userCache.delete(id);
        return null;
    }

    const row = rows[0];
    const user = {
        id: row.user_id,
        username: row.username,
        role: String(row.role || '').toLowerCase(),
        must_change_password: !!row.must_change_password
    };
    userCache.set(id, { user, expiresAt: now + USER_CACHE_TTL_MS });
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
