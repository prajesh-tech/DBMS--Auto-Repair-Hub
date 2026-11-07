const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Critical environment variables required in production mode
const REQUIRED_PROD_ENV = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

if (isProduction) {
    const missing = REQUIRED_PROD_ENV.filter(key => !process.env[key] || process.env[key].trim() === '');
    if (missing.length > 0) {
        const errorMsg = `FATAL CONFIGURATION ERROR: Missing required environment variable(s) in production mode: ${missing.join(', ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
}

// Development / Test safe fallbacks with security warnings
if (!process.env.JWT_SECRET && !isProduction) {
    console.warn('[SECURITY WARNING]: JWT_SECRET is not set in environment. Using fallback development secret.');
}

if (!process.env.JWT_REFRESH_SECRET && !isProduction) {
    console.warn('[SECURITY WARNING]: JWT_REFRESH_SECRET is not set in environment. Using fallback development secret.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_auto_repair_hub_2026_non_prod_only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_auto_repair_hub_2026_non_prod_only';

module.exports = {
    isProduction,
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    DB_HOST: process.env.DB_HOST || '127.0.0.1',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || 'root',
    DB_NAME: process.env.DB_NAME || 'auto_repair_hub',
    PORT: process.env.PORT || 3000,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || ''
};

