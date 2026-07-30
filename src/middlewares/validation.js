// 🔧 VALIDATION MIDDLEWARE FOR ALL CRITICAL ENDPOINTS
// Prevents invalid data from reaching controllers

import { validationResult, body, query } from 'express-validator';

// 🔴 FIX #8: ADD INPUT VALIDATION MIDDLEWARE

/**
 * Validation error handler middleware
 * Use after validators to check for validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('⚠️ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * PAYMENT VALIDATION RULES
 */
export const validateCheckout = [

  handleValidationErrors
];

export const validatePaymentVerification = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('testId')
    .notEmpty().withMessage('Test ID is required')
    .isString().withMessage('Test ID must be a string')
    .trim(),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isNumeric().withMessage('Amount must be a number')
    .custom(value => {
      if (parseFloat(value) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  body('razorpay_order_id')
    .notEmpty().withMessage('Razorpay Order ID is required')
    .isString().withMessage('Order ID must be a string'),
  body('razorpay_payment_id')
    .notEmpty().withMessage('Razorpay Payment ID is required')
    .isString().withMessage('Payment ID must be a string'),
  body('razorpay_signature')
    .notEmpty().withMessage('Razorpay Signature is required')
    .isString().withMessage('Signature must be a string'),
  handleValidationErrors
];

/**
 * QUESTION VALIDATION RULES
 */
export const validateCreateQuestion = [
  body('title')
    .notEmpty().withMessage('Question title is required')
    .isString().withMessage('Title must be a string')
    .trim()
    .isLength({ min: 5, max: 500 }).withMessage('Title must be between 5-500 characters'),
  body('options')
    .isArray({ min: 2, max: 5 }).withMessage('Options must be an array with 2-5 items'),
  body('correct_answer')
    .notEmpty().withMessage('Correct answer is required')
    .isNumeric().withMessage('Correct answer must be a number'),
  handleValidationErrors
];

/**
 * EXAM VALIDATION RULES
 */
export const validateCreateExam = [
  body('title')
    .notEmpty().withMessage('Exam title is required')
    .isString().withMessage('Title must be a string')
    .trim(),
  body('duration')
    .notEmpty().withMessage('Exam duration is required')
    .isNumeric().withMessage('Duration must be a number in minutes')
    .custom(value => {
      if (parseInt(value) < 15 || parseInt(value) > 300) {
        throw new Error('Duration must be between 15-300 minutes');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * AUTHENTICATION VALIDATION RULES
 */
export const validateUserLogin = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

/**
 * RATE LIMITING HELPER
 * Use with express-rate-limit
 * 🔥 FIXED: Added skip and validate options for trust proxy compatibility
 */
export const paymentRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per window
  message: 'Too many payment attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // 🔥 FIX: Skip validation when trust proxy is enabled (Hostinger/proxy setup)
  skip: (req) => false, // Never skip - apply to all
  validate: false, // 🔥 CRITICAL: Disable trust proxy validation
};

export const apiRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // 🔥 CRITICAL: Disable trust proxy validation
};