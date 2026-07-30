import express from 'express';
import { getMembers, addMember } from '../controllers/memberController.js';

const router = express.Router();

router.get('/', getMembers);
router.post('/', addMember);

export default router;
