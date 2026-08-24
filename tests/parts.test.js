const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Inventory Parts API Tests', () => {
    let token;
    let createdPartId;
    const testPartNumber = 'TEST-PRT-888';

    beforeAll(async () => {
        await db.query('DELETE FROM Part WHERE part_number = ?', [testPartNumber]);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: '1234' });
        token = res.body.token;
    });

    afterAll(async () => {
        if (createdPartId) {
            await db.query('DELETE FROM Part WHERE part_id = ?', [createdPartId]);
        }
        await db.end();
    });

    it('should create a new inventory part', async () => {
        const res = await request(app)
            .post('/api/parts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                part_name: 'High Performance Air Filter',
                part_number: testPartNumber,
                unit_price: 34.99,
                stock_quantity: 20,
                min_stock_alert: 5
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.partId).toBeDefined();
        createdPartId = res.body.partId;
    });

    it('should fetch parts list with search filter', async () => {
        const res = await request(app)
            .get('/api/parts?search=Filter')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should update inventory stock quantity', async () => {
        const res = await request(app)
            .put(`/api/parts/${createdPartId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ stock_quantity: 15 });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const [[part]] = await db.query('SELECT stock_quantity FROM Part WHERE part_id = ?', [createdPartId]);
        expect(part.stock_quantity).toBe(15);
    });

    it('should delete part record', async () => {
        const res = await request(app)
            .delete(`/api/parts/${createdPartId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        createdPartId = null;
    });
});
