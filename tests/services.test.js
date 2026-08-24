const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Service Job & Inventory Deduction API Tests', () => {
    let token;
    let createdJobId;
    let createdPartId;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: '1234' });
        token = res.body.token;

        // Create a temporary part for testing stock deduction
        const [partResult] = await db.query(
            "INSERT INTO Part (part_name, part_number, unit_price, stock_quantity) VALUES ('Test Spark Plug', 'TEST-SPK-99', 15.00, 5)"
        );
        createdPartId = partResult.insertId;
    });

    afterAll(async () => {
        // Clean up test part and service job
        if (createdPartId) {
            await db.query('DELETE FROM Part WHERE part_id = ?', [createdPartId]);
        }
        if (createdJobId) {
            await db.query('DELETE FROM ServiceJob WHERE job_id = ?', [createdJobId]);
        }
        await db.end();
    });

    it('should create a new service job', async () => {
        const res = await request(app)
            .post('/api/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
                car_id: 1,
                job_date: '2026-08-01',
                description: 'Automated Test Service Job',
                status: 'Pending',
                total_cost: 100.00
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.jobId).toBeDefined();
        createdJobId = res.body.jobId;
    });

    it('should fetch service job by ID', async () => {
        const res = await request(app)
            .get(`/api/services/${createdJobId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.description).toBe('Automated Test Service Job');
    });

    it('should automatically deduct stock when assigning a part', async () => {
        const res = await request(app)
            .post(`/api/services/${createdJobId}/parts`)
            .set('Authorization', `Bearer ${token}`)
            .send({ part_id: createdPartId, quantity: 2 });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify stock decreased from 5 to 3
        const [[part]] = await db.query('SELECT stock_quantity FROM Part WHERE part_id = ?', [createdPartId]);
        expect(part.stock_quantity).toBe(3);
    });

    it('should reject assigning part if quantity exceeds available stock', async () => {
        const res = await request(app)
            .post(`/api/services/${createdJobId}/parts`)
            .set('Authorization', `Bearer ${token}`)
            .send({ part_id: createdPartId, quantity: 10 });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Insufficient stock');
    });

    it('should update service job status', async () => {
        const res = await request(app)
            .put(`/api/services/${createdJobId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'In Progress' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should restore inventory when deleting service job', async () => {
        const res = await request(app)
            .delete(`/api/services/${createdJobId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify stock restored from 3 back to 5
        const [[part]] = await db.query('SELECT stock_quantity FROM Part WHERE part_id = ?', [createdPartId]);
        expect(part.stock_quantity).toBe(5);
        createdJobId = null; // Marked deleted
    });
});
