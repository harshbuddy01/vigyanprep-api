import express from 'express';
import { submitPreviewAttempt, checkFreezeEligibility } from '../controllers/previewModeController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.post('/submit', submitPreviewAttempt);
router.get('/freeze-eligibility/:testId', checkFreezeEligibility);

export default router;
