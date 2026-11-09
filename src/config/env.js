const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    if (isProduction) {
        required.push('DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME');
    }
    const missing = required.filter((key) => !process.env[key] || String(process.env[key]).trim() === '');
    if (missing.length > 0) {
        const errorMsg = `FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missing.join(', ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
}

const JWT_SECRET = isTest
    ? (process.env.JWT_SECRET || 'test_jwt_secret_auto_repair_hub_do_not_use_elsewhere')
    : process.env.JWT_SECRET;

const JWT_REFRESH_SECRET = isTest
    ? (process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_auto_repair_hub_do_not_use_elsewhere')
    : process.env.JWT_REFRESH_SECRET;

function parseBool(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    return String(value).toLowerCase() === 'true' || value === '1';
}

const COOKIE_SECURE = parseBool(process.env.COOKIE_SECURE, isProduction);
const TRUST_PROXY = parseBool(process.env.TRUST_PROXY, false);

let DB_USER;
let DB_PASSWORD;
if (isTest) {
    DB_USER = process.env.DB_USER || 'test';
    DB_PASSWORD = process.env.DB_PASSWORD || 'test';
} else {
    DB_USER = process.env.DB_USER;
    DB_PASSWORD = process.env.DB_PASSWORD;
    if (!DB_USER || DB_PASSWORD === undefined) {
        throw new Error('FATAL CONFIGURATION ERROR: DB_USER and DB_PASSWORD must be set (no root/root defaults outside test)');
    }
}

module.exports = {
    isProduction,
    isTest,
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    DB_HOST: process.env.DB_HOST || '127.0.0.1',
    DB_USER,
    DB_PASSWORD,
    DB_NAME: process.env.DB_NAME || 'auto_repair_hub',
    PORT: process.env.PORT || 3000,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
    COOKIE_SECURE,
    TRUST_PROXY,
    BCRYPT_ROUNDS: 12,
    ALLOWED_ROLES: ['admin', 'staff', 'mechanic']
};
