import express from 'express';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';
import {
    getUpcomingTests,
    getQuestionsBySubject,
    getTestQuestions,
    addQuestionsToTest,
    finalizeTest,
    removeQuestionsFromTest,
    deleteTest,
    rescheduleTest,
    getTestPreview
} from '../controllers/adminTestController.js';

const router = express.Router();

// Protect all routes
router.use(verifyAdminAuth);

// Tests
router.get('/tests/upcoming', getUpcomingTests);
router.delete('/tests/:testId', deleteTest);

// Questions by subject (for question pool)
router.get('/questions/by-subject/:subject', getQuestionsBySubject);

// Test-Question management
router.get('/tests/:testId/questions', getTestQuestions);
router.post('/tests/:testId/questions', addQuestionsToTest);
router.delete('/tests/:testId/questions', removeQuestionsFromTest);

// Preview & Finalize
router.get('/tests/:testId/preview', getTestPreview);
router.post('/tests/:testId/finalize', finalizeTest);
router.post('/tests/:testId/reschedule', rescheduleTest);

export default router;
