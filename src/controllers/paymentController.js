import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";
import { StudentPayment } from "../models/StudentPayment.js";
import { PurchasedTest } from "../models/PurchasedTest.js";
import { PaymentTransaction } from "../models/PaymentTransaction.js";
import Student from "../models/Student.js";
import { TestSeries } from "../models/TestSeries.js"; // 🔒 NEW: Import TestSeries model
import { EmailLog } from "../models/EmailLog.js"; // 🔒 NEW: Import EmailLog model
import mongoose from "mongoose";
import { sendPaymentEmail } from "../services/emailService.js";
import { getNextRollNumber, isValidTestId } from "../utils/paymentUtils.js";
import { generateAuthToken } from "../middlewares/auth.js";

// Helper function to safely extract first name from email
const extractFirstName = (email) => {
  try {
    if (!email || typeof email !== 'string') return 'User';

    const emailParts = email.split('@');
    if (emailParts.length < 2) return 'User';

    const username = emailParts[0];
    const nameParts = username.split('.');
    const firstName = nameParts[0] || 'User';

    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  } catch (error) {
    console.error('Error extracting first name:', error.message);
    return 'User';
  }
};

// 🆕 Database Health Check
const checkDatabaseConnection = async () => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    console.log(`🔍 Database Status: ${isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);

    if (!isConnected) {
      console.error('❌ MongoDB is NOT connected! Cannot save student records.');
      console.error('   Connection state:', mongoose.connection.readyState);
      console.error('   0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting');
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  }
};

// 1. GET API KEY
// ✅ SECURITY FIX: Only expose PUBLIC key ID, never secret
export const getApiKey = (req, res) => {
  // Only return the public key ID
  // The secret key should NEVER be exposed to frontend
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY;

  res.status(200).json({
    key: keyId  // Frontend expects 'key' property
  });
};

// 2. 🔒 SECURITY-ENHANCED CHECKOUT - PRICE FROM DATABASE ONLY
export const checkout = async (req, res) => {
  console.log('🔵 ========== CHECKOUT ENDPOINT CALLED ==========');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

  try {
    // CHECK 1: Is Razorpay configured?
    console.log('🔍 Check 1: Razorpay instance exists?', razorpayInstance ? '✅ YES' : '❌ NO');

    if (!razorpayInstance) {
      console.error('❌ CRITICAL: Razorpay instance is NULL!');
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured. Missing Razorpay credentials."
      });
    }

    // 🔒 SECURITY: Only accept testId and email from frontend
    // Amount will be fetched from DATABASE, not from frontend!
    const { testId, email } = req.body;

    console.log('🔍 Check 2: Request validation');
    console.log('   TestId:', testId, typeof testId);
    console.log('   Email:', email, typeof email);

    // Validate testId
    if (!testId || typeof testId !== 'string' || testId.trim().length === 0) {
      console.error('❌ Invalid testId:', testId);
      return res.status(400).json({
        success: false,
        message: "Valid testId is required"
      });
    }

    // ✅ SECURITY: Validate testId against whitelist
    if (!isValidTestId(testId)) {
      console.error('❌ Security Alert: Unauthorized testId attempted:', testId);
      return res.status(403).json({
        success: false,
        message: "Invalid test selection"
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('❌ Invalid email:', email);
      return res.status(400).json({
        success: false,
        message: "Valid email is required"
      });
    }

    console.log('✅ Request validation passed');

    // 🔒 SECURITY CRITICAL: Fetch price from database
    console.log(`🔍 Fetching price for test '${testId}' from DATABASE...`);

    const testSeries = await TestSeries.findOne({
      testId: testId.toLowerCase().trim(),
      isActive: true
    });

    if (!testSeries) {
      console.error(`❌ Test series '${testId}' not found in database`);
      return res.status(404).json({
        success: false,
        message: `Test series '${testId}' not found or is not available`
      });
    }

    const priceInRupees = testSeries.price;
    const priceInPaise = priceInRupees * 100;

    console.log('✅ Price fetched from database:');
    console.log(`   Test: ${testSeries.name}`);
    console.log(`   Price: ₹${priceInRupees}`);
    console.log(`   Razorpay amount (paise): ${priceInPaise}`);
    console.log('🔒 SECURITY: Frontend cannot override this price');

    // CHECK 3: Create Razorpay order with DATABASE price
    console.log('🔍 Check 3: Creating Razorpay order...');
    const options = {
      amount: priceInPaise, // 🔒 Price from DATABASE only!
      currency: "INR",
      receipt: `receipt_${Date.now()}_${testId}`,
      notes: {
        email: email,
        testId: testId,
        testName: testSeries.name,
        priceInRupees: priceInRupees
      }
    };

    console.log('📤 Sending to Razorpay:', JSON.stringify(options, null, 2));

    const order = await razorpayInstance.orders.create(options);

    console.log('✅ Razorpay order created successfully!');
    console.log('   Order ID:', order.id);
    console.log('   Amount (paise):', order.amount);
    console.log('   Amount (rupees): ₹' + (order.amount / 100));
    console.log('   Currency:', order.currency);

    // 🆕 Save order to database as PENDING before returning to student
    // This is required for security verification in next step
    console.log('💾 Saving pending transaction to database...');
    await PaymentTransaction.create({
      email: email.toLowerCase().trim(),
      razorpay_order_id: order.id,
      test_id: testId.toLowerCase().trim(),
      amount: order.amount, // in paise
      status: 'pending',
      created_at: new Date()
    });
    console.log('✅ Pending transaction saved!');

    // CHECK 4: Prepare response
    const responseData = {
      success: true,
      orderId: order.id,
      amount: order.amount, // in paise
      amountInRupees: priceInRupees, // for display
      currency: order.currency,
      testName: testSeries.name,
      key: process.env.RAZORPAY_API_KEY
    };

    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
    console.log('🔵 ========== CHECKOUT SUCCESS ==========');

    res.status(200).json(responseData);

  } catch (error) {
    console.error('🔴 ========== CHECKOUT ERROR ==========');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);

    // Check if it's a Razorpay API error
    if (error.error) {
      console.error('❌ Razorpay API error details:', JSON.stringify(error.error, null, 2));
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      debug: {
        errorName: error.name,
        errorMessage: error.message,
        razorpayError: error.error || null
      }
    });
  }
};

// 3. 🔧 FIXED PAYMENT VERIFICATION WITH JWT TOKEN GENERATION
// (Rest of the file remains the same as before)
export const paymentVerification = async (req, res) => {
  console.log("🔹 ========== PAYMENT VERIFICATION STARTED ==========");
  console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
  console.log("⏰ Timestamp:", new Date().toISOString());

  // 🆕 STEP 1: Check database connection FIRST
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.error('❌ CRITICAL: Database not connected! Cannot process payment.');
    return res.status(500).json({
      success: false,
      message: "Database connection error. Please contact support.",
      debug: {
        databaseConnected: false,
        connectionState: mongoose.connection.readyState
      }
    });
  }

  // Start a session for transaction support
  let session = null;

  try {
    if (!razorpayInstance) {
      console.error('❌ Razorpay instance not configured for payment verification');
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured"
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, testId, amount, fullName } = req.body;

    console.log(`🔹 Email: ${email}`);
    console.log(`🔹 TestId: ${testId}`);
    console.log(`🔹 Amount: ${amount}`);
    console.log(`🔹 FullName: ${fullName}`);

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.log("❌ Invalid or missing email!");
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    // ✅ NEW: Validate fullName
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 50) {
      console.log("❌ Invalid or missing fullName!");
      return res.status(400).json({ success: false, message: "Valid full name is required (2-50 characters)" });
    }

    if (!testId || typeof testId !== 'string' || !isValidTestId(testId)) {
      console.log("❌ TestId is missing, invalid, or unauthorized!");
      return res.status(403).json({ success: false, message: "Valid and authorized TestId is required" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log("❌ Missing payment verification parameters!");
      return res.status(400).json({ success: false, message: "Missing payment verification data" });
    }

    // 🔐 1. STRICT RAZORPAY SIGNATURE VERIFICATION
    console.log("🔐 Verifying payment signature...");
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ SECURITY ALERT: Razorpay signature mismatch!");
      return res.status(400).json({ success: false, message: "Payment verification failed: Signature mismatch" });
    }
    console.log("✅ Payment signature verified!");

    // 🔐 2. METADATA OWNERSHIP MATCHING
    // Verify that the verification request matches the original order context in DB
    const orderRecord = await PaymentTransaction.findOne({ razorpay_order_id: razorpay_order_id });
    if (!orderRecord) {
      console.error("❌ Order not found in database:", razorpay_order_id);
      return res.status(404).json({ success: false, message: "Transaction record not found" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (orderRecord.email !== normalizedEmail || orderRecord.test_id !== testId) {
       console.error("❌ SECURITY ALERT: Order metadata mismatch!");
       console.error(`Expected: ${orderRecord.email}/${orderRecord.test_id}, Received: ${normalizedEmail}/${testId}`);
       return res.status(403).json({ success: false, message: "Security violation: Metadata mismatch" });
    }
    console.log("✅ Order metadata ownership verified!");

    // 🆕 3. Start MongoDB session for atomic operations
    session = await mongoose.startSession();
    session.startTransaction();
    console.log("🔄 Database transaction started");

    // Check if student exists
    let student = await StudentPayment.findOne({ email: normalizedEmail }).session(session);
    let isNewStudent = false;
    let rollNumber = student?.roll_number;

    if (!student) {
      isNewStudent = true;
      // 🔢 ATOMIC SEQUENTIAL ROLL NUMBER (VP-100001 format)
      rollNumber = await getNextRollNumber();
      console.log(`🔢 Generated sequential roll number: ${rollNumber}`);
      
      student = await StudentPayment.create([{
        email: normalizedEmail,
        roll_number: rollNumber,
        fullName: fullName.trim(),
        created_at: new Date()
      }], { session });

      // Create main student record for dashboard
      await Student.create([{
        email: normalizedEmail,
        rollNumber,
        fullName: fullName.trim(),
        course: testId.toUpperCase(),
        lastLoginAt: new Date()
      }], { session });
    } else {
       // Update existing student's name/course if needed
       await Student.findOneAndUpdate(
         { email: normalizedEmail },
         { $set: { fullName: fullName.trim(), lastLoginAt: new Date() } },
         { session }
       );
    }

    // 🆕 4. Add purchase record (Atomic check for duplicates handled by unique index later)
    await PurchasedTest.create([{
      email: normalizedEmail,
      test_id: testId,
      amount: orderRecord.amount / 100, // use verified amount from DB
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      purchased_at: new Date()
    }], { session });

    // Mark original transaction as paid
    orderRecord.status = 'paid';
    orderRecord.razorpay_payment_id = razorpay_payment_id;
    orderRecord.razorpay_signature = razorpay_signature;
    await orderRecord.save({ session });

    await session.commitTransaction();
    console.log("✅ Database transaction committed!");

    const purchasedTests = (await PurchasedTest.find({ email: normalizedEmail })).map(p => p.test_id);

    // 🚀 5. ROBUST SMTP DELIVERY (Fire-and-forget)
    sendPaymentEmail(normalizedEmail, fullName, rollNumber, testId)
      .then(success => console.log(`📡 Background email: ${success ? 'OK' : 'FAILED'}`))
      .catch(err => console.error(`❌ Email crash:`, err.message));

    // 🔐 6. HARDENED JWT COOKIE
    const authToken = generateAuthToken(normalizedEmail, rollNumber, purchasedTests);
    res.cookie('auth_token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(200).json({
      success: true,
      rollNumber,
      isNewStudent,
      purchasedTests,
      message: isNewStudent ? "Welcome! Roll number sent to email." : "Test added to account."
    });

  } catch (error) {
    console.error("🔴 ========== PAYMENT VERIFICATION ERROR ==========");
    console.error("❌ Error:", error.message);
    console.error("❌ Stack:", error.stack);

    // 🆕 Rollback transaction on error
    if (session) {
      try {
        await session.abortTransaction();
        console.log("🔄 Database transaction rolled back");
      } catch (abortError) {
        console.error("❌ Error aborting transaction:", abortError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error: " + error.message,
      debug: {
        errorName: error.name,
        errorMessage: error.message,
        databaseConnected: mongoose.connection.readyState === 1
      }
    });
  } finally {
    // 🆕 Always end session
    if (session) {
      session.endSession();
      console.log("🔄 Database session ended");
    }
  }
};

/**
 * 🔍 Verify user identity (Email and Roll Number) before purchase
 * Handles Scenario 1 (New User), 2 (Verified Returning), and 3 (Existing needing roll)
 */
export const verifyUserFull = async (req, res) => {
  console.log("🔍 ========== VERIFY USER FULL CALLED ==========");
  try {
    const { email, rollNumber } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        status: 'ERROR',
        message: 'Valid email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`🔍 Checking identity for: ${normalizedEmail}`);

    // Check in StudentPayment collection (Source of truth for roll numbers)
    const student = await StudentPayment.findOne({ email: normalizedEmail });

    if (!student) {
      console.log("✨ Result: NEW_USER");
      return res.json({ status: "NEW_USER" });
    }

    if (!rollNumber) {
      console.log("🔑 Result: EXISTING_USER_NEED_ROLL");
      return res.json({ status: "EXISTING_USER_NEED_ROLL" });
    }

    if (student.roll_number === rollNumber.trim()) {
      console.log("✅ Result: VERIFIED");
      return res.json({ status: "VERIFIED" });
    } else {
      console.log("❌ Result: WRONG_ROLL");
      return res.json({ status: "WRONG_ROLL" });
    }

  } catch (error) {
    console.error("❌ Verify User Error:", error.message);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      message: 'Server error during verification'
    });
  }
};

/**
 * 🔍 Check for existing purchases before starting payment
 * Prevents double-purchasing and provides direct dashboard redirect
 */
export const checkPurchase = async (req, res) => {
  console.log("🔍 ========== CHECK PURCHASE CALLED ==========");
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`🔍 Checking purchases for: ${normalizedEmail}`);

    // 🔒 SECURITY: Email Enumeration Prevention
    // Only return existence status, never names or roll numbers to public requests
    const studentPayment = await StudentPayment.findOne({ email: normalizedEmail });

    return res.json({
      success: true,
      exists: !!studentPayment,
      // 🔒 Sensitive data filtered out
    });

  } catch (error) {
    console.error("❌ Check Purchase Error:", error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during purchase verification'
    });
  }
};
