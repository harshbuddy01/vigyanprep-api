import express from 'express';
import { getMembers, addMember } from '../controllers/memberController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminAuth);

router.get('/', getMembers);
router.post('/', addMember);

export default router;
