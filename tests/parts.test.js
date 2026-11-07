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

describe('Parts / Inventory API & RBAC Tests', () => {
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
        const res = await request(app).get('/api/parts');
        expect(res.statusCode).toBe(401);
    });

    it('should fetch parts list with pagination for authenticated users', async () => {
        db.query
            .mockResolvedValueOnce([[{ part_id: 1, part_name: 'Brake Pad Set', part_number: 'BP-001', stock_quantity: 15, unit_price: 49.99 }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/parts')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
    });

    it('should reject part creation with negative stock quantity or negative price', async () => {
        const res = await request(app)
            .post('/api/parts')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                part_name: 'Oil Filter',
                part_number: 'OF-999',
                stock_quantity: -5,
                unit_price: -10.00
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should forbid mechanic from creating catalog inventory parts (RBAC 403)', async () => {
        const res = await request(app)
            .post('/api/parts')
            .set('Authorization', `Bearer ${mechanicToken}`)
            .send({
                part_name: 'Spark Plug Set',
                part_number: 'SP-002',
                stock_quantity: 20,
                unit_price: 29.99
            });

        expect(res.statusCode).toBe(403);
    });

    it('should prevent creating part with duplicate part_number (SKU)', async () => {
        db.query.mockResolvedValueOnce([[{ part_id: 1 }]]); // Existing SKU found

        const res = await request(app)
            .post('/api/parts')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                part_name: 'Duplicate Part',
                part_number: 'BP-001',
                stock_quantity: 10,
                unit_price: 35.00
            });

        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already exists/i);
    });

    it('should allow staff/admin to create a valid part', async () => {
        db.query
            .mockResolvedValueOnce([[]]) // No duplicate SKU
            .mockResolvedValueOnce([{ insertId: 8 }]); // Insert part

        const res = await request(app)
            .post('/api/parts')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                part_name: 'Cabin Air Filter',
                part_number: 'CAF-500',
                stock_quantity: 12,
                unit_price: 24.50,
                min_stock_alert: 3
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.partId).toBe(8);
    });
});
