const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = require('../src/config/env');

async function seedDatabase() {
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

        console.log('✅ Database schema and seed data loaded successfully!');
        console.log('========================================================');
        console.log('Default Seeded User Credentials:');
        console.log('  👑 Admin:    username: admin    | password: Admin@123');
        console.log('  💼 Staff:    username: staff    | password: Admin@123');
        console.log('  👨‍🔧 Mechanic: username: mechanic | password: Admin@123');
        console.log('========================================================');
    } catch (err) {
        console.error('❌ Database migration failed:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('👉 Make sure MariaDB/MySQL is running: sudo service mariadb start');
        }
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

seedDatabase();

