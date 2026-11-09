const path = require('path');

const errorHandler = (err, req, res, next) => {
    const statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : (res.statusCode >= 400 ? res.statusCode : 500);

    console.error('[SERVER ERROR]:', err.stack || err.message || err);

    if (statusCode >= 500) {
        return res.status(statusCode).json({
            success: false,
            message: 'Internal Server Error'
        });
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Request failed'
    });
};

const notFound = (req, res, next) => {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
        return res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
    }
    res.status(404).json({
        success: false,
        message: `Endpoint Not Found - [${req.method}] ${req.path}`
    });
};

module.exports = {
    errorHandler,
    notFound
};
