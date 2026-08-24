const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Vehicle (Car) API Tests', () => {
    let token;
    let createdCarId;
    const testVin = 'TEST1234567890123';

    beforeAll(async () => {
        await db.query('DELETE FROM Car WHERE vin = ?', [testVin]);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: '1234' });
        token = res.body.token;
    });

    afterAll(async () => {
        if (createdCarId) {
            await db.query('DELETE FROM Car WHERE car_id = ?', [createdCarId]);
        }
        await db.end();
    });

    it('should create a new car linked to customer #1', async () => {
        const res = await request(app)
            .post('/api/cars')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vin: testVin,
                manufacturer: 'Tesla',
                model: 'Model S Plaid',
                year: 2024,
                color: 'Red',
                customer_id: 1
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.carId).toBeDefined();
        createdCarId = res.body.carId;
    });

    it('should fetch car list with pagination and search', async () => {
        const res = await request(app)
            .get('/api/cars?search=Plaid')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].model).toContain('Plaid');
    });

    it('should update car details', async () => {
        const res = await request(app)
            .put(`/api/cars/${createdCarId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ color: 'Matte Black' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should delete car record', async () => {
        const res = await request(app)
            .delete(`/api/cars/${createdCarId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        createdCarId = null;
    });
});
