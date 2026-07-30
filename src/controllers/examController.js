// DISABLED FOR MONGODB: import { pool } from "../config/mysql.js";
import { StudentPayment } from "../models/StudentPayment.js";
import { PurchasedTest } from "../models/PurchasedTest.js";
import { ScheduledTest } from "../models/ScheduledTest.js";
import QuestionModel from "../schemas/QuestionSchema.js";
import { StudentAttempt } from "../models/StudentAttempt.js";
import { generateAuthToken } from '../middlewares/auth.js';
import { TestSeries } from "../models/TestSeries.js";

// Helper function to calculate score for a single question
const evaluateQuestionScore = (q, userAnswer) => {
  const { questionType, marksPositive, marksNegative, correctNumericAnswer, numericTolerance, correctOptionIndex } = q;
  const qType = questionType || 'MCQ';
  let isCorrect = false;
  let correctAnswerText = '';

  const isUnanswered = userAnswer === null || userAnswer === undefined || userAnswer === '';

  if (isUnanswered) {
    return { isCorrect: false, status: 'unanswered', marks: 0, correctAnswerText: '' };
  }

  if (qType === 'MCQ' || qType === 'TrueFalse') {
    isCorrect = parseInt(userAnswer) === correctOptionIndex;
    correctAnswerText = q.options && q.options[correctOptionIndex] !== undefined ? q.options[correctOptionIndex] : (q.correctAnswer || '');
  } else if (qType === 'Numerical') {
    correctAnswerText = correctNumericAnswer !== null ? correctNumericAnswer.toString() : '';
    const userNum = parseFloat(userAnswer);
    const targetNum = correctNumericAnswer;
    const tolerance = numericTolerance || 0;
    isCorrect = !isNaN(userNum) && Math.abs(userNum - targetNum) <= tolerance;
  } else if (qType === 'Descriptive') {
    return {
      isCorrect: false,
      status: 'pending_manual',
      marks: 0, // No automatic negative marks for Descriptive
      correctAnswerText: q.modelAnswer || ''
    };
  }

  const marks = isCorrect ? (marksPositive || 4) : (marksNegative || -1);
  return {
    isCorrect,
    correctAnswerText,
    marks,
    status: isCorrect ? 'correct' : 'wrong'
  };
};

// Helper function to safely parse JSON
const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.error('JSON Parse Error:', error.message);
    return fallback;
  }
};

// 🆕 List all scheduled tests (for admin calendar)
export const listScheduledTests = async (req, res) => {
  try {
    console.log('📋 Fetching scheduled tests...');
    const { status, type } = req.query;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Build filter
    const filter = {};
    
    // Default to 'scheduled' and today/future if no status provided (student view)
    if (!status) {
      filter.status = 'scheduled';
      filter.exam_date = { $gte: currentDate };
    } else {
      filter.status = status;
    }
    
    if (type) filter.test_type = type;

    const tests = await ScheduledTest.find(filter).sort({ exam_date: 1 });

    console.log(`✅ Retrieved ${tests.length} scheduled tests`);
    res.status(200).json({
      success: true,
      tests: tests.map(test => ({
        id: test._id,
        test_id: test._id,
        test_name: test.test_name,
        testName: test.test_name,
        test_type: test.test_type,
        testType: test.test_type,
        exam_date: test.exam_date,
        date: test.exam_date,
        duration: test.duration,
        total_questions: test.total_questions,
        totalQuestions: test.total_questions,
        status: test.status
      }))
    });
  } catch (error) {
    console.error('❌ Error listing scheduled tests:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduled tests',
      error: error.message
    });
  }
};

// Get user info (email, roll number, purchased tests)
export const getUserInfo = async (req, res) => {
  try {
    const { email, rollNumber } = req.body;

    if (!email && !rollNumber) {
      return res.status(400).json({
        success: false,
        message: "Email or Roll Number required"
      });
    }

    // Find student in MongoDB
    let student;

    if (email) {
      student = await StudentPayment.findOne({ email: email.toLowerCase().trim() });
    } else {
      student = await StudentPayment.findOne({ roll_number: rollNumber });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get purchased tests
    const purchasedTestDocs = await PurchasedTest.find({
      email: student.email
    });

    res.status(200).json({
      success: true,
      email: student.email,
      rollNumber: student.roll_number,
      purchasedTests: purchasedTestDocs.map(t => t.test_id)
    });

  } catch (error) {
    console.error("getUserInfo Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Start test (verify student has access) - 🔐 NOW WITH SESSION RESUME & CROSS-DOMAIN COOKIES
export const startTest = async (req, res) => {
  try {
    const { rollNumber, email } = req.body;

    if (!email || !rollNumber) {
      return res.status(400).json({
        success: false,
        message: "Email and Roll Number required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRollNumber = rollNumber.trim().toUpperCase();

    // Find student in MongoDB
    const student = await StudentPayment.findOne({
      email: normalizedEmail,
      roll_number: normalizedRollNumber
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Invalid Roll Number or Email"
      });
    }

    // Get purchased tests
    const purchasedTestDocs = await PurchasedTest.find({
      email: normalizedEmail
    });

    const purchasedTests = purchasedTestDocs.map(t => t.test_id);

    // 🆕 SESSION RESUME/LOCK LOGIC
    // Check if there's an active session for this student
    // For now, we allow resume if the test is still ongoing (logic can be expanded per testId)
    const existingAttempt = await StudentAttempt.findOne({
        email: normalizedEmail,
        submitted_at: null // ⚡ Fix: Check for literal null
    }).sort({ started_at: -1 });

    let resumeData = null;
    if (existingAttempt) {
        resumeData = {
            testId: existingAttempt.test_id,
            startedAt: existingAttempt.started_at,
            message: "Existing session found. Resuming exam."
        };
    }

    // 🔐 GENERATE JWT TOKEN
    console.log(`🔐 Generating JWT for ${normalizedEmail} - Resume: ${!!resumeData}`);
    const authToken = generateAuthToken(
      normalizedEmail,
      student.roll_number,
      purchasedTests
    );

    // Set HTTP-only cookie (secure for cross-site auth across subdomains)
    res.cookie('auth_token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // 🔐 Enforced 'none' for robust cross-subdomain sharing
      domain: '.vigyanprep.com', // 🌐 Cross-subdomain sharing
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    console.log('✅ JWT token generated and cross-domain cookie set');

    // Return with session info
    res.status(200).json({
      success: true,
      token: authToken, // 🔐 Added for client-side fallback/header-based auth
      purchasedTests: purchasedTests,
      rollNumber: student.roll_number,
      email: normalizedEmail,
      resume: !!resumeData,
      resumeData: resumeData,
      message: resumeData ? "Resuming active session" : "Login successful"
    });

  } catch (error) {
    console.error("startTest Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Submit exam
export const submitExam = async (req, res) => {
  try {
    const { email, rollNumber, testId, testName, userResponses, timeTaken, startedAt } = req.body;

    // Validate required fields
    if (!email || !testId || !userResponses || !Array.isArray(userResponses)) {
      return res.status(400).json({
        success: false,
        message: "Email, testId, and userResponses (array) are required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get student roll number if not provided
    let finalRollNumber = rollNumber;

    if (!finalRollNumber) {
      const student = await StudentPayment.findOne({
        email: normalizedEmail
      });

      if (student) {
        finalRollNumber = student.roll_number;
      } else {
        finalRollNumber = "N/A";
      }
    }

    // Calculate results
    const totalQuestions = userResponses.length;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;

    // Get correct answers from questions collection
    const questions = await QuestionModel.find({
      testId: testId,
      status: 'approved'
    }).sort({ questionNumber: 1 });

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for this test"
      });
    }

    // Create a map for easier lookup by _id
    const questionsMap = {};
    questions.forEach(q => {
      questionsMap[q._id.toString()] = q;
    });

    const questionWiseResults = [];
    let totalScore = 0;

    // Support both legacy array of answers and new array of {questionId, answer}
    userResponses.forEach((resp, index) => {
      let qId, userAnswer;

      if (typeof resp === 'object' && resp !== null && resp.questionId) {
        qId = resp.questionId;
        userAnswer = resp.answer;
      } else {
        // Fallback to index-based mapping (legacy)
        const qAtIdx = questions[index];
        if (!qAtIdx) return;
        qId = qAtIdx._id.toString();
        userAnswer = resp;
      }

      const q = questionsMap[qId];
      if (!q) return;

      const result = evaluateQuestionScore(q, userAnswer);

      if (result.status === 'unanswered') unanswered++;
      else if (result.isCorrect) correctAnswers++;
      else wrongAnswers++;

      totalScore += result.marks;
      questionWiseResults.push({
        questionId: qId,
        questionNumber: q.questionNumber,
        userAnswer,
        correctAnswer: result.correctAnswerText,
        isCorrect: result.isCorrect,
        status: result.status,
        marks: result.marks,
        section: q.section
      });
    });

    const score = totalScore;
    // Calculate percentage based on max possible score
    const maxScore = questions.reduce((acc, q) => acc + (q.marksPositive || 1), 0);
    const percentage = maxScore > 0 ? Math.max(0, (totalScore / maxScore) * 100) : 0;

    // Save to student_attempts collection
    const attempt = await StudentAttempt.create({
      email: normalizedEmail,
      roll_number: finalRollNumber,
      test_id: testId,
      test_name: testName || testId,
      total_questions: totalQuestions,
      attempted_questions: totalQuestions - unanswered,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      unanswered: unanswered,
      score: score,
      percentage: parseFloat(percentage.toFixed(2)),
      time_taken: timeTaken || 0,
      answers: userResponses,
      question_wise_results: questionWiseResults,
      started_at: startedAt || new Date(),
      submitted_at: new Date()
    });

    res.status(200).json({
      success: true,
      message: "Exam Saved Successfully",
      results: {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unanswered,
        score,
        percentage: percentage.toFixed(2)
      }
    });

  } catch (error) {
    console.error("submitExam Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get questions for a specific test - 🔒 NOW USES AUTHENTICATED USER
export const getQuestions = async (req, res) => {
  try {
    // testId already validated by verifyTestAccess middleware
    const testId = req.testId || req.query.testId;

    if (!testId) {
      return res.status(400).json({
        success: false,
        message: "Test ID required"
      });
    }

    console.log(`📚 Loading questions for ${testId} - User: ${req.user?.email || 'Unknown'}`);

    // Get questions from MongoDB
    const questions = await QuestionModel.find({
      testId: testId,
      status: 'approved'
    }).sort({ questionNumber: 1 });

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for this test"
      });
    }

    // Format response (remove correct answers for security)
    const formattedQuestions = questions.map(q => ({
      id: q._id,
      questionNumber: q.questionNumber,
      question: q.questionText || "",
      options: Array.isArray(q.options) ? q.options : [],
      subject: q.section || "",
      imageUrl: q.imageUrl || "",
      marksPositive: q.marksPositive,
      marksNegative: q.marksNegative,
      questionType: q.questionType || 'MCQ'
    }));
    // ⚠️ correctAnswer NOT sent to client for security

    res.status(200).json({
      success: true,
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length
    });

  } catch (error) {
    console.error("getQuestions Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔒 Verify test access and check for active session
export const verifyAccess = async (req, res) => {
  try {
    // req.user and req.testId are populated by verifyAuth and verifyTestAccess middlewares
    const { email } = req.user;
    const testId = req.testId.toUpperCase(); // Ensure uppercase for DB query

    console.log(`🔍 verifyAccess: Checking session for ${email} on test ${testId}`);

    // Check for an active session (not submitted) for THIS specific test
    const activeAttempt = await StudentAttempt.findOne({
      email: email,
      test_id: testId,
      submitted_at: null // ⚡ Using literal null as per user requirement
    }).sort({ started_at: -1 });

    const resume = !!activeAttempt;
    const resumeData = resume ? {
      testId: activeAttempt.test_id,
      startedAt: activeAttempt.started_at
    } : null;

    console.log(`✅ verifyAccess: Allowed: true, Resume: ${resume}`);

    res.status(200).json({
      success: true,
      allowed: true,
      resume: resume,
      testId: testId,
      resumeData: resumeData
    });

  } catch (error) {
    console.error("❌ verifyAccess Error:", error.message);
    res.status(500).json({
      success: false,
      allowed: false,
      message: "Internal server error during access verification"
    });
  }
};

// Get student results/attempts
export const getStudentResults = async (req, res) => {
  try {
    const { email, rollNumber } = req.query;

    if (!email && !rollNumber) {
      return res.status(400).json({
        success: false,
        message: "Email or Roll Number required"
      });
    }

    let query = {};

    if (email) {
      query = { email: email.toLowerCase().trim() };
    } else {
      query = { roll_number: rollNumber };
    }

    const attempts = await StudentAttempt.find(query).sort({ submitted_at: -1 });

    // Format response
    const formattedAttempts = attempts.map(attempt => ({
      ...attempt.toObject(),
      answers: Array.isArray(attempt.answers) ? attempt.answers : safeJsonParse(attempt.answers, []),
      question_wise_results: Array.isArray(attempt.question_wise_results) ? attempt.question_wise_results : safeJsonParse(attempt.question_wise_results, [])
    }));

    res.status(200).json({
      success: true,
      attempts: formattedAttempts
    });

  } catch (error) {
    console.error("getStudentResults Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🆕 Get all active test series for public display
export const getPublicTestSeries = async (req, res) => {
  try {
    const tests = await TestSeries.find({ isActive: true }, 'testId name price description').sort({ name: 1 });
    res.status(200).json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('getPublicTestSeries Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch test series' });
  }
};
