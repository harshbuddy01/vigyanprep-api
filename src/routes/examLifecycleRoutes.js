import express from 'express';
import { startAttempt, autosaveAnswers, logProctorEvent, submitAttempt, getAttemptResult, getPaperSolutions } from '../controllers/examLifecycleController.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();

// Public solutions route (internally checks if results are declared/released)
router.get('/solutions/:testId', getPaperSolutions);

// Protected routes (student JWT required)
router.use(verifyAuth);

router.post('/start/:testId', startAttempt);
router.post('/autosave/:attemptId', autosaveAnswers);
router.post('/proctor-log/:attemptId', logProctorEvent);
router.post('/submit/:attemptId', submitAttempt);
router.get('/result/:attemptId', getAttemptResult);

export default router;
