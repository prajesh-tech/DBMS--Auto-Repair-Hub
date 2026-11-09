const request = require('supertest');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');
const app = require('../src/server');
const { authHeaders, mockVerifiedUser, clearUserCache, USERS } = require('./helpers');

describe('Customer API & RBAC Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearUserCache();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    it('should reject unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/customers');
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should fetch list of customers with valid cookie auth', async () => {
        mockVerifiedUser(db, USERS.admin);
        db.query
            .mockResolvedValueOnce([[{ customer_id: 1, name: 'John Doe', phone: '555-0192', email: 'john@example.com' }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/customers')
            .set(authHeaders(USERS.admin));

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0].name).toBe('John Doe');
    });

    it('should reject customer creation with missing or invalid fields (validation middleware)', async () => {
        mockVerifiedUser(db, USERS.admin);

        const res = await request(app)
            .post('/api/customers')
            .set(authHeaders(USERS.admin, { mutating: true }))
            .send({
                name: '',
                phone: '555-1234',
                email: 'invalid-email-format'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should forbid mechanic from creating a customer (RBAC 403)', async () => {
        mockVerifiedUser(db, USERS.mechanic);

        const res = await request(app)
            .post('/api/customers')
            .set(authHeaders(USERS.mechanic, { mutating: true }))
            .send({
                name: 'Jane Smith',
                phone: '555-4321',
                email: 'jane@example.com'
            });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('should allow staff/admin to create a new customer', async () => {
        mockVerifiedUser(db, USERS.staff);
        db.query.mockResolvedValueOnce([{ insertId: 10 }]);

        const res = await request(app)
            .post('/api/customers')
            .set(authHeaders(USERS.staff, { mutating: true }))
            .send({
                name: 'Jane Smith',
                phone: '555-4321',
                email: 'jane@example.com'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.customerId).toBe(10);
    });
});
