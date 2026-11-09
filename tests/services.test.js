const request = require('supertest');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');
const app = require('../src/server');
const { authHeaders, mockVerifiedUser, clearUserCache, USERS } = require('./helpers');

describe('Services API & Work Order RBAC Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearUserCache();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    it('should reject unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/services');
        expect(res.statusCode).toBe(401);
    });

    it('should fetch service list for authenticated mechanic or staff', async () => {
        mockVerifiedUser(db, USERS.mechanic);
        db.query
            .mockResolvedValueOnce([[{ job_id: 1, description: 'Brake Inspection', status: 'In Progress', total_cost: 150.00 }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/services')
            .set(authHeaders(USERS.mechanic));

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].description).toBe('Brake Inspection');
    });

    it('should reject service job creation with negative total_cost', async () => {
        mockVerifiedUser(db, USERS.admin);

        const res = await request(app)
            .post('/api/services')
            .set(authHeaders(USERS.admin, { mutating: true }))
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
        mockVerifiedUser(db, USERS.staff);
        db.query
            .mockResolvedValueOnce([[{ car_id: 1 }]])
            .mockResolvedValueOnce([{ insertId: 12 }]);

        const res = await request(app)
            .post('/api/services')
            .set(authHeaders(USERS.staff, { mutating: true }))
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
        mockVerifiedUser(db, USERS.mechanic);

        const res = await request(app)
            .delete('/api/services/12')
            .set(authHeaders(USERS.mechanic, { mutating: true }));

        expect(res.statusCode).toBe(403);
    });

    it('should allow mechanic to update job status and notes', async () => {
        mockVerifiedUser(db, USERS.mechanic);
        db.query
            .mockResolvedValueOnce([[{ job_id: 12, status: 'In Progress' }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .put('/api/services/12')
            .set(authHeaders(USERS.mechanic, { mutating: true }))
            .send({
                status: 'Completed',
                description: 'Work completed and road tested.'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
