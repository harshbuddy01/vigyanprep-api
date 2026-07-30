import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";
import nodemailer from "nodemailer";
import { StudentPayment } from "../models/StudentPayment.js";
import { PurchasedTest } from "../models/PurchasedTest.js";
import { PaymentTransaction } from "../models/PaymentTransaction.js";
import mongoose from "mongoose";

// Create Nodemailer transporter with Hostinger SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error);
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
} else {
  console.warn('⚠️ Email credentials not configured - email functionality disabled');
}

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
export const getApiKey = (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_API_KEY });
};

// 2. CHECKOUT - 🔧 ENHANCED ERROR LOGGING
export const checkout = async (req, res) => {
  console.log('🔵 ========== CHECKOUT ENDPOINT CALLED ==========');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // CHECK 1: Is Razorpay configured?
    console.log('🔍 Check 1: Razorpay instance exists?', razorpayInstance ? '✅ YES' : '❌ NO');
    
    if (!razorpayInstance) {
      console.error('❌ CRITICAL: Razorpay instance is NULL!');
      console.error('   Possible reasons:');
      console.error('   1. RAZORPAY_API_KEY not set in environment variables');
      console.error('   2. RAZORPAY_API_SECRET not set in environment variables');
      console.error('   3. Razorpay initialization failed in config/razorpay.js');
      
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured. Missing Razorpay credentials.",
        debug: {
          razorpayConfigured: false,
          envCheck: {
            hasApiKey: !!process.env.RAZORPAY_API_KEY,
            hasApiSecret: !!process.env.RAZORPAY_API_SECRET
          }
        }
      });
    }

    // CHECK 2: Validate request body
    const { amount, testId, email } = req.body;
    console.log('🔍 Check 2: Request validation');
    console.log('   Amount:', amount, typeof amount);
    console.log('   TestId:', testId, typeof testId);
    console.log('   Email:', email, typeof email);

    if (!amount || isNaN(amount) || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }

    if (!testId || typeof testId !== 'string') {
      console.error('❌ Invalid testId:', testId);
      return res.status(400).json({
        success: false,
        message: "Valid testId is required"
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('❌ Invalid email:', email);
      return res.status(400).json({
        success: false,
        message: "Valid email is required"
      });
    }

    console.log('✅ Request validation passed');

    // CHECK 3: Create Razorpay order
    console.log('🔍 Check 3: Creating Razorpay order...');
    const options = {
      amount: Number(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}_${testId}`,
      notes: {
        email: email,
        testId: testId
      }
    };

    console.log('📤 Sending to Razorpay:', JSON.stringify(options, null, 2));

    const order = await razorpayInstance.orders.create(options);
    
    console.log('✅ Razorpay order created successfully!');
    console.log('   Order ID:', order.id);
    console.log('   Amount:', order.amount);
    console.log('   Currency:', order.currency);

    // CHECK 4: Prepare response
    const responseData = { 
      success: true, 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
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

// 3. 🔧 FIXED PAYMENT VERIFICATION WITH GUARANTEED STUDENT CREATION
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, testId, amount } = req.body;

    console.log(`🔹 Email: ${email}`);
    console.log(`🔹 TestId: ${testId}`);
    console.log(`🔹 Amount: ${amount}`);

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.log("❌ Invalid or missing email!");
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    if (!testId || typeof testId !== 'string') {
      console.log("❌ TestId is missing or invalid!");
      return res.status(400).json({ success: false, message: "Valid TestId is required" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log("❌ Missing payment verification parameters!");
      return res.status(400).json({ success: false, message: "Missing payment verification data" });
    }

    // 🆕 STEP 2: Verify Razorpay signature
    console.log("🔐 Verifying payment signature...");
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.log("❌ Invalid payment signature!");
      return res.status(400).json({ success: false, message: "Invalid Payment Signature" });
    }

    console.log("✅ Payment signature verified!");

    // 🆕 STEP 3: Start MongoDB session for atomic operations
    session = await mongoose.startSession();
    session.startTransaction();
    console.log("🔄 Database transaction started");

    const normalizedEmail = email.toLowerCase().trim();

    let existingStudent = await StudentPayment.findOne({ email: normalizedEmail }).session(session);

    let rollNumber;
    let isNewStudent = false;
    let purchasedTests = [];
    let emailWarning = null;

    if (existingStudent) {
      // EXISTING STUDENT
      rollNumber = existingStudent.roll_number;
      console.log(`👤 Existing student found: ${normalizedEmail}, Roll: ${rollNumber}`);

      const existingPurchase = await PurchasedTest.findOne({
        email: normalizedEmail,
        test_id: testId
      }).session(session);

      if (existingPurchase) {
        console.log(`⚠️ Student already purchased ${testId}`);
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "You have already purchased this test"
        });
      }

      // 🆕 Create purchased test record
      const newPurchase = await PurchasedTest.create([{
        email: normalizedEmail,
        test_id: testId,
        purchased_at: new Date()
      }], { session });
      console.log("✅ Purchase record created:", newPurchase[0]._id);

      // 🆕 Create transaction record
      const newTransaction = await PaymentTransaction.create([{
        email: normalizedEmail,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        test_id: testId,
        amount: amount || 199,
        status: 'paid',
        created_at: new Date()
      }], { session });
      console.log("✅ Transaction record created:", newTransaction[0]._id);

      const tests = await PurchasedTest.find({ email: normalizedEmail }).session(session);
      purchasedTests = tests.map(t => t.test_id);

      console.log(`✅ Updated existing student: ${normalizedEmail}, Tests: ${purchasedTests.join(', ')}`);

    } else {
      // 🆕 NEW STUDENT - Generate roll number with retry logic
      console.log("🆕 NEW STUDENT REGISTRATION STARTING...");
      
      let rollCreated = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!rollCreated && attempts < maxAttempts) {
        attempts++;
        rollNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
        console.log(`🎲 Generated Roll Number Attempt ${attempts}: ${rollNumber}`);
        
        try {
          // Check if roll number already exists
          const duplicateRoll = await StudentPayment.findOne({ roll_number: rollNumber }).session(session);
          
          if (duplicateRoll) {
            console.warn(`⚠️ Roll number ${rollNumber} already exists, retrying...`);
            continue;
          }
          
          // 🆕 CREATE STUDENT RECORD WITH EXPLICIT ERROR HANDLING
          console.log("💾 CREATING STUDENT RECORD IN DATABASE...");
          console.log("   Email:", normalizedEmail);
          console.log("   Roll:", rollNumber);
          console.log("   Session:", session ? "Active" : "None");
          
          const newStudent = await StudentPayment.create([{
            email: normalizedEmail,
            roll_number: rollNumber,
            created_at: new Date()
          }], { session });
          
          console.log("✅ STUDENT RECORD CREATED SUCCESSFULLY!");
          console.log("   ID:", newStudent[0]._id);
          console.log("   Email:", newStudent[0].email);
          console.log("   Roll:", newStudent[0].roll_number);
          
          rollCreated = true;
          isNewStudent = true;
          
        } catch (rollError) {
          console.error(`❌ Error creating student record (attempt ${attempts}):`, rollError.message);
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to create student record after ${maxAttempts} attempts: ${rollError.message}`);
          }
        }
      }

      if (!rollCreated) {
        throw new Error("Failed to generate unique roll number");
      }

      // 🆕 Create purchased test record
      console.log("💾 Creating purchased test record...");
      const newPurchase = await PurchasedTest.create([{
        email: normalizedEmail,
        test_id: testId,
        purchased_at: new Date()
      }], { session });
      console.log("✅ Purchase record created:", newPurchase[0]._id);

      // 🆕 Create transaction record
      console.log("💾 Creating transaction record...");
      const newTransaction = await PaymentTransaction.create([{
        email: normalizedEmail,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        test_id: testId,
        amount: amount || 199,
        status: 'paid',
        created_at: new Date()
      }], { session });
      console.log("✅ Transaction record created:", newTransaction[0]._id);

      purchasedTests = [testId];

      console.log(`✅ NEW STUDENT CREATED SUCCESSFULLY: ${normalizedEmail}, Roll: ${rollNumber}`);
    }

    // 🆕 STEP 4: Commit transaction to database
    console.log("💾 COMMITTING ALL CHANGES TO DATABASE...");
    await session.commitTransaction();
    console.log("✅ DATABASE TRANSACTION COMMITTED SUCCESSFULLY!");
    
    // 🆕 STEP 5: Verify student was actually saved
    console.log("🔍 VERIFYING STUDENT RECORD IN DATABASE...");
    const verifyStudent = await StudentPayment.findOne({ email: normalizedEmail });
    
    if (!verifyStudent) {
      console.error("❌ CRITICAL ERROR: Student record not found after commit!");
      throw new Error("Student record verification failed");
    }
    
    console.log("✅ VERIFIED: Student record exists in database");
    console.log("   Email:", verifyStudent.email);
    console.log("   Roll:", verifyStudent.roll_number);
    console.log("   Created:", verifyStudent.created_at);

    // ✨ SEND EMAIL
    console.log("📧 Attempting to send email via Nodemailer...");

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const firstName = extractFirstName(normalizedEmail);
        const testSeriesName = testId.toUpperCase();

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">VIGYAN<span style="font-weight: 300; font-size: 18px;">.prep</span></h1>
                            <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Examination Authority</p>
                        </td>
                    </tr>

                    <!-- Success Icon -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <div style="width: 60px; height: 60px; background: #10b981; border-radius: 50%; margin: 0 auto; line-height: 60px; font-size: 32px; color: white;">✓</div>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: 600; text-align: center;">Registration Confirmed!</h2>
                            
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 15px; text-align: center;">Hello <strong style="color: #1f2937;">${firstName}</strong>,</p>
                            <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; text-align: center;">You're enrolled in <strong style="color: #2563eb;">${testSeriesName} Test Series</strong></p>

                            <!-- Roll Number Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="margin: 0 0 12px 0; color: #92400e; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">⚡ Your Roll Number</p>
                                        <p style="margin: 0 0 15px 0; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #000000; letter-spacing: 4px;">${rollNumber}</p>
                                        <div style="background: #dc2626; color: #ffffff; padding: 6px 16px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 1px; display: inline-block;">CONFIDENTIAL - DO NOT SHARE</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Important Notice -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: #fee2e2; border-left: 3px solid #ef4444; border-radius: 4px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0; color: #991b1b; font-size: 12px; line-height: 1.6;"><strong>⚠️ Important:</strong> Save this roll number. You'll need it to access your tests.</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://vigyanprep.com/testfirstpage.html" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">GO TO DASHBOARD →</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0 0; text-align: center; font-size: 12px; color: #9ca3af;">Need help? Reply to this email or visit our support center.</p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 5px 0; font-size: 11px; color: #9ca3af;">This is an automated email from Vigyan.prep</p>
                            <p style="margin: 0; font-size: 11px; color: #9ca3af;">© ${new Date().getFullYear()} Vigyan.prep Exams. All rights reserved.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const mailOptions = {
          from: `"Vigyan.prep Exams" <${process.env.EMAIL_USER}>`,
          to: normalizedEmail,
          subject: `✅ Registration Confirmed - ${testSeriesName} Test Series`,
          html: emailHtml,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${normalizedEmail}`);

      } catch (emailError) {
        console.error("❌ Email Error:", emailError.message);
        emailWarning = "Email notification could not be sent, but your registration is complete";
      }
    } else {
      console.warn('⚠️ Email credentials not configured');
      emailWarning = "Email notifications are currently disabled";
    }

    console.log("✅ Sending success response to frontend...");

    const responseData = {
      success: true,
      rollNumber,
      isNewStudent,
      purchasedTests,
      message: isNewStudent
        ? "Payment successful! Your Roll Number has been sent to your email."
        : "Payment successful! Test added to your account."
    };

    if (emailWarning) {
      responseData.warning = emailWarning;
      console.warn(`⚠️ Response includes email warning: ${emailWarning}`);
    }

    console.log("🔹 ========== PAYMENT VERIFICATION SUCCESS ==========");
    console.log("📊 Final Response:", JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);

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
