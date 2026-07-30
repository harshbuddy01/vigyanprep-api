import express from 'express';
import {
    getUpcomingTests,
    getQuestionsBySubject,
    getTestQuestions,
    addQuestionsToTest,
    removeQuestionsFromTest,
    getTestPreview,
    finalizeTest,
    deleteTest,
    rescheduleTest
} from '../controllers/adminTestController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminAuth);

router.get('/tests/upcoming', getUpcomingTests);
router.get('/questions/by-subject/:subject', getQuestionsBySubject);
router.get('/tests/:testId/questions', getTestQuestions);
router.post('/tests/:testId/questions', addQuestionsToTest);
router.delete('/tests/:testId/questions', removeQuestionsFromTest);
router.get('/tests/:testId/preview', getTestPreview);
router.post('/tests/:testId/finalize', finalizeTest);
router.delete('/tests/:testId', deleteTest);
router.put('/tests/:testId/reschedule', rescheduleTest);

export default router;
