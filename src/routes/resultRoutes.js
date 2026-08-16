import express from 'express';
import {
  getStudentResult,
  updateResultStages,
  calculateTestRanks,
  releaseResults,
  getTestAttemptsForAdmin,
  getAttemptDetailForAdmin,
  getMeritListForAdmin
} from '../controllers/stagedResultController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.get('/attempt/:attemptId', verifyAuth, getStudentResult);
router.post('/admin/test/:testId/stages', verifyAdminAuth, updateResultStages);
router.post('/admin/test/:testId/calculate-ranks', verifyAdminAuth, calculateTestRanks);

// Clean routes for admin UI buttons
router.post('/calculate/:testId', verifyAdminAuth, calculateTestRanks);
router.post('/release/:testId', verifyAdminAuth, releaseResults);

// Live student attempt inspection for Admin
router.get('/attempts/:testId', verifyAdminAuth, getTestAttemptsForAdmin);
router.get('/admin/attempts/:testId', verifyAdminAuth, getTestAttemptsForAdmin);
router.get('/attempt-detail/:attemptId', verifyAdminAuth, getAttemptDetailForAdmin);
router.get('/admin/attempt-detail/:attemptId', verifyAdminAuth, getAttemptDetailForAdmin);

// Merit list endpoint for Admin
router.get('/merit-list/:testId', verifyAdminAuth, getMeritListForAdmin);
router.get('/admin/merit-list/:testId', verifyAdminAuth, getMeritListForAdmin);

export default router;
