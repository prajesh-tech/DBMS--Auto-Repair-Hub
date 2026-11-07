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

describe('Employee API & Admin Isolation Tests', () => {
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
        const res = await request(app).get('/api/employees');
        expect(res.statusCode).toBe(401);
    });

    it('should forbid staff and mechanic from accessing employee directory (Admin Only - RBAC 403)', async () => {
        const resStaff = await request(app)
            .get('/api/employees')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(resStaff.statusCode).toBe(403);

        const resMech = await request(app)
            .get('/api/employees')
            .set('Authorization', `Bearer ${mechanicToken}`);
        expect(resMech.statusCode).toBe(403);
    });

    it('should allow admin to view employee directory', async () => {
        db.query
            .mockResolvedValueOnce([[{ employee_id: 1, name: 'Alice Smith', role: 'Master Technician', phone: '555-0200', salary: 75000 }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/employees')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].name).toBe('Alice Smith');
    });

    it('should reject employee creation with negative salary (validation error 400)', async () => {
        const res = await request(app)
            .post('/api/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Bob Jones',
                role: 'Junior Mechanic',
                phone: '555-0205',
                salary: -5000
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should allow admin to create an employee with valid data', async () => {
        db.query.mockResolvedValueOnce([{ insertId: 4 }]);

        const res = await request(app)
            .post('/api/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Charlie Brown',
                role: 'Diagnostics Specialist',
                phone: '555-0299',
                salary: 62000
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.employeeId).toBe(4);
    });
});

