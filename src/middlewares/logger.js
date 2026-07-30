// backend/middlewares/logger.js
// 🔒 LOGGING MIDDLEWARE
// Centralized request logging for audit trails

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log file paths
const LOG_DIR = path.join(__dirname, '../../logs');
const ACCESS_LOG = path.join(LOG_DIR, 'access.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const ADMIN_LOG = path.join(LOG_DIR, 'admin.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log entry
 */
function formatLog(type, data) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${type}] ${JSON.stringify(data)}\n`;
}

/**
 * Write to log file
 */
function writeLog(file, entry) {
    try {
        fs.appendFileSync(file, entry);
    } catch (error) {
        console.error('❌ Failed to write log:', error.message);
    }
}

/**
 * Request Logger Middleware
 * Logs all HTTP requests
 */
export function requestLogger(req, res, next) {
    const startTime = Date.now();

    // Log request
    const requestLog = {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
    };

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const responseLog = {
            ...requestLog,
            status: res.statusCode,
            duration: `${duration}ms`
        };

        writeLog(ACCESS_LOG, formatLog('ACCESS', responseLog));

        // Log errors separately
        if (res.statusCode >= 400) {
            writeLog(ERROR_LOG, formatLog('ERROR', responseLog));
        }
    });

    next();
}

/**
 * Admin Action Logger
 * Logs all admin actions for audit trail
 */
export function adminLogger(req, res, next) {
    // Only log admin routes
    if (!req.path.startsWith('/api/admin')) {
        return next();
    }

    const adminLog = {
        admin: req.admin?.username || 'unauthenticated',
        action: `${req.method} ${req.path}`,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        body: sanitizeBody(req.body)
    };

    writeLog(ADMIN_LOG, formatLog('ADMIN', adminLog));
    next();
}

/**
 * Sanitize request body for logging
 * Remove sensitive data
 */
function sanitizeBody(body) {
    if (!body) return {};

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'razorpay_signature'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
}

/**
 * Security Event Logger
 * Logs security-related events
 */
export function logSecurityEvent(event, details) {
    const securityLog = {
        event,
        ...details,
        timestamp: new Date().toISOString()
    };

    writeLog(ERROR_LOG, formatLog('SECURITY', securityLog));
}

export default {
    requestLogger,
    adminLogger,
    logSecurityEvent
};
