const errorMiddleware = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const extra = err.extra || {};

    return res.status(status).json({
        status,
        message,
        ...extra
    });
}

module.exports = errorMiddleware;