import express from 'express';
import { startAttempt, autosaveAnswers, logProctorEvent, submitAttempt } from '../controllers/examLifecycleController.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();
router.use(verifyAuth);

router.post('/start/:testId', startAttempt);
router.post('/autosave/:attemptId', autosaveAnswers);
router.post('/proctor-log/:attemptId', logProctorEvent);
router.post('/submit/:attemptId', submitAttempt);

export default router;
