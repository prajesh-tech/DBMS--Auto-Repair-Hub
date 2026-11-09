const request = require('supertest');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');
const app = require('../src/server');
const { authHeaders, mockVerifiedUser, clearUserCache, USERS } = require('./helpers');

describe('Car / Vehicle API & RBAC Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearUserCache();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    it('should reject unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/cars');
        expect(res.statusCode).toBe(401);
    });

    it('should fetch car list with pagination and search', async () => {
        mockVerifiedUser(db, USERS.admin);
        db.query
            .mockResolvedValueOnce([[{ car_id: 1, vin: '1HGCR2F83HA000001', manufacturer: 'Honda', model: 'Accord' }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/cars?search=Accord')
            .set(authHeaders(USERS.admin));

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].model).toBe('Accord');
    });

    it('should reject car creation with invalid VIN length (must be 17 chars)', async () => {
        mockVerifiedUser(db, USERS.admin);

        const res = await request(app)
            .post('/api/cars')
            .set(authHeaders(USERS.admin, { mutating: true }))
            .send({
                vin: 'SHORTVIN',
                manufacturer: 'Tesla',
                model: 'Model S',
                year: 2024,
                customer_id: 1
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should reject car creation with out-of-bounds year', async () => {
        mockVerifiedUser(db, USERS.admin);

        const res = await request(app)
            .post('/api/cars')
            .set(authHeaders(USERS.admin, { mutating: true }))
            .send({
                vin: '1HGCR2F83HA000002',
                manufacturer: 'Tesla',
                model: 'Model S',
                year: 1800,
                customer_id: 1
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should forbid mechanic from registering new cars (RBAC 403)', async () => {
        mockVerifiedUser(db, USERS.mechanic);

        const res = await request(app)
            .post('/api/cars')
            .set(authHeaders(USERS.mechanic, { mutating: true }))
            .send({
                vin: '1HGCR2F83HA000003',
                manufacturer: 'Toyota',
                model: 'Camry',
                year: 2023,
                customer_id: 1
            });

        expect(res.statusCode).toBe(403);
    });

    it('should allow staff to create car when customer exists', async () => {
        mockVerifiedUser(db, USERS.staff);
        db.query
            .mockResolvedValueOnce([[{ customer_id: 1 }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 5 }]);

        const res = await request(app)
            .post('/api/cars')
            .set(authHeaders(USERS.staff, { mutating: true }))
            .send({
                vin: '1HGCR2F83HA000004',
                manufacturer: 'Toyota',
                model: 'Corolla',
                year: 2022,
                color: 'Silver',
                customer_id: 1
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.carId).toBe(5);
    });
});
