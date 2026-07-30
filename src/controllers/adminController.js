/**
 * ADMIN CONTROLLER - MongoDB Version
 * 
 * Handles admin-related operations
 */

import { StudentPayment } from '../models/StudentPayment.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { PurchasedTest } from '../models/PurchasedTest.js';
import { ScheduledTest } from '../models/ScheduledTest.js';

// Helper function to safely parse JSON
const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.error('JSON Parse Error:', error.message);
    return fallback;
  }
};

// ========== DASHBOARD STATS ==========
export const getDashboardStats = async (req, res) => {
  try {
    console.log('🔹 Getting dashboard stats...');

    // Get total students
    const totalStudents = await StudentPayment.countDocuments();

    // Get total transactions count
    const totalTransactions = await PaymentTransaction.countDocuments();

    // Get paid transactions for revenue calculation
    const paidTransactions = await PaymentTransaction.find({ status: 'paid' });
    const monthlyRevenue = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Get total purchased tests (active tests count)
    const activeTests = await PurchasedTest.countDocuments();

    // Get today's exams (tests purchased today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayExams = await PurchasedTest.countDocuments({
      purchased_at: { $gte: today, $lt: tomorrow }
    });

    // Calculate trends (simplified - compare with yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayStudents = await StudentPayment.countDocuments({
      created_at: { $gte: yesterday, $lt: today }
    });

    const studentsTrend = yesterdayStudents > 0
      ? Math.round(((totalStudents - yesterdayStudents) / yesterdayStudents) * 100)
      : 0;

    const yesterdayRevenue = (await PaymentTransaction.find({
      status: 'paid',
      created_at: { $gte: yesterday, $lt: today }
    })).reduce((sum, t) => sum + (t.amount || 0), 0);

    const revenueTrend = yesterdayRevenue > 0
      ? Math.round(((monthlyRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : 15; // Default positive trend

    // Performance data for chart (last 7 days)
    const performanceData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      scores: [0, 0, 0, 0, 0, 0, 0] // Placeholder - add actual performance calculation
    };

    const stats = {
      activeTests,
      totalStudents,
      todayExams,
      monthlyRevenue,
      testsTrend: 12, // Placeholder
      studentsTrend,
      revenueTrend,
      performanceData
    };

    console.log('✅ Dashboard stats:', stats);
    res.status(200).json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('❌ Error getting dashboard stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats',
      error: error.message
    });
  }
};

// ========== ADMIN PROFILE ==========
export const getAdminProfile = async (req, res) => {
  try {
    console.log('🔹 Getting admin profile...');

    // Get admin stats
    const totalStudents = await StudentPayment.countDocuments();
    const totalTransactions = await PaymentTransaction.countDocuments();
    const totalRevenue = await PaymentTransaction.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const adminProfile = {
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@vigyanprep.com',
      role: 'Administrator',
      stats: {
        totalStudents,
        totalTransactions,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      },
      permissions: ['manage_tests', 'manage_students', 'view_analytics'],
      lastLogin: new Date().toISOString()
    };

    console.log('✅ Admin profile retrieved successfully');
    res.status(200).json({
      success: true,
      profile: adminProfile
    });

  } catch (error) {
    console.error('❌ Error getting admin profile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin profile',
      error: error.message
    });
  }
};

// ========== NOTIFICATIONS ==========
export const getNotifications = async (req, res) => {
  try {
    console.log('🔹 Getting admin notifications...');

    // Get recent transactions and students for notifications
    const recentTransactions = await PaymentTransaction.find()
      .sort({ created_at: -1 })
      .limit(10);

    const recentStudents = await StudentPayment.find()
      .sort({ created_at: -1 })
      .limit(10);

    // Create notifications from recent activity
    const notifications = [];

    // Add student registration notifications
    for (const student of recentStudents) {
      notifications.push({
        id: `student_${student._id}`,
        type: 'student_registration',
        title: 'New Student Registration',
        message: `${student.email} registered with roll number ${student.roll_number}`,
        createdAt: student.created_at,
        unread: true
      });
    }

    // Add payment notifications
    for (const transaction of recentTransactions) {
      notifications.push({
        id: `payment_${transaction._id}`,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Payment of ₹${transaction.amount} received from ${transaction.email}`,
        createdAt: transaction.created_at,
        unread: true
      });
    }

    // Sort by timestamp descending
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`✅ Retrieved ${notifications.length} notifications`);
    res.status(200).json({
      success: true,
      notifications: notifications.slice(0, 20) // Return max 20
    });

  } catch (error) {
    console.error('❌ Error getting notifications:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: error.message
    });
  }
};

// ========== NOTIFICATIONS COUNT ==========
export const getNotificationsCount = async (req, res) => {
  try {
    console.log('🔹 Getting notifications count...');

    // Count recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentStudents = await StudentPayment.countDocuments({
      created_at: { $gte: yesterday }
    });

    const recentTransactions = await PaymentTransaction.countDocuments({
      created_at: { $gte: yesterday }
    });

    const count = recentStudents + recentTransactions;

    console.log(`✅ Unread notifications count: ${count}`);
    res.status(200).json({
      success: true,
      count
    });

  } catch (error) {
    console.error('❌ Error getting notifications count:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications count',
      error: error.message
    });
  }
};

// ========== SCHEDULED TESTS ==========

// Get all scheduled tests
export const getScheduledTests = async (req, res) => {
  try {
    console.log('🔹 Getting scheduled tests...');
    const { status, type } = req.query;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Build filter
    const filter = {
      exam_date: { $gte: currentDate }
    };
    if (status) filter.status = status;
    if (type) filter.test_type = type;

    const tests = await ScheduledTest.find(filter).sort({ exam_date: 1 });

    console.log(`✅ Retrieved ${tests.length} scheduled tests`);
    res.status(200).json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('❌ Error getting scheduled tests:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduled tests',
      error: error.message
    });
  }
};

// Get past tests (completed or date passed)
export const getPastTests = async (req, res) => {
  try {
    console.log('🔹 Getting past tests...');

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Find tests that are completed, archived, OR exam date is in the past
    const tests = await ScheduledTest.find({
      $or: [
        { status: 'completed' },
        { status: 'archived' },
        { exam_date: { $lt: currentDate } }
      ]
    }).sort({ exam_date: -1 });

    console.log(`✅ Retrieved ${tests.length} past tests`);
    res.status(200).json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('❌ Error getting past tests:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve past tests',
      error: error.message
    });
  }
};

// 🔥 CREATE SCHEDULED TEST - FIXED to handle frontend field names
export const createScheduledTest = async (req, res) => {
  try {
    console.log('🔹 Creating scheduled test...');
    console.log('📥 Request body:', req.body);

    // Extract all possible field names from frontend
    const {
      // Frontend sends these (snake_case)
      test_name,
      test_type,
      exam_date,
      start_time,
      duration_minutes,
      total_marks,
      subjects,
      description,
      total_questions,
      status = 'scheduled',
      test_id,
      // Alternative field names if frontend changes
      testName,
      testType,
      testDate,
      testTime,
      testDescription,
      duration,
      totalMarks,
      sections
    } = req.body;

    // Normalize field names (use whatever was provided)
    const normalizedTestName = test_name || testName;
    const normalizedTestType = test_type || testType;
    const normalizedExamDate = exam_date || testDate;
    const normalizedStartTime = start_time || testTime;
    const normalizedDuration = duration_minutes || duration || 180;
    const normalizedTotalMarks = total_marks || totalMarks || 100;
    const normalizedSubjects = subjects || sections || '';
    const normalizedDescription = description || testDescription || '';
    const normalizedTotalQuestions = total_questions || 0;

    // Validate required fields
    if (!normalizedTestName || !normalizedTestType || !normalizedExamDate) {
      console.error('❌ Missing required fields');
      console.error('Received:', {
        test_name,
        test_type,
        exam_date,
        testName,
        testType,
        testDate
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: test_name, test_type, exam_date',
        required: ['test_name', 'test_type', 'exam_date'],
        received: req.body
      });
    }

    // Create new test document
    const newTest = new ScheduledTest({
      test_name: normalizedTestName,
      test_type: normalizedTestType.toLowerCase(),
      test_id: test_id || `TEST-${normalizedTestType}-${Date.now()}`,
      exam_date: new Date(normalizedExamDate),
      start_time: normalizedStartTime,
      duration: normalizedDuration,
      total_marks: normalizedTotalMarks,
      subjects: normalizedSubjects,
      description: normalizedDescription,
      total_questions: normalizedTotalQuestions,
      status: status,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('💾 Saving test to MongoDB:', newTest);
    await newTest.save();

    console.log('✅ Scheduled test created successfully!');
    console.log('   Test ID:', newTest._id);
    console.log('   Test Type:', newTest.test_type);

    res.status(201).json({
      success: true,
      message: 'Test scheduled successfully',
      test: newTest,
      _id: newTest._id
    });
  } catch (error) {
    console.error('❌ Error creating scheduled test:', error.message);
    console.error('   Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduled test',
      error: error.message,
      details: error.errors || {}
    });
  }
};

// Get specific scheduled test
export const getTestDetails = async (req, res) => {
  try {
    console.log('🔹 Getting test details for:', req.params.testId);
    const test = await ScheduledTest.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    console.log('✅ Test details retrieved');
    res.status(200).json({
      success: true,
      test
    });
  } catch (error) {
    console.error('❌ Error getting test details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve test details',
      error: error.message
    });
  }
};

// Update scheduled test
export const updateTestStatus = async (req, res) => {
  try {
    console.log('🔹 Updating test status:', req.params.testId);

    // Validate ID format
    if (!req.params.testId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Test ID format'
      });
    }

    const { status } = req.body;

    const test = await ScheduledTest.findByIdAndUpdate(
      req.params.testId,
      { status, updated_at: new Date() },
      { new: true }
    );

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    console.log('✅ Test status updated');
    res.status(200).json({
      success: true,
      message: 'Test updated successfully',
      test
    });
  } catch (error) {
    console.error('❌ Error updating test:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update test',
      error: error.message
    });
  }
};

// Delete scheduled test
export const deleteTest = async (req, res) => {
  try {
    console.log('🔹 Deleting test:', req.params.testId);

    // Validate ID format
    if (!req.params.testId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Test ID format'
      });
    }

    const test = await ScheduledTest.findByIdAndDelete(req.params.testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    console.log('✅ Test deleted');
    res.status(200).json({
      success: true,
      message: 'Test deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting test:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test',
      error: error.message
    });
  }
};

// ========== TEMP: Not fully implemented functions ==========
const notImplemented = (req, res) => {
  res.status(501).json({
    success: false,
    message: "This endpoint is temporarily disabled during MongoDB migration. Use OOP endpoints instead."
  });
};

export const getAvailableTests = notImplemented;
