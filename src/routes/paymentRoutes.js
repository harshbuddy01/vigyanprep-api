import express from "express";
import { checkout, paymentVerification, getApiKey, verifyUserFull, checkPurchase } from "../controllers/paymentController.js";
import {
  validateCheckout,
  validatePaymentVerification
} from "../middlewares/validation.js";
import { paymentLimiter } from "../middlewares/rateLimiter.js";
import { PurchasedTest } from "../models/PurchasedTest.js";

const router = express.Router();

// 🧱 SENSITIVE API RATE LIMITER
const limiter = paymentLimiter;

// 🔴 FIX #8: ADD INPUT VALIDATION TO ALL PAYMENT ENDPOINTS
router.route("/getkey").get(getApiKey);

router.route("/checkout")
  .post(limiter, validateCheckout, checkout);

// ✅ PRIMARY VERIFICATION ENDPOINT
router.route("/paymentverification")
  .post(limiter, validatePaymentVerification, paymentVerification);

// ✅ NEW: Identity Verification
router.route("/verify-user-full")
  .post(limiter, verifyUserFull);

// ✅ NEW: Check existing purchases
router.route("/check-purchase")
  .post(limiter, checkPurchase);

// ✅ ALIAS ENDPOINTS FOR COMPATIBILITY (all call same function)
router.route("/payment-verification")
  .post(limiter, validatePaymentVerification, paymentVerification);

router.route("/verify")
  .post(limiter, validatePaymentVerification, paymentVerification);

router.route("/verify-payment")
  .post(limiter, validatePaymentVerification, paymentVerification);

// ✅ Added create-order alias for API documentation compatibility
router.route("/create-order")
  .post(limiter, validateCheckout, checkout);

export default router;
