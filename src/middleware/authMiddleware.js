const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'auto_repair_hub_jwt_secret_key_2026_super_secure';

const verifyToken = (req, res, next) => {
    let token = req.cookies ? req.cookies.access_token : null;

    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.split(' ')[1] 
            : req.query.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin privilege required' });
    }
};

const requireRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden: Insufficient privileges for role '${req.user ? req.user.role : 'none'}'` 
            });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    requireAdmin,
    requireRole
};
