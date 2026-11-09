const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('../src/config/database', () => {
    return {
        query: jest.fn(),
        getConnection: jest.fn(),
        end: jest.fn().mockResolvedValue()
    };
});

const db = require('../src/config/database');
const app = require('../src/server');
const { JWT_SECRET, JWT_REFRESH_SECRET, BCRYPT_ROUNDS } = require('../src/config/env');
const { authHeaders, mockVerifiedUser, USERS, CSRF_TOKEN, clearUserCache } = require('./helpers');

describe('Authentication & Security API Tests', () => {
    const adminPassword = 'AdminPassword123!';
    const passwordHash = bcrypt.hashSync(adminPassword, BCRYPT_ROUNDS);

    beforeEach(() => {
        jest.clearAllMocks();
        clearUserCache();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    describe('POST /api/auth/login', () => {
        it('should reject login when user does not exist in database', async () => {
            db.query.mockResolvedValueOnce([[]]);

            const res = await request(app)
                .post('/api/auth/login')
                .set('Cookie', `csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN)
                .send({ username: 'nonexistent', password: 'AnyPassword123!' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid username or password/i);
        });

        it('should reject backdoor password (1234) when not matching database bcrypt hash', async () => {
            db.query.mockResolvedValueOnce([[{
                user_id: 1,
                username: 'admin',
                password_hash: passwordHash,
                role: 'admin',
                must_change_password: 1
            }]]);

            const res = await request(app)
                .post('/api/auth/login')
                .set('Cookie', `csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN)
                .send({ username: 'admin', password: '1234' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should reject login with incorrect password', async () => {
            db.query.mockResolvedValueOnce([[{
                user_id: 1,
                username: 'admin',
                password_hash: passwordHash,
                role: 'admin',
                must_change_password: 0
            }]]);

            const res = await request(app)
                .post('/api/auth/login')
                .set('Cookie', `csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN)
                .send({ username: 'admin', password: 'WrongPassword999!' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should authenticate successfully without returning JWT in JSON body', async () => {
            db.query
                .mockResolvedValueOnce([[{
                    user_id: 1,
                    username: 'admin',
                    password_hash: passwordHash,
                    role: 'admin',
                    must_change_password: 1
                }]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app)
                .post('/api/auth/login')
                .set('Cookie', `csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN)
                .send({ username: 'admin', password: adminPassword });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeUndefined();
            expect(res.body.user).toBeDefined();
            expect(res.body.user.role).toBe('admin');
            expect(res.body.user.must_change_password).toBe(true);
            expect(res.headers['set-cookie']).toBeDefined();
            const cookies = res.headers['set-cookie'].join(';');
            expect(cookies).toMatch(/access_token=/);
            expect(cookies).toMatch(/refresh_token=/);
        });

        it('should reject mutating requests without CSRF token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: adminPassword });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/csrf/i);
        });
    });

    describe('POST /api/auth/register - admin only', () => {
        it('should return 401 when unauthenticated', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .set('Cookie', `csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN)
                .send({
                    username: 'newuser',
                    password: 'SecurePassword123!',
                    role: 'staff'
                });

            expect(res.statusCode).toBe(401);
        });

        it('should return 403 when staff attempts registration', async () => {
            mockVerifiedUser(db, USERS.staff);

            const res = await request(app)
                .post('/api/auth/register')
                .set(authHeaders(USERS.staff, { mutating: true }))
                .send({
                    username: 'newuser',
                    password: 'SecurePassword123!',
                    role: 'staff'
                });

            expect(res.statusCode).toBe(403);
        });

        it('should reject registration with weak password', async () => {
            mockVerifiedUser(db, USERS.admin);

            const res = await request(app)
                .post('/api/auth/register')
                .set(authHeaders(USERS.admin, { mutating: true }))
                .send({
                    username: 'newuser',
                    password: 'weak',
                    role: 'staff'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it('should reject invalid role (including customer)', async () => {
            mockVerifiedUser(db, USERS.admin);

            const res = await request(app)
                .post('/api/auth/register')
                .set(authHeaders(USERS.admin, { mutating: true }))
                .send({
                    username: 'superuser_test',
                    password: 'SecurePassword123!',
                    role: 'customer'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it('should register successfully as admin', async () => {
            mockVerifiedUser(db, USERS.admin);
            db.query
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 5 }]);

            const res = await request(app)
                .post('/api/auth/register')
                .set(authHeaders(USERS.admin, { mutating: true }))
                .send({
                    username: 'newtech',
                    password: 'TechPassword123!',
                    role: 'mechanic'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user.role).toBe('mechanic');
        });
    });

    describe('Refresh rotation and logout revoke', () => {
        it('should rotate refresh tokens and reject reuse of revoked token', async () => {
            const user = {
                user_id: 1,
                username: 'admin',
                role: 'admin',
                must_change_password: 0
            };
            const jti = crypto.randomUUID();
            const refresh = jwt.sign(
                { id: 1, username: 'admin', role: 'admin', jti },
                JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            db.query
                .mockResolvedValueOnce([[{
                    jti,
                    user_id: 1,
                    expires_at: new Date(Date.now() + 86400000),
                    revoked_at: null
                }]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([[user]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', `refresh_token=${refresh}; csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN);

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeUndefined();
            expect(res.body.user.role).toBe('admin');

            db.query
                .mockResolvedValueOnce([[{
                    jti,
                    user_id: 1,
                    expires_at: new Date(Date.now() + 86400000),
                    revoked_at: new Date()
                }]])
                .mockResolvedValueOnce([{ affectedRows: 2 }]);

            const reuse = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', `refresh_token=${refresh}; csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN);

            expect(reuse.statusCode).toBe(403);
            expect(reuse.body.message).toMatch(/reuse/i);
        });

        it('should revoke refresh token on logout', async () => {
            const jti = crypto.randomUUID();
            const refresh = jwt.sign(
                { id: 1, username: 'admin', role: 'admin', jti },
                JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', `refresh_token=${refresh}; csrf_token=${CSRF_TOKEN}`)
                .set('X-CSRF-Token', CSRF_TOKEN);

            expect(res.statusCode).toBe(200);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringMatching(/UPDATE RefreshToken SET revoked_at/i),
                [jti]
            );
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return 401 when accessing protected route without cookie', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.statusCode).toBe(401);
        });

        it('should reject ?token= query string authentication', async () => {
            const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            const res = await request(app).get(`/api/auth/me?token=${token}`);
            expect(res.statusCode).toBe(401);
        });

        it('should return user profile from access_token cookie after DB lookup', async () => {
            mockVerifiedUser(db, USERS.admin);

            const res = await request(app)
                .get('/api/auth/me')
                .set(authHeaders(USERS.admin));

            expect(res.statusCode).toBe(200);
            expect(res.body.user.username).toBe('admin');
            expect(res.body.user.id).toBe(1);
        });

        it('should reject tokens for deleted users', async () => {
            db.query.mockResolvedValueOnce([[]]);

            const res = await request(app)
                .get('/api/auth/me')
                .set(authHeaders(USERS.admin));

            expect(res.statusCode).toBe(401);
        });
    });

    describe('POST /api/auth/change-password', () => {
        it('should change password and clear must_change_password', async () => {
            mockVerifiedUser(db, { ...USERS.admin, must_change_password: true });
            db.query
                .mockResolvedValueOnce([[{
                    user_id: 1,
                    username: 'admin',
                    password_hash: passwordHash,
                    role: 'admin',
                    must_change_password: 1
                }]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request(app)
                .post('/api/auth/change-password')
                .set(authHeaders(USERS.admin, { mutating: true }))
                .send({
                    currentPassword: adminPassword,
                    newPassword: 'NewSecurePass123!'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.user.must_change_password).toBe(false);
        });
    });
});
