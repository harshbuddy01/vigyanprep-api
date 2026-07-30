import express from 'express';
// DISABLED FOR MONGODB: import { pool } from '../config/mysql.js';
import QuestionModel from '../schemas/QuestionSchema.js';
import { QuestionService } from '../services/QuestionService.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// ✅ SECURITY FIX: Protect ALL admin question routes
// Apply authentication middleware to all routes in this file
router.use(verifyAdminAuth);

// Initialize OOP service
const questionService = new QuestionService();

// =============================================================================
// 🎯 NEW UNIFIED API - ADMIN TO STUDENT FLOW
// =============================================================================

/**
 * POST /api/admin/questions
 * 
 * Admin uploads question → Backend saves to MongoDB → Student fetches
 * 
 * Expected payload:
 * {
 *   testId: "IISER_2025" | "ISI_2025_A" | "NEST_2025",
 *   examType: "IISER" | "ISI" | "NEST",
 *   year: "2025",
 *   paperType: "A" | "B" | null,
 *   questionNumber: 1,
 *   questionText: "Question text here...",
 *   options: ["Option A", "Option B", "Option C", "Option D"],
 *   correctAnswer: "A" | "B" | "C" | "D",
 *   section: "Physics" | "Chemistry" | "Mathematics" | "Biology",
 *   marks: 4,
 *   difficulty: "Easy" | "Medium" | "Hard",
 *   topic: "Mechanics" (optional),
 *   explanation: "Solution explanation" (optional)
 * }
 */
router.post('/questions', async (req, res) => {
    try {
        console.log('📥 [ADMIN] Receiving new question...');
        const {
            testId,
            questionNumber,
            questionText,
            options,
            correctAnswer,
            section,
            marksPositive,
            marksNegative,
            difficulty,
            topic,
            explanation,
            questionType,
            imageUrl,
            status
        } = req.body;

        // ===== VALIDATION =====
        const qType = questionType;
        if (!testId || !section || !questionText || !qType) {
            return res.status(400).json({ success: false, error: 'testId, section, questionText, and questionType are required' });
        }

        if ((qType === 'MCQ' || qType === 'TrueFalse' || qType === 'MSQ') && (!correctAnswer || (Array.isArray(correctAnswer) && correctAnswer.length === 0))) {
            return res.status(400).json({ success: false, error: 'Correct Answer is required for this question type' });
        }

        // ===== AUTO-MAP MCQ OPTION INDEX =====
        let correctOptionIndex = req.body.correctOptionIndex;
        if (correctOptionIndex === undefined && (qType === 'MCQ' || qType === 'TrueFalse') && typeof correctAnswer === 'string') {
            const mapping = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            correctOptionIndex = mapping[correctAnswer.toUpperCase()];
        }
        
        // Ensure MSQ doesn't have a single correct index
        if (qType === 'MSQ') {
            correctOptionIndex = null;
        }

        // ===== AUTO-NUMBERING =====
        let finalQuestionNumber = questionNumber;
        if (!finalQuestionNumber || finalQuestionNumber === 0) {
            const lastQuestion = await QuestionModel.findOne({ testId, section }).sort({ questionNumber: -1 });
            finalQuestionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;
        }

        const newQuestion = new QuestionModel({
            testId,
            questionNumber: finalQuestionNumber,
            questionText,
            options: Array.isArray(options) ? options : [],
            correctAnswer,
            correctOptionIndex,
            correctNumericAnswer: req.body.correctNumericAnswer,
            numericTolerance: req.body.numericTolerance || 0,
            modelAnswer: req.body.modelAnswer || '',
            section,
            topic: topic || 'General',
            difficulty: difficulty || 'Medium',
            marksPositive: marksPositive || 4,
            marksNegative: marksNegative || -1,
            questionType: qType,
            imageUrl,
            status: status || 'approved'
        });

        const savedQuestion = await newQuestion.save();

        res.status(201).json({
            success: true,
            id: savedQuestion._id,
            questionNumber: finalQuestionNumber
        });

    } catch (error) {
        console.error('❌ [ADMIN] Error adding question:', error);
        
        // Provide cleaner validation error messages
        let errorMessage = error.message;
        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
        }
        
        res.status(400).json({ success: false, error: errorMessage });
    }
});

// 🎓 STUDENT-FACING API DELETED HERE (USE examRoutes.js)
// router.get('/exam/questions', ...)

/**
 * POST /api/admin/questions/draft
 * Creates a minimal draft question to provide an instant ID
 */
router.post('/questions/draft', async (req, res) => {
    try {
        const { testId, section, questionType } = req.body;

        if (!testId || !section || !questionType) {
            return res.status(400).json({ success: false, error: 'testId, section, and questionType are required' });
        }

        const draft = new QuestionModel({
            testId,
            section,
            questionType,
            status: 'draft',
            questionNumber: 0 // Placeholder
        });

        const savedDraft = await draft.save();

        res.status(201).json({
            success: true,
            id: savedDraft._id,
            message: 'Draft created successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// REFACTORED ROUTES (MongoDB versions)
// =============================================================================

// GET all questions with better error handling
router.get('/questions', async (req, res) => {
    try {
        console.log('🔍 [QUESTIONS] Fetching questions from database...');

        const section = req.query.section || '';
        const difficulty = req.query.difficulty || '';
        const search = req.query.search || '';

        let filter = {};

        if (section) {
            filter.section = section;
        }
        if (difficulty) {
            filter.difficulty = difficulty;
        }
        if (search) {
            filter.$or = [
                { questionText: { $regex: search, $options: 'i' } },
                { testId: { $regex: search, $options: 'i' } }
            ];
        }

        const questions = await QuestionModel.find(filter)
            .sort({ _id: -1 })
            .limit(100);

        console.log(`📊 [QUESTIONS] Found ${questions.length} questions`);

        const formattedQuestions = questions.map((q) => {
            return {
                id: q._id,
                section: q.section || 'Physics',
                topic: q.topic || 'General',
                difficulty: q.difficulty || 'Medium',
                marksPositive: q.marksPositive,
                marksNegative: q.marksNegative,
                question: q.questionText || '',
                type: q.questionType || 'MCQ',
                status: q.status || 'approved',
                options: q.options || [],
                answer: q.correctAnswer || '',
                correctOptionIndex: q.correctOptionIndex,
                testId: q.testId || 'UNKNOWN',
                imageUrl: q.imageUrl || ''
            };
        });

        console.log(`✅ [QUESTIONS] Returning ${formattedQuestions.length} questions`);
        res.json({ questions: formattedQuestions });

    } catch (error) {
        console.error('❌ [QUESTIONS] Error fetching questions:', error);
        res.status(500).json({
            questions: [],
            error: error.message,
            message: 'Failed to fetch questions. Please check server logs.'
        });
    }
});

// GET single question by ID
router.get('/questions/:id', async (req, res) => {
    try {
        console.log(`🔍 [QUESTIONS] Fetching single question ${req.params.id}`);

        const question = await QuestionModel.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        res.json({
            success: true,
            question: {
                id: question._id,
                testId: question.testId,
                questionNumber: question.questionNumber,
                questionText: question.questionText,
                options: question.options || [],
                correctAnswer: question.correctAnswer,
                section: question.section,
                topic: question.topic,
                difficulty: question.difficulty,
                marksPositive: question.marksPositive,
                marksNegative: question.marksNegative,
                imageUrl: question.imageUrl,
                status: question.status,
                questionType: question.questionType
            }
        });

    } catch (error) {
        console.error(`❌ [QUESTIONS] Error fetching question ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT update question
router.put('/questions/:id', async (req, res) => {
    try {
        console.log(`✏️ [QUESTIONS] Updating question ${req.params.id}`);

        const {
            questionText,
            options,
            correctAnswer,
            section,
            marksPositive,
            marksNegative,
            imageUrl,
            questionType,
            status
        } = req.body;

        const updateData = {
            questionText,
            options,
            correctAnswer,
            section,
            marksPositive,
            marksNegative,
            imageUrl,
            questionType,
            status
        };

        // Re-map correctOptionIndex if necessary
        const qType = questionType || (await QuestionModel.findById(req.params.id))?.questionType || 'MCQ';
        if ((qType === 'MCQ' || qType === 'TrueFalse') && correctAnswer && options) {
            const mapping = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const index = mapping[correctAnswer.toUpperCase()];
            if (index !== undefined) {
                updateData.correctOptionIndex = index;
            }
        }

        const updatedQuestion = await QuestionModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        console.log(`✅ [QUESTIONS] Question ${req.params.id} updated`);

        res.json({
            success: true,
            question: updatedQuestion
        });

    } catch (error) {
        console.error(`❌ [QUESTIONS] Error updating question ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE question
router.delete('/questions/:id', async (req, res) => {
    try {
        console.log(`🗑️ [QUESTIONS] Deleting question ${req.params.id}`);

        const deletedQuestion = await QuestionModel.findByIdAndDelete(req.params.id);

        if (!deletedQuestion) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }

        console.log(`✅ [QUESTIONS] Question ${req.params.id} deleted`);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });

    } catch (error) {
        console.error(`❌ [QUESTIONS] Error deleting question ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// OOP ROUTES (For testing and gradual migration)
// =============================================================================

// GET all questions with OOP
router.get('/questions-v2', async (req, res) => {
    try {
        console.log('🆕 [QUESTIONS-OOP] Fetching questions with OOP service...');

        const filters = {
            section: req.query.section || req.query.subject,
            difficulty: req.query.difficulty,
            search: req.query.search,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const result = await questionService.getAllQuestions(filters);

        console.log(`✅ [QUESTIONS-OOP] Returning ${result.count} questions`);
        res.json(result);

    } catch (error) {
        console.error('❌ [QUESTIONS-OOP] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            questions: []
        });
    }
});

// ===================================
// 🔐 GATEWAY SIGNING (For Hostinger Uploads)
// ===================================
import crypto from 'crypto';

/**
 * GET /api/admin/gateway/sign-upload
 * Returns HMAC signature for Hostinger upload gateway
 */
router.get('/gateway/sign-upload', (req, res) => {
    try {
        const secret = process.env.UPLOAD_GATEWAY_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, error: 'Upload gateway secret not configured' });
        }

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');

        res.json({ success: true, timestamp, signature });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;