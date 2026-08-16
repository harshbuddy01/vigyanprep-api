import express from 'express';
import { submitQuestionReport, resolveQuestionReport } from '../controllers/questionReportController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.replace('Bearer ', '').trim().length > 10) {
    return verifyAuth(req, res, (err) => {
      // If token expired or guest, still proceed to next
      next();
    });
  }
  next();
};

router.post('/submit', optionalAuth, submitQuestionReport);
router.put('/resolve/:reportId', verifyAdminAuth, resolveQuestionReport);

export default router;
