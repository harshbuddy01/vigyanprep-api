import express from 'express';
import { getStudentResult, updateResultStages, calculateTestRanks, releaseResults } from '../controllers/stagedResultController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.get('/attempt/:attemptId', verifyAuth, getStudentResult);
router.post('/admin/test/:testId/stages', verifyAdminAuth, updateResultStages);
router.post('/admin/test/:testId/calculate-ranks', verifyAdminAuth, calculateTestRanks);

// Clean routes for admin UI buttons
router.post('/calculate/:testId', verifyAdminAuth, calculateTestRanks);
router.post('/release/:testId', verifyAdminAuth, releaseResults);

export default router;
