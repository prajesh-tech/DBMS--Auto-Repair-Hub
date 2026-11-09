const crypto = require('crypto');
const { COOKIE_SECURE } = require('../config/env');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

const csrfCookieOptions = () => ({
    httpOnly: false,
    sameSite: 'strict',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
});

const ensureAndValidateCsrf = (req, res, next) => {
    if (!MUTATING_METHODS.has(req.method)) {
        if (!req.cookies || !req.cookies.csrf_token) {
            const token = crypto.randomBytes(32).toString('hex');
            res.cookie('csrf_token', token, csrfCookieOptions());
        }
        return next();
    }

    const cookieToken = req.cookies && req.cookies.csrf_token;
    const headerToken = req.get('X-CSRF-Token');

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }

    return next();
};

module.exports = {
    ensureAndValidateCsrf,
    csrfCookieOptions
};
