const request = require('supertest');
jest.mock('../src/config/database', () => ({ query: jest.fn(), getConnection: jest.fn(), end: jest.fn() }));
const db = require('../src/config/database');
const app = require('../src/server');
const { authHeaders, mockVerifiedUser, USERS, clearUserCache, CSRF_TOKEN } = require('./helpers');
beforeEach(() => { jest.resetAllMocks(); clearUserCache(); });

it.each(['/api/customers', '/api/cars', '/api/parts', '/api/dashboard/stats', '/api/services/1/invoice'])(
  'denies mechanic access to %s', async url => {
    mockVerifiedUser(db, USERS.mechanic);
    expect((await request(app).get(url).set(authHeaders(USERS.mechanic))).status).toBe(403);
  }
);
it('denies unlinked mechanics', async () => {
  mockVerifiedUser(db, { ...USERS.mechanic, employee_id: null });
  expect((await request(app).get('/api/services').set(authHeaders(USERS.mechanic))).status).toBe(403);
});
it('scopes the list and strips financial/contact fields', async () => {
  mockVerifiedUser(db, USERS.mechanic);
  db.query.mockResolvedValueOnce([[{ job_id: 1, status: 'Pending', total_cost: 12, customer_email: 'private' }]])
    .mockResolvedValueOnce([[{ total: 1 }]]);
  const res = await request(app).get('/api/services').set(authHeaders(USERS.mechanic));
  expect(res.status).toBe(200);
  expect(res.body.data).toEqual([{ job_id: 1, status: 'Pending' }]);
  expect(db.query.mock.calls[1][0]).toMatch(/ServiceJob.employee_id = \?/);
  expect(db.query.mock.calls[1][1][0]).toBe(1);
});
it('returns 404 for another employee job', async () => {
  mockVerifiedUser(db, USERS.mechanic);
  db.query.mockResolvedValueOnce([[]]);
  expect((await request(app).get('/api/services/99').set(authHeaders(USERS.mechanic))).status).toBe(404);
  expect(db.query.mock.calls[1][1]).toEqual([99, 1]);
});
it('returns 404 for updates outside assignment', async () => {
  mockVerifiedUser(db, USERS.mechanic);
  db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
  const res = await request(app).put('/api/services/99').set(authHeaders(USERS.mechanic, { mutating: true })).send({ status: 'Completed' });
  expect(res.status).toBe(404);
  expect(db.query.mock.calls[1][1]).toEqual([null, 'Completed', 99, 1]);
});
it.each([{ job_date: '2026-11-01' }, { total_cost: 10 }, { employee_id: 2 }])('rejects mechanic management fields %j', async body => {
  mockVerifiedUser(db, USERS.mechanic);
  expect((await request(app).put('/api/services/1').set(authHeaders(USERS.mechanic, { mutating: true })).send(body)).status).toBe(403);
});
it('requires authentication for employee links', async () => {
  expect((await request(app).put('/api/auth/users/3/employee').set('Cookie', `csrf_token=${CSRF_TOKEN}`).set('X-CSRF-Token', CSRF_TOKEN).send({ employee_id: 1 })).status).toBe(401);
});
it('requires admin for employee links', async () => {
  mockVerifiedUser(db, USERS.staff);
  expect((await request(app).put('/api/auth/users/3/employee').set(authHeaders(USERS.staff, { mutating: true })).send({ employee_id: 1 })).status).toBe(403);
});
it.each([{}, { employee_id: -1 }, { employee_id: 'invalid' }])('validates employee link %j', async body => {
  mockVerifiedUser(db, USERS.admin);
  expect((await request(app).put('/api/auth/users/3/employee').set(authHeaders(USERS.admin, { mutating: true })).send(body)).status).toBe(400);
});
it('links an active employee', async () => {
  mockVerifiedUser(db, USERS.admin);
  db.query.mockResolvedValueOnce([[{ employee_id: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
  expect((await request(app).put('/api/auth/users/3/employee').set(authHeaders(USERS.admin, { mutating: true })).send({ employee_id: 1 })).status).toBe(200);
});
it('rejects missing employees', async () => {
  mockVerifiedUser(db, USERS.admin);
  db.query.mockResolvedValueOnce([[]]);
  expect((await request(app).put('/api/auth/users/3/employee').set(authHeaders(USERS.admin, { mutating: true })).send({ employee_id: 1 })).status).toBe(400);
});
it('rejects duplicate employee assignments', async () => {
  mockVerifiedUser(db, USERS.admin);
  db.query.mockResolvedValueOnce([[{ employee_id: 1 }]]).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ER_DUP_ENTRY' }));
  expect((await request(app).put('/api/auth/users/3/employee').set(authHeaders(USERS.admin, { mutating: true })).send({ employee_id: 1 })).status).toBe(409);
});

it('returns 404 for an employee link targeting a missing user', async () => {
  mockVerifiedUser(db, USERS.admin);
  db.query.mockResolvedValueOnce([[{ employee_id: 1 }]]).mockResolvedValueOnce([{ affectedRows: 0 }]);
  expect((await request(app).put('/api/auth/users/999/employee').set(authHeaders(USERS.admin, { mutating: true })).send({ employee_id: 1 })).status).toBe(404);
});
it('allows admins to unlink accounts', async () => {
  mockVerifiedUser(db, USERS.admin);
  db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
  expect((await request(app).put('/api/auth/users/3/employee').set(authHeaders(USERS.admin, { mutating: true })).send({ employee_id: null })).status).toBe(200);
});
