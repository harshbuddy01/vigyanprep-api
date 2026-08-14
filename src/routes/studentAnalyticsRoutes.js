import express from 'express';
import { getStudentPerformance } from '../controllers/studentAnalyticsController.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();
router.get('/performance', verifyAuth, getStudentPerformance);

export default router;
