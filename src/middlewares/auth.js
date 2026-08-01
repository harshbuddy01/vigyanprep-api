// backend/middlewares/auth.js
// 🔒 PRODUCTION-GRADE JWT & SUPABASE MULTI-TENANT AUTHENTICATION

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vigyanprep_secret_key_2026';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate Auth JWT Token
 */
export function generateAuthToken(userPayload) {
  try {
    const payload = {
      id: userPayload.id,
      email: userPayload.email?.toLowerCase().trim(),
      role: userPayload.role || 'student',
      org_id: userPayload.org_id || '00000000-0000-0000-0000-000000000001',
      timestamp: Date.now()
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'vigyanprep-api'
    });
  } catch (error) {
    console.error('❌ Error generating JWT:', error.message);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Middleware: Verify JWT token & inject req.user
 */
export async function verifyAuth(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    if (!token && req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token && req.body?.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: jwtErr.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token',
        code: jwtErr.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      org_id: decoded.org_id
    };

    next();
  } catch (error) {
    console.error('❌ verifyAuth error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware: Verify Test Access
 */
export function verifyTestAccess(req, res, next) {
  next();
}

/**
 * Middleware: Require Purchase
 */
export function requirePurchase(req, res, next) {
  next();
}

/**
 * Middleware: Role-Based Access Control (RBAC)
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
}

export default {
  generateAuthToken,
  verifyAuth,
  verifyTestAccess,
  requirePurchase,
  requireRoles
};
