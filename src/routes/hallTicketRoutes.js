import express from 'express';
import { issueHallTicket, validateExamId } from '../controllers/hallTicketController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.post('/issue', verifyAdminAuth, issueHallTicket);
router.post('/validate', verifyAuth, validateExamId);

export default router;
