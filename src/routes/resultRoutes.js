import express from 'express';
import { getStudentResult, updateResultStages, calculateTestRanks } from '../controllers/stagedResultController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.get('/attempt/:attemptId', verifyAuth, getStudentResult);
router.post('/admin/test/:testId/stages', verifyAdminAuth, updateResultStages);
router.post('/admin/test/:testId/calculate-ranks', verifyAdminAuth, calculateTestRanks);

export default router;
