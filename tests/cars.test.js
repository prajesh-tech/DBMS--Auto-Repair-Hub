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

describe('Car / Vehicle API & RBAC Tests', () => {
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
        const res = await request(app).get('/api/cars');
        expect(res.statusCode).toBe(401);
    });

    it('should fetch car list with pagination and search', async () => {
        db.query
            .mockResolvedValueOnce([[{ car_id: 1, vin: '1HGCR2F83HA000001', manufacturer: 'Honda', model: 'Accord' }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/cars?search=Accord')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].model).toBe('Accord');
    });

    it('should reject car creation with invalid VIN length (must be 17 chars)', async () => {
        const res = await request(app)
            .post('/api/cars')
            .set('Authorization', `Bearer ${adminToken}`)
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
        const res = await request(app)
            .post('/api/cars')
            .set('Authorization', `Bearer ${adminToken}`)
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
        const res = await request(app)
            .post('/api/cars')
            .set('Authorization', `Bearer ${mechanicToken}`)
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
        db.query
            .mockResolvedValueOnce([[{ customer_id: 1 }]]) // Customer exists check
            .mockResolvedValueOnce([[]]) // VIN does not exist
            .mockResolvedValueOnce([{ insertId: 5 }]); // Insert car

        const res = await request(app)
            .post('/api/cars')
            .set('Authorization', `Bearer ${staffToken}`)
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
