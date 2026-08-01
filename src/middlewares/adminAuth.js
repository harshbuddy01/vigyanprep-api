// backend/middlewares/adminAuth.js
// 🔒 MULTI-TENANT ADMIN AUTHENTICATION MIDDLEWARE

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'vigyanprep_secret_key_2026';
const JWT_EXPIRES_IN = '24h';

/**
 * Verify Admin JWT Token (Platform & Partner Admins)
 */
export async function verifyAdminAuth(req, res, next) {
  try {
    const token = req.cookies?.admin_token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.body?.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required. Please log in.',
        code: 'NO_ADMIN_TOKEN'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: jwtErr.name === 'TokenExpiredError' ? 'Admin session expired' : 'Invalid admin token',
        code: jwtErr.name === 'TokenExpiredError' ? 'ADMIN_TOKEN_EXPIRED' : 'INVALID_ADMIN_TOKEN'
      });
    }

    const adminRoles = ['super_admin', 'platform_admin', 'content_manager', 'evaluator', 'partner_admin', 'partner_staff', 'admin'];
    if (!adminRoles.includes(decoded.role) && decoded.type !== 'admin_access') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: admin privileges required',
        code: 'NOT_ADMIN'
      });
    }

    req.admin = {
      username: decoded.username || decoded.email,
      role: decoded.role || 'admin',
      org_id: decoded.org_id || '00000000-0000-0000-0000-000000000001',
      tokenIssued: decoded.iat
    };

    req.user = req.admin; // alias for controllers using req.user

    next();
  } catch (error) {
    console.error('❌ Admin auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Admin authentication error',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
}

/**
 * Generate Admin JWT Token
 */
export function generateAdminToken(userObj) {
  try {
    const payload = typeof userObj === 'string'
      ? { username: userObj, role: 'super_admin', type: 'admin_access', org_id: '00000000-0000-0000-0000-000000000001' }
      : {
          username: userObj.username || userObj.email,
          role: userObj.role || 'platform_admin',
          org_id: userObj.org_id || '00000000-0000-0000-0000-000000000001',
          type: 'admin_access'
        };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'vigyanprep-admin'
    });
  } catch (error) {
    console.error('❌ Error generating admin token:', error.message);
    throw new Error('Failed to generate admin token');
  }
}

export default {
  verifyAdminAuth,
  generateAdminToken
};
