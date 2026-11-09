const request = require('supertest');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');
const app = require('../src/server');
const { authHeaders, mockVerifiedUser, clearUserCache, USERS } = require('./helpers');

describe('Parts / Inventory API & RBAC Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearUserCache();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    it('should reject unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/parts');
        expect(res.statusCode).toBe(401);
    });

    it('should fetch parts list with pagination for authenticated users', async () => {
        mockVerifiedUser(db, USERS.admin);
        db.query
            .mockResolvedValueOnce([[{ part_id: 1, part_name: 'Brake Pad Set', part_number: 'BP-001', stock_quantity: 15, unit_price: 49.99 }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/parts')
            .set(authHeaders(USERS.admin));

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
    });

    it('should reject part creation with negative stock quantity or negative price', async () => {
        mockVerifiedUser(db, USERS.admin);

        const res = await request(app)
            .post('/api/parts')
            .set(authHeaders(USERS.admin, { mutating: true }))
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
        mockVerifiedUser(db, USERS.mechanic);

        const res = await request(app)
            .post('/api/parts')
            .set(authHeaders(USERS.mechanic, { mutating: true }))
            .send({
                part_name: 'Spark Plug Set',
                part_number: 'SP-002',
                stock_quantity: 20,
                unit_price: 29.99
            });

        expect(res.statusCode).toBe(403);
    });

    it('should prevent creating part with duplicate part_number (SKU)', async () => {
        mockVerifiedUser(db, USERS.staff);
        db.query.mockResolvedValueOnce([[{ part_id: 1 }]]);

        const res = await request(app)
            .post('/api/parts')
            .set(authHeaders(USERS.staff, { mutating: true }))
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
        mockVerifiedUser(db, USERS.staff);
        db.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 8 }]);

        const res = await request(app)
            .post('/api/parts')
            .set(authHeaders(USERS.staff, { mutating: true }))
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
