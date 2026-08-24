const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const carRoutes = require('./routes/carRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const partRoutes = require('./routes/partRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Security HTTP Headers Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow static scripts and CSS
}));

// Global Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Rate Limiter for Login Endpoint (Max 5 attempts per minute per IP)
const loginRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { success: false, message: 'Too many login attempts. Please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false
});

// API Routes
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Auto Repair Hub API Server Running ✅', timestamp: new Date() });
});

// Fallback legacy route handlers for backward compatibility
app.use('/addCustomer', (req, res) => res.redirect(307, '/api/customers'));
app.use('/getCustomers', (req, res) => res.redirect(307, '/api/customers'));
app.use('/getEmployees', (req, res) => res.redirect(307, '/api/employees'));
app.use('/getCars', (req, res) => res.redirect(307, '/api/cars'));
app.use('/getServices', (req, res) => res.redirect(307, '/api/services'));

// 404 & Global Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`=================================`);
        console.log(`Auto Repair Hub Server Started 🚀`);
        console.log(`Listening on http://localhost:${PORT}`);
        console.log(`=================================`);
    });
}

module.exports = app;
