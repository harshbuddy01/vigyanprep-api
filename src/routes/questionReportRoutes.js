import express from 'express';
import { submitQuestionReport, resolveQuestionReport } from '../controllers/questionReportController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.post('/submit', verifyAuth, submitQuestionReport);
router.put('/resolve/:reportId', verifyAdminAuth, resolveQuestionReport);

export default router;
