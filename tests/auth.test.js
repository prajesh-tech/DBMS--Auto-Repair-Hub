const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Authentication API Tests', () => {
    it('should reject login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'wrongpassword' });
        
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should login successfully with default credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: '1234' });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
    });

    it('should reject access to protected endpoint without token', async () => {
        const res = await request(app).get('/api/customers');
        expect(res.statusCode).toBe(401);
    });

    afterAll(async () => {
        await db.end();
    });
});
