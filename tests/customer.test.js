const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Customer API Tests', () => {
    let token;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: '1234' });
        token = res.body.token;
    });

    it('should fetch list of customers with valid JWT', async () => {
        const res = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a new customer', async () => {
        const res = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Customer',
                phone: '555-9999',
                email: 'test@example.com'
            });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.customerId).toBeDefined();
    });

    afterAll(async () => {
        await db.end();
    });
});
