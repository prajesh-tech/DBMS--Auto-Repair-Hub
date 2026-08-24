const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables if dotenv is available
try {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {
    // Fallback if dotenv not loaded
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'auto_repair_hub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
