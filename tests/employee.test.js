const request = require('supertest');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');
const app = require('../src/server');
const { authHeaders, mockVerifiedUser, clearUserCache, USERS } = require('./helpers');

describe('Employee API & Admin Isolation Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearUserCache();
    });

    afterAll(async () => {
        if (db.end) await db.end();
    });

    it('should reject unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/employees');
        expect(res.statusCode).toBe(401);
    });

    it('should forbid staff and mechanic from accessing employee directory (Admin Only - RBAC 403)', async () => {
        mockVerifiedUser(db, USERS.staff);
        const resStaff = await request(app)
            .get('/api/employees')
            .set(authHeaders(USERS.staff));
        expect(resStaff.statusCode).toBe(403);

        clearUserCache();
        mockVerifiedUser(db, USERS.mechanic);
        const resMech = await request(app)
            .get('/api/employees')
            .set(authHeaders(USERS.mechanic));
        expect(resMech.statusCode).toBe(403);
    });

    it('should allow admin to view employee directory', async () => {
        mockVerifiedUser(db, USERS.admin);
        db.query
            .mockResolvedValueOnce([[{ employee_id: 1, name: 'Alice Smith', role: 'Master Technician', phone: '555-0200', salary: 75000 }]])
            .mockResolvedValueOnce([[{ total: 1 }]]);

        const res = await request(app)
            .get('/api/employees')
            .set(authHeaders(USERS.admin));

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].name).toBe('Alice Smith');
    });

    it('should reject employee creation with negative salary (validation error 400)', async () => {
        mockVerifiedUser(db, USERS.admin);

        const res = await request(app)
            .post('/api/employees')
            .set(authHeaders(USERS.admin, { mutating: true }))
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
        mockVerifiedUser(db, USERS.admin);
        db.query.mockResolvedValueOnce([{ insertId: 4 }]);

        const res = await request(app)
            .post('/api/employees')
            .set(authHeaders(USERS.admin, { mutating: true }))
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
