import express from 'express';
import { startAttempt, autosaveAnswers, logProctorEvent, submitAttempt, getAttemptResult, getPaperSolutions } from '../controllers/examLifecycleController.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();
router.use(verifyAuth);

// Student-accessible routes (student JWT required)
router.post('/start/:testId', startAttempt);
router.post('/autosave/:attemptId', autosaveAnswers);
router.post('/proctor-log/:attemptId', logProctorEvent);
router.post('/submit/:attemptId', submitAttempt);
router.get('/result/:attemptId', getAttemptResult);
router.get('/solutions/:testId', getPaperSolutions);

export default router;
