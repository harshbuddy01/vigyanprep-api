// backend/middlewares/auth.js
// 🔒 COMPLETE JWT AUTHENTICATION & AUTHORIZATION MIDDLEWARE

import jwt from 'jsonwebtoken';
import Student from '../models/Student.js'; // ✅ FIX: Import Student model
import { StudentPayment } from '../models/StudentPayment.js';
import { PurchasedTest } from '../models/PurchasedTest.js';

// 🔐 JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

/**
 * Generate JWT token after successful payment/login
 * @param {string} email - User email
 * @param {string} rollNumber - User roll number
 * @param {string[]} purchasedTests - Array of test IDs user has purchased
 * @returns {string} JWT token
 */
export function generateAuthToken(email, rollNumber, purchasedTests) {
  try {
    const payload = {
      email: email.toLowerCase().trim(),
      rollNumber: rollNumber,
      purchasedTests: purchasedTests || [],
      timestamp: Date.now(),
      type: 'student_access'
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'vigyan-prep-backend'
    });

    console.log(`✅ Generated JWT for ${email}`);
    return token;

  } catch (error) {
    console.error('❌ Error generating JWT:', error.message);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Middleware: Verify JWT token from request
 * Attaches decoded user data to req.user
 */
export async function verifyAuth(req, res, next) {
  try {
    // Extract token from multiple sources
    let token = null;

    // 1. Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    // 2. Check cookies (HTTP-only cookie)
    if (!token && req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    // 3. Check body (for backward compatibility)
    if (!token && req.body?.token) {
      token = req.body.token;
    }

    if (!token) {
      console.warn('⚠️ Authentication failed: No token provided');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        console.warn('⚠️ Token expired for user');
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }

      console.warn('⚠️ Invalid token:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        code: 'INVALID_TOKEN'
      });
    }

    // Verify student still exists in database
    // 🔒 FIX: Check both Student (primary) and StudentPayment (for some legacy users)
    console.log(`🔍 verifyAuth: Looking up student with email: ${decoded.email}`);
    let student = await Student.findOne({ email: decoded.email });
    
    if (!student) {
      console.log(`ℹ️ verifyAuth: Not found in Student model, checking StudentPayment for: ${decoded.email}`);
      student = await StudentPayment.findOne({ email: decoded.email.toLowerCase().trim() });
    }

    if (!student) {
      console.warn('⚠️ verifyAuth: Student NOT found in any DB model:', decoded.email);
      return res.status(401).json({
        success: false,
        message: 'Student account not found. Please contact support.',
        code: 'STUDENT_NOT_FOUND'
      });
    }
    const finalRollNumber = student.rollNumber || student.roll_number || 'N/A';
    console.log(`✅ verifyAuth: Student FOUND (ID: ${student._id}, Roll: ${finalRollNumber})`);

    // Get fresh purchased tests list
    const purchasedTests = await PurchasedTest.find({
      email: decoded.email
    });

    // Attach user data to request
    req.user = {
      email: decoded.email,
      rollNumber: finalRollNumber,
      purchasedTests: purchasedTests.map(t => t.test_id),
      tokenTimestamp: decoded.timestamp
    };

    console.log(`✅ Authenticated: ${decoded.email} (${finalRollNumber})`);
    next();

  } catch (error) {
    console.error('❌ Authentication middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware: Verify user has purchased specific test
 * Must be used AFTER verifyAuth middleware
 * Expects req.params.testId or req.query.testId or req.body.testId
 */
export async function verifyTestAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get testId from multiple sources
    const testId = req.params.testId || req.query.testId || req.body.testId;

    if (!testId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID is required.',
        code: 'NO_TEST_ID'
      });
    }

    // Normalize test ID (UPPERCASE, trim)
    const normalizedTestId = testId.toUpperCase().trim();

    // Check if user has purchased this test
    const hasPurchased = req.user.purchasedTests.some(
      t => t.toUpperCase().trim() === normalizedTestId
    );

    if (!hasPurchased) {
      console.warn(`⚠️ Access denied: ${req.user.email} tried to access ${normalizedTestId}`);
      return res.status(403).json({
        success: false,
        message: `You don't have access to ${testId.toUpperCase()} test. Please purchase it first.`,
        code: 'TEST_NOT_PURCHASED',
        redirect: '/testfirstpage.html'
      });
    }

    // ✅ NEW: Verify test status is 'scheduled' (finalized) and NOT 'draft'
    // This prevents students from accessing unfinalized tests even if they have the ID
    const { ScheduledTest } = await import('../models/ScheduledTest.js');
    const test = await ScheduledTest.findOne({
      $or: [
        { _id: normalizedTestId.match(/^[0-9a-fA-F]{24}$/) ? normalizedTestId : null },
        { test_id: { $regex: new RegExp("^" + normalizedTestId + "$", "i") } }
      ]
    });

    // Allow 'scheduled', 'ongoing', 'completed', or 'finalized'
    const isAvailable = test && (
      test.status === 'scheduled' || 
      test.status === 'ongoing' || 
      test.status === 'completed' || 
      test.status === 'finalized'
    );

    if (!isAvailable) {
      console.warn(`⚠️ Access denied: Student ${req.user.email} tried to access ${test?.status || 'unknown'} test ${normalizedTestId}`);
      return res.status(403).json({
        success: false,
        message: 'This test is not yet finalized or is currently unavailable.',
        code: 'TEST_NOT_FINALIZED'
      });
    }

    console.log(`✅ Test access granted: ${req.user.email} → ${normalizedTestId}`);

    // Attach testId to request for controller use
    req.testId = normalizedTestId;

    next();

  } catch (error) {
    console.error('❌ Test access verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error verifying test access.',
      code: 'VERIFICATION_ERROR'
    });
  }
}

/**
 * Optional: Middleware to check if user has ANY purchased tests
 * Useful for dashboard access
 */
export async function requirePurchase(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!req.user.purchasedTests || req.user.purchasedTests.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase at least one test to access this feature.',
        redirect: '/testfirstpage.html'
      });
    }

    next();

  } catch (error) {
    console.error('❌ Purchase verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error verifying purchase.'
    });
  }
}

/**
 * Extract email from JWT token without full verification
 * Useful for logging/debugging
 */
export function decodeTokenUnsafe(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Verify token without database check (faster, for non-critical routes)
 */
export function verifyTokenOnly(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export default {
  generateAuthToken,
  verifyAuth,
  verifyTestAccess,
  requirePurchase,
  decodeTokenUnsafe,
  verifyTokenOnly
};
