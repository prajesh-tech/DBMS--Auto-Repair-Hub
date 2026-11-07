const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const verifyToken = (req, res, next) => {
    let token = req.cookies ? req.cookies.access_token : null;

    if (!token) {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access Denied: No authentication token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired access token' 
        });
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
        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

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
    requireRole
};
