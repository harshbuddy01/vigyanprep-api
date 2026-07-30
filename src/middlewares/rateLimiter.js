// backend/middlewares/rateLimiter.js
// 🔒 RATE LIMITING MIDDLEWARE
// Prevents brute force attacks and API abuse

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Applies to all /api/* routes
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for admin routes
 * Protects sensitive admin endpoints
 */
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per windowMs for admin routes
    message: {
        success: false,
        message: 'Too many admin requests, please try again later.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for successful authenticated requests
        // Only rate limit failed auth attempts
        return req.admin !== undefined;
    }
});

/**
 * Very strict rate limiter for login attempts
 * Prevents brute force password attacks
 */
export const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // Limit each IP to 5 login attempts per minute
    message: {
        success: false,
        message: 'Too many login attempts, please try again in a minute.',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

/**
 * Payment endpoint rate limiter
 * Protects payment processing from abuse
 */
export const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 payment requests per hour
    message: {
        success: false,
        message: 'Too many payment requests, please try again later.',
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default {
    apiLimiter,
    adminLimiter,
    loginLimiter,
    paymentLimiter
};
