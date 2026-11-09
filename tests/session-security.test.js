const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
jest.mock('../src/config/database', () => ({ query: jest.fn(), getConnection: jest.fn(), end: jest.fn() }));
const db = require('../src/config/database');
const app = require('../src/server');
const { JWT_REFRESH_SECRET } = require('../src/config/env');
const { USERS, authHeaders, mockVerifiedUser, CSRF_TOKEN } = require('./helpers');
let connection;
const csrf = { Cookie: `csrf_token=${CSRF_TOKEN}`, 'X-CSRF-Token': CSRF_TOKEN };
beforeEach(() => {
  jest.resetAllMocks();
  connection = { query: db.query, beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  db.getConnection.mockResolvedValue(connection);
});
function refreshCookie(id = 1) {
  return `refresh_token=${jwt.sign({ id, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: '1h' })}; csrf_token=${CSRF_TOKEN}`;
}
it('rejects refresh when the database user was deleted and rolls back', async () => {
  db.query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);
  const res = await request(app).post('/api/auth/refresh').set(csrf).set('Cookie', refreshCookie());
  expect(res.status).toBe(401);
  expect(connection.rollback).toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalled();
});
it('uses the current database role when rotating', async () => {
  db.query.mockResolvedValueOnce([[{ user_id: 1, username: 'changed', role: 'staff' }]])
    .mockResolvedValueOnce([[{ user_id: 1, expires_at: new Date(Date.now() + 10000), revoked_at: null }]])
    .mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{ affectedRows: 1 }]);
  const res = await request(app).post('/api/auth/refresh').set(csrf).set('Cookie', refreshCookie());
  expect(res.status).toBe(200);
  expect(res.body.user.role).toBe('staff');
  expect(res.body.token).toBeUndefined();
  expect(connection.commit).toHaveBeenCalled();
  expect(db.query.mock.calls[0][0]).toMatch(/FOR UPDATE/);
  expect(db.query.mock.calls[1][0]).toMatch(/FOR UPDATE/);
});
it('rejects server-expired refresh rows', async () => {
  db.query.mockResolvedValueOnce([[{ user_id: 1, role: 'admin' }]])
    .mockResolvedValueOnce([[{ user_id: 1, expires_at: new Date(0), revoked_at: null }]]);
  const res = await request(app).post('/api/auth/refresh').set(csrf).set('Cookie', refreshCookie());
  expect(res.status).toBe(403);
  expect(connection.commit).not.toHaveBeenCalled();
});
it('rolls back failed token persistence and clears cookies', async () => {
  db.query.mockResolvedValueOnce([[{ user_id: 1, role: 'admin' }]])
    .mockResolvedValueOnce([[{ user_id: 1, expires_at: new Date(Date.now() + 10000), revoked_at: null }]])
    .mockResolvedValueOnce([{ affectedRows: 1 }]).mockRejectedValueOnce(new Error('private database detail'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await request(app).post('/api/auth/refresh').set(csrf).set('Cookie', refreshCookie());
  expect(res.status).toBe(500);
  expect(res.body.message).toBe('Internal Server Error');
  expect(connection.rollback).toHaveBeenCalled();
  expect(res.headers['set-cookie'].join(';')).toContain('Expires=Thu, 01 Jan 1970');
  log.mockRestore();
});
it.each(['/api/auth/login', '/api/auth/refresh', '/api/auth/register', '/api/auth/change-password', '/api/auth/logout'])(
  'rejects mismatched CSRF on %s', async url => {
    const res = await request(app).post(url).set(csrf).set('X-CSRF-Token', 'mismatched').send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CSRF/);
    expect(db.query).not.toHaveBeenCalled();
  }
);
it.each([{ password: 'A'.repeat(73) }, { password: 'é'.repeat(37) }, { password: {} }])('validates login password types and bytes %j', async body => {
  const res = await request(app).post('/api/auth/login').set(csrf).send({ username: 'person', ...body });
  expect(res.status).toBe(400);
});
it.each(['currentPassword', 'newPassword'])('rejects oversized %s', async field => {
  mockVerifiedUser(db, USERS.admin);
  const res = await request(app).post('/api/auth/change-password').set(authHeaders(USERS.admin, { mutating: true }))
    .send({ currentPassword: 'CurrentPass123!', newPassword: 'NextPass123!', [field]: 'é'.repeat(37) });
  expect(res.status).toBe(400);
});
it.each(['/api/services?limit=1000', '/api/services?status=Cancelled', '/api/services?search[x]=1', '/api/cars?sort=arbitrary', '/api/dashboard/stats?timeframe=arbitrary'])(
  'validates query parameters on %s', async url => {
    mockVerifiedUser(db, USERS.admin);
    expect((await request(app).get(url).set(authHeaders(USERS.admin))).status).toBe(400);
  }
);
it.each(['/addCustomer', '/getCustomers', '/getEmployees', '/getCars', '/getServices'])(
  'removes the legacy redirect %s', async url => {
    const res = await request(app).get(url);
    expect(res.status).toBe(404);
    expect(res.headers.location).toBeUndefined();
  }
);
it('allows same-origin Origin headers without an allowlist entry', async () => {
  const res = await request(app).get('/login.html').set('Host', 'localhost:4321').set('Origin', 'http://localhost:4321');
  expect(res.status).toBe(200);
});
it('rejects unlisted cross-origin origins', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await request(app).get('/login.html').set('Origin', 'https://unlisted.example');
  expect(res.status).toBe(403);
  log.mockRestore();
});
it('requires authentication and roles for health checks', async () => {
  expect((await request(app).get('/api/health')).status).toBe(401);
  mockVerifiedUser(db, USERS.mechanic);
  expect((await request(app).get('/api/health').set(authHeaders(USERS.mechanic))).status).toBe(403);
  mockVerifiedUser(db, USERS.admin);
  expect((await request(app).get('/api/health').set(authHeaders(USERS.admin))).status).toBe(200);
});
it('allows safe staff technician choices without salary data', async () => {
  mockVerifiedUser(db, USERS.staff);
  db.query.mockResolvedValueOnce([[{ employee_id: 1, name: 'Technician', role: 'Mechanic' }]]);
  const res = await request(app).get('/api/services/technicians').set(authHeaders(USERS.staff));
  expect(res.status).toBe(200);
  expect(db.query.mock.calls[1][0]).not.toMatch(/salary/);
  expect((await request(app).get('/api/services/technicians')).status).toBe(401);
  mockVerifiedUser(db, USERS.mechanic);
  expect((await request(app).get('/api/services/technicians').set(authHeaders(USERS.mechanic))).status).toBe(403);
});
it('backs off repeatedly failing usernames independent of casing', () => {
  const lockout = require('../src/middleware/loginLockout');
  for (let attempt = 0; attempt < lockout.MAX_FAILURES; attempt++) lockout.recordFailure('Lockout_Test');
  expect(lockout.isLocked('lockout_test').locked).toBe(true);
  lockout.clearFailures('LOCKOUT_TEST');
  expect(lockout.isLocked('Lockout_Test').locked).toBe(false);
});
