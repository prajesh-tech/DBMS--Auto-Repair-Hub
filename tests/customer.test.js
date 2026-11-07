const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');
const app = require('../src/server');
const { JWT_SECRET } = require('../src/config/env');

describe('Customer API & RBAC Tests', () => {
    const adminToken = jwt.sign({ user_id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    const staffToken = jwt.sign({ user_id: 2, username: 'staff1', role: 'staff' }, JWT_SECRET, { expiresIn: '1h' });
    const mechanicToken = jwt.sign({ user_id: 3, username: 'tech1', role: 'mechanic' }, JWT_SECRET, { expiresIn: '1h' });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    it('should reject unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/customers');
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should fetch list of customers with valid JWT', async () => {
        db.query
            .mockResolvedValueOnce([[{ customer_id: 1, name: 'John Doe', phone: '555-0192', email: 'john@example.com' }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0].name).toBe('John Doe');
    });

    it('should reject customer creation with missing or invalid fields (validation middleware)', async () => {
        const res = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '', // Empty name violates validation
                phone: '555-1234',
                email: 'invalid-email-format'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should forbid mechanic from creating a customer (RBAC 403)', async () => {
        const res = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${mechanicToken}`)
            .send({
                name: 'Jane Smith',
                phone: '555-4321',
                email: 'jane@example.com'
            });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('should allow staff/admin to create a new customer', async () => {
        db.query.mockResolvedValueOnce([{ insertId: 10 }]);

        const res = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${staffToken}`)
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
