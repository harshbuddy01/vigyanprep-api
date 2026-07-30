/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for state-changing operations
 * 
 * Used alongside sameSite: 'none' cookies to prevent CSRF attacks
 * when cookies are sent cross-origin (vigyanprep.com → railway.app)
 */

import crypto from 'crypto';

/**
 * Generate a random CSRF token
 * @returns {string} 32-byte hex string
 */
export const generateCSRFToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to generate and send CSRF token
 * Call this on GET requests to provide token to frontend
 */
export const provideCSRFToken = (req, res, next) => {
    const csrfToken = generateCSRFToken();

    // 🔐 SECURITY TRADE-OFF: SameSite=None used to support cross-origin state-changing requests.
    // Robustness depends on x-csrf-token header enforcement.
    res.cookie('csrf_token', csrfToken, {
        httpOnly: false,  // ✅ Frontend needs to read this
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    next();
};

/**
 * Middleware to validate CSRF token
 * Use this on all POST/PUT/DELETE routes that modify data
 */
export const validateCSRFToken = (req, res, next) => {
    // Skip CSRF for login endpoint (no token exists yet)
    if (req.path === '/api/admin/auth/login') {
        return next();
    }

    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies['csrf_token'];

    if (!headerToken || !cookieToken) {
        console.error('❌ CSRF: Missing token');
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
            code: 'CSRF_MISSING'
        });
    }

    if (headerToken !== cookieToken) {
        console.error('❌ CSRF: Token mismatch');
        return res.status(403).json({
            success: false,
            message: 'CSRF validation failed',
            code: 'CSRF_INVALID'
        });
    }

    // ✅ Token valid
    next();
};
