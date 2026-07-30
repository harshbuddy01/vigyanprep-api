// backend/middlewares/errorHandler.js
// 🔒 GLOBAL ERROR HANDLER
// Centralized error handling to prevent information leakage

/**
 * Global Error Handler Middleware
 * Catches all errors and returns safe, formatted responses
 */
export function errorHandler(err, req, res, next) {
    console.error('❌ Error caught by global handler:', {
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Determine error status code
    const statusCode = err.statusCode || err.status || 500;

    // Determine error message
    // In production, don't expose internal error details
    const message = process.env.NODE_ENV === 'production'
        ? getProductionMessage(statusCode, err)
        : err.message || 'Internal server error';

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            message: message,
            code: err.code || `HTTP_${statusCode}`,
            ...(process.env.NODE_ENV !== 'production' && {
                stack: err.stack,
                details: err.details
            })
        }
    });
}

/**
 * Get safe production error message
 * Prevents leaking sensitive information in error messages
 */
function getProductionMessage(statusCode, err) {
    // Map status codes to safe messages
    const messageMap = {
        400: 'Invalid request. Please check your input.',
        401: 'Authentication required. Please log in.',
        403: 'Access denied. Insufficient permissions.',
        404: 'The requested resource was not found.',
        409: 'Request conflicts with current state.',
        422: 'Unable to process the provided data.',
        429: 'Too many requests. Please try again later.',
        500: 'An error occurred. Please try again later.',
        502: 'Service temporarily unavailable.',
        503: 'Service temporarily unavailable.'
    };

    return messageMap[statusCode] || 'An error occurred. Please contact support if this persists.';
}

/**
 * 404 Not Found Handler
 * Must be placed AFTER all routes
 */
export function notFoundHandler(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.path}`);
    error.statusCode = 404;
    error.code = 'ROUTE_NOT_FOUND';
    next(error);
}

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch promise rejections
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch(next);
    };
}

export default {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
