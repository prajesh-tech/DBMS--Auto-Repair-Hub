const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { ALLOWED_ORIGINS, isProduction, TRUST_PROXY } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { ensureAndValidateCsrf } = require('./middleware/csrfMiddleware');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const carRoutes = require('./routes/carRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const partRoutes = require('./routes/partRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const { verifyToken, requireRole } = require('./middleware/authMiddleware');
const app = express();

if (TRUST_PROXY) {
    app.set('trust proxy', 1);
}

app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'"], styleSrcAttr: ["'none'"], fontSrc: ["'self'"],
        imgSrc: ["'self'"], connectSrc: ["'self'"], objectSrc: ["'none'"],
        baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"]
      }
    }
}));

const allowedOriginsList = ALLOWED_ORIGINS
    ? ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

const corsOptions = {
    origin: (origin, callback) => {
        // Same-origin / non-browser requests send no Origin header
        if (!origin) return callback(null, true);
        if (allowedOriginsList.includes(origin)) {
            return callback(null, true);
        }
        return callback(Object.assign(new Error('Origin not allowed'), { status: 403 }));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
};

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && origin === `${req.protocol}://${req.get('host')}`) return next();
  cors(corsOptions)(req, res, next);
});
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ensureAndValidateCsrf);

app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  setHeaders: (res, file) => {
    if (/\.(html|css|js)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  }
}));

const loginRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many login attempts. Please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false
});

const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many refresh attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registerRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many registration attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api', apiRateLimiter);
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth/refresh', refreshRateLimiter);
app.use('/api/auth/register', registerRateLimiter);
app.use('/api/auth/change-password', registerRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', verifyToken, requireRole(['admin', 'staff']), (req, res) => {
    res.json({ status: 'OK', message: 'Auto Repair Hub API Server Running', timestamp: new Date() });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`=================================`);
        console.log(`Auto Repair Hub Server Started`);
        console.log(`Listening on http://localhost:${PORT}`);
        console.log(`=================================`);
    });
}

module.exports = app;
