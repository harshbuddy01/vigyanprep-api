import express from 'express';
import {
  getQuestionBank,
  getQuestionBankStats,
  createQuestionInBank,
  updateQuestionInBank,
  deleteQuestionFromBank,
  importQuestionsToTest
} from '../controllers/questionBankController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

// 🏛️ Master Question Bank Routes
router.get('/bank', getQuestionBank);
router.get('/bank/stats', getQuestionBankStats);
router.post('/bank', createQuestionInBank);
router.put('/bank/:id', updateQuestionInBank);
router.delete('/bank/:id', deleteQuestionFromBank);
router.post('/bank/import-to-test', importQuestionsToTest);

// Legacy alias routes
router.get('/', getQuestionBank);
router.post('/', createQuestionInBank);

export default router;