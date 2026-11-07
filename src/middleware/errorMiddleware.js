const path = require('path');

const errorHandler = (err, req, res, next) => {
    console.error('[SERVER ERROR]:', err.stack || err.message || err);

    // Prevent SQL internal schema disclosure
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

const notFound = (req, res, next) => {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
        return res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
    }
    res.status(404).json({
        success: false,
        message: `Endpoint Not Found - [${req.method}] ${req.originalUrl}`
    });
};

module.exports = {
    errorHandler,
    notFound
};
