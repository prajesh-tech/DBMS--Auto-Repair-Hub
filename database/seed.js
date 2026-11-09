const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, BCRYPT_ROUNDS } = require('../src/config/env');

async function seedDatabase() {
    const seedPassword = process.env.SEED_PASSWORD;
    if (!seedPassword || String(seedPassword).trim() === '') {
        console.error('FATAL: SEED_PASSWORD environment variable is required to seed users.');
        console.error('Set SEED_PASSWORD in .env (never commit the real value), then re-run npm run seed.');
        process.exit(1);
    }

    if (Buffer.byteLength(seedPassword, 'utf8') > 72 || seedPassword.length < 8 || !/[A-Z]/.test(seedPassword) || !/[a-z]/.test(seedPassword) || !/[0-9]/.test(seedPassword) || !/[^a-zA-Z0-9\s]/.test(seedPassword)) throw new Error('SEED_PASSWORD must meet password requirements');
    console.log('Connecting to database server...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            multipleStatements: true
        });

        console.log('Reading database/schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log(`Executing schema & seed script on database: ${DB_NAME}...`);
        await connection.query(sql);

        const passwordHash = await bcrypt.hash(seedPassword, BCRYPT_ROUNDS);
        const users = [
            ['admin', 'admin'],
            ['staff', 'staff'],
            ['mechanic', 'mechanic']
        ];

        for (const [username, role] of users) {
            await connection.query(
                'INSERT INTO User (username, password_hash, role, must_change_password) VALUES (?, ?, ?, TRUE)',
                [username, passwordHash, role]
            );
        }

        await connection.query("UPDATE User SET employee_id = (SELECT employee_id FROM Employee WHERE name = ? LIMIT 1) WHERE username = ?", ['Alex Rivera', 'mechanic']);
        console.log('Database schema and seed data loaded successfully.');
        console.log('Seeded users: admin, staff, mechanic (must change password on first login).');
        console.log('Password was taken from SEED_PASSWORD and is not printed.');
    } catch (err) {
        console.error('Database migration failed:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('Make sure MariaDB/MySQL is running: sudo service mariadb start');
        }
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

seedDatabase();
