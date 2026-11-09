const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/config/env');
const { clearUserCache } = require('../src/middleware/authMiddleware');

const CSRF_TOKEN = 'test-csrf-token';

function signAccessToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function authCookieHeader(accessToken, csrfToken = CSRF_TOKEN) {
    return `access_token=${accessToken}; csrf_token=${csrfToken}`;
}

function authHeaders(userOrToken, { mutating = false, csrfToken = CSRF_TOKEN } = {}) {
    const token = typeof userOrToken === 'string' ? userOrToken : signAccessToken(userOrToken);
    const headers = {
        Cookie: authCookieHeader(token, csrfToken)
    };
    if (mutating) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    return headers;
}

function mockVerifiedUser(db, user) {
    db.query.mockResolvedValueOnce([[{
        user_id: user.id,
        username: user.username,
        role: user.role,
        must_change_password: user.must_change_password ? 1 : 0
    }]]);
}

const USERS = {
    admin: { id: 1, username: 'admin', role: 'admin' },
    staff: { id: 2, username: 'staff1', role: 'staff' },
    mechanic: { id: 3, username: 'tech1', role: 'mechanic' }
};

module.exports = {
    CSRF_TOKEN,
    signAccessToken,
    authCookieHeader,
    authHeaders,
    mockVerifiedUser,
    clearUserCache,
    USERS
};
