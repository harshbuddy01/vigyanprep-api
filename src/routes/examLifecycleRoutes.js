import express from 'express';
import { startAttempt, autosaveAnswers, logProctorEvent, submitAttempt, getAttemptResult, getPaperSolutions } from '../controllers/examLifecycleController.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();

// Result & Solutions endpoints (lifecycle controller handles public vs secret state)
router.get('/result/:attemptId', getAttemptResult);
router.get('/solutions/:testId', getPaperSolutions);

// Protected exam runtime routes (student JWT strictly required)
router.use(verifyAuth);

router.post('/start/:testId', startAttempt);
router.post('/autosave/:attemptId', autosaveAnswers);
router.post('/proctor-log/:attemptId', logProctorEvent);
router.post('/submit/:attemptId', submitAttempt);

export default router;
