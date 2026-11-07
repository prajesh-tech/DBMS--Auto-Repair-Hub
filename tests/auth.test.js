const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => {
    return {
        query: jest.fn(),
        getConnection: jest.fn(),
        end: jest.fn().mockResolvedValue()
    };
});

const db = require('../src/config/database');
const app = require('../src/server');
const { JWT_SECRET } = require('../src/config/env');

describe('Authentication & Security API Tests', () => {
    const adminPassword = 'AdminPassword123!';
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    describe('POST /api/auth/login - Strict Database Authentication', () => {
        it('should reject login when user does not exist in database', async () => {
            db.query.mockResolvedValueOnce([[]]); // User not found

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'nonexistent', password: 'AnyPassword123!' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid username or password/i);
        });

        it('should reject backdoor password (1234) when not matching database bcrypt hash', async () => {
            // User exists with secure hash in database
            db.query.mockResolvedValueOnce([[{
                user_id: 1,
                username: 'admin',
                password_hash: passwordHash,
                role: 'admin'
            }]]);

            // Attempt old backdoor password
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: '1234' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid username or password/i);
        });

        it('should reject login with incorrect password', async () => {
            db.query.mockResolvedValueOnce([[{
                user_id: 1,
                username: 'admin',
                password_hash: passwordHash,
                role: 'admin'
            }]]);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'WrongPassword999!' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should authenticate successfully with valid database bcrypt credentials', async () => {
            db.query.mockResolvedValueOnce([[{
                user_id: 1,
                username: 'admin',
                password_hash: passwordHash,
                role: 'admin'
            }]]);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: adminPassword });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user).toBeDefined();
            expect(res.body.user.role).toBe('admin');
            expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    describe('POST /api/auth/register - Input Validation & Password Complexity', () => {
        it('should reject registration with weak password (missing uppercase, number, symbol)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newuser',
                    password: 'weak',
                    role: 'staff'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toBeDefined();
        });

        it('should reject registration with invalid/unauthorized role', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'superuser_test',
                    password: 'SecurePassword123!',
                    role: 'superuser'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toBeDefined();
        });

        it('should reject registration if username is already taken', async () => {
            db.query.mockResolvedValueOnce([[{ user_id: 2 }]]); // Username exists

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'existinguser',
                    password: 'SecurePassword123!',
                    role: 'staff'
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/already taken/i);
        });

        it('should register successfully with valid credentials and allowed role', async () => {
            db.query
                .mockResolvedValueOnce([[]]) // Username not taken
                .mockResolvedValueOnce([{ insertId: 5 }]); // Insert succeeds

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newtech',
                    password: 'TechPassword123!',
                    role: 'mechanic'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.role).toBe('mechanic');
        });
    });

    describe('GET /api/auth/me & Protected Route Authorization', () => {
        it('should return 401 when accessing protected route without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return user profile when valid JWT is provided in Authorization header', async () => {
            const validToken = jwt.sign(
                { user_id: 1, username: 'admin', role: 'admin' },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.username).toBe('admin');
        });
    });
});
