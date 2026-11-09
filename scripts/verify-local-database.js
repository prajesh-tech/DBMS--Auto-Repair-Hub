// Opt-in integration checks create and remove only a new, randomly named local test database.
const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const config = require('../src/config/env');

async function verify() {
  if (process.env.RUN_LOCAL_DB_TESTS !== '1' || !['localhost', '127.0.0.1', '::1'].includes(config.DB_HOST)) {
    throw new Error('Set RUN_LOCAL_DB_TESTS=1 and use a loopback DB_HOST for disposable database tests');
  }
  const database = `auto_repair_hub_test_${crypto.randomBytes(8).toString('hex')}`;
  const connection = await mysql.createConnection({ host: config.DB_HOST, user: config.DB_USER, password: config.DB_PASSWORD, multipleStatements: true });
  let pool;
  try {
    await connection.query(`CREATE DATABASE \`${database}\``);
    await connection.changeUser({ database });
    let schema = fs.readFileSync('database/schema.sql', 'utf8')
      .replace(/^CREATE DATABASE[^\n]*\n/m, '').replace(/^USE[^\n]*\n/m, '')
      .replace(/^    employee_id INT NULL UNIQUE,\n/m, '')
      .replace(/^    must_change_password BOOLEAN[^\n]*\n/m, '')
      .replace(/-- 1b\. Refresh tokens[\s\S]*?-- 2\. Customers Table/, '-- 2. Customers Table')
      .replace(/^ALTER TABLE User[^\n]*\n/m, '');
    schema = schema.slice(0, schema.indexOf('-- Seed Data:'));
    await connection.query(schema);
    // Minimal fixtures belong only to this disposable database; do not depend on demo seeds.
    await connection.query('INSERT INTO Customer (name, phone) VALUES (?, ?)', ['Migration Fixture', '555-0100']);
    await connection.query('INSERT INTO Employee (name, role) VALUES (?, ?), (?, ?)', ['Assigned Test Mechanic', 'Mechanic', 'Other Test Mechanic', 'Mechanic']);
    await connection.query('INSERT INTO Car (vin, manufacturer, model, year, customer_id) VALUES (?, ?, ?, ?, ?)', ['1HGCM82633A004352', 'Test', 'Fixture', 2020, 1]);
    await connection.query('INSERT INTO ServiceJob (car_id, employee_id, job_date, description, total_cost) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)', [1, 1, '2026-01-01', 'Assigned test work', '10.00', 1, 2, '2026-01-01', 'Other test work', '20.00']);
    await connection.query('INSERT INTO User (username, password_hash, role) VALUES (?, ?, ?)', ['legacy_test', 'not-a-login-hash', 'mechanic']);
    for (let attempt = 0; attempt < 2; attempt++) {
      execFileSync(process.execPath, ['database/migrate.js'], { env: { ...process.env, DB_NAME: database }, stdio: 'pipe' });
    }
    const [[legacy]] = await connection.query('SELECT must_change_password, employee_id FROM User WHERE username = ?', ['legacy_test']);
    assert.equal(legacy.must_change_password, 1);
    assert.equal(legacy.employee_id, null);
    const [[customers]] = await connection.query('SELECT COUNT(*) AS count FROM Customer');
    assert.equal(customers.count, 1);
    console.log('PASS: repeatable migration preserves customers and existing accounts');

    config.DB_NAME = database;
    process.env.NODE_ENV = 'test';
    const app = require('../src/server');
    pool = require('../src/config/database');
    const password = `${crypto.randomUUID()}Aa1!`;
    await connection.query('INSERT INTO User (username, password_hash, role, must_change_password) VALUES (?, ?, ?, FALSE)', ['rotation_test', await bcrypt.hash(password, 12), 'admin']);
    const bootstrap = await request(app).get('/login.html');
    const csrf = bootstrap.headers['set-cookie'].find(cookie => cookie.startsWith('csrf_token=')).split(';')[0];
    const csrfValue = csrf.slice('csrf_token='.length);
    const login = await request(app).post('/api/auth/login').set('Cookie', csrf).set('X-CSRF-Token', csrfValue).send({ username: 'rotation_test', password });
    assert.equal(login.status, 200);
    const refresh = login.headers['set-cookie'].find(cookie => cookie.startsWith('refresh_token=')).split(';')[0];
    const rotate = cookie => request(app).post('/api/auth/refresh').set('Cookie', `${csrf}; ${cookie}`).set('X-CSRF-Token', csrfValue);
    const results = await Promise.all([rotate(refresh), rotate(refresh)]);
    assert.deepEqual(results.map(res => res.status).sort(), [200, 403]);
    const replacement = results.find(res => res.status === 200).headers['set-cookie'].find(cookie => cookie.startsWith('refresh_token=')).split(';')[0];
    assert.equal((await rotate(replacement)).status, 403);
    const [[tokens]] = await connection.query('SELECT COUNT(*) AS count FROM RefreshToken WHERE revoked_at IS NULL');
    assert.equal(tokens.count, 0);
    console.log('PASS: concurrent refresh permits one rotation; replay revokes the replacement');
    const access = login.headers['set-cookie'].find(cookie => cookie.startsWith('access_token=')).split(';')[0];
    const changed = await request(app).post('/api/auth/change-password')
      .set('Cookie', `${csrf}; ${access}`).set('X-CSRF-Token', csrfValue)
      .send({ currentPassword: password, newPassword: `${crypto.randomUUID()}Bb2!` });
    assert.equal(changed.status, 200);
    const [[active]] = await connection.query('SELECT COUNT(*) AS count FROM RefreshToken WHERE revoked_at IS NULL');
    assert.equal(active.count, 1);
    console.log('PASS: password change atomically issues a replacement session');

    await connection.query('INSERT INTO User (username, password_hash, role, must_change_password, employee_id) VALUES (?, ?, ?, FALSE, ?)', ['mechanic_test', await bcrypt.hash(password, 12), 'mechanic', 1]);
    const mechanicLogin = await request(app).post('/api/auth/login').set('Cookie', csrf).set('X-CSRF-Token', csrfValue).send({ username: 'mechanic_test', password });
    assert.equal(mechanicLogin.status, 200);
    const mechanicAccess = mechanicLogin.headers['set-cookie'].find(cookie => cookie.startsWith('access_token=')).split(';')[0];
    const work = await request(app).get('/api/services').set('Cookie', `${csrf}; ${mechanicAccess}`);
    assert.equal(work.status, 200);
    assert.ok(work.body.data.length > 0);
    assert.ok(work.body.data.every(job => job.employee_id === 1 && !('total_cost' in job) && !('customer_phone' in job)));
    assert.equal((await request(app).get('/api/services/2').set('Cookie', mechanicAccess)).status, 404);
    const update = id => request(app).put(`/api/services/${id}`).set('Cookie', `${csrf}; ${mechanicAccess}`).set('X-CSRF-Token', csrfValue).send({ status: 'Completed' });
    assert.equal((await update(2)).status, 404);
    assert.equal((await update(1)).status, 200);
    console.log('PASS: real SQL scopes mechanic reads and updates to assigned jobs');

  } finally {
    if (pool) await pool.end();
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.end();
  }
}
verify().catch(err => { console.error('Local integration verification failed:', err.message); process.exitCode = 1; });
