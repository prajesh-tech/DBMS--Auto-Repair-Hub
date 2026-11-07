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

describe('Services API & Work Order RBAC Tests', () => {
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
        const res = await request(app).get('/api/services');
        expect(res.statusCode).toBe(401);
    });

    it('should fetch service list for authenticated mechanic or staff', async () => {
        db.query
            .mockResolvedValueOnce([[{ job_id: 1, description: 'Brake Inspection', status: 'In Progress', total_cost: 150.00 }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/services')
            .set('Authorization', `Bearer ${mechanicToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].description).toBe('Brake Inspection');
    });

    it('should reject service job creation with negative total_cost', async () => {
        const res = await request(app)
            .post('/api/services')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                car_id: 1,
                job_date: '2026-11-01',
                description: 'Oil Flush',
                total_cost: -50.00,
                status: 'Pending'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should allow admin/staff to create a service job', async () => {
        db.query
            .mockResolvedValueOnce([[{ car_id: 1 }]]) // Car exists
            .mockResolvedValueOnce([{ insertId: 12 }]); // Insert job

        const res = await request(app)
            .post('/api/services')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                car_id: 1,
                job_date: '2026-11-05',
                description: 'Full Synthetic Oil Change',
                total_cost: 89.99,
                status: 'In Progress'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.jobId).toBe(12);
    });

    it('should forbid mechanic from deleting a service job (RBAC 403)', async () => {
        const res = await request(app)
            .delete('/api/services/12')
            .set('Authorization', `Bearer ${mechanicToken}`);

        expect(res.statusCode).toBe(403);
    });

    it('should allow mechanic to update job status and notes', async () => {
        db.query
            .mockResolvedValueOnce([[{ job_id: 12, status: 'In Progress' }]]) // Job exists
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update query

        const res = await request(app)
            .put('/api/services/12')
            .set('Authorization', `Bearer ${mechanicToken}`)
            .send({
                status: 'Completed',
                description: 'Work completed and road tested.'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
