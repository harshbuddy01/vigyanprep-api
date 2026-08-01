import express from 'express';
import { uploadAndParsePdf } from '../controllers/adminPyqController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.post('/upload', uploadAndParsePdf);

export default router;
