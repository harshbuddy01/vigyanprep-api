// backend/routes/trialRoutes.js
// 🌟 VIP Demo Pass & Trial Management Routes

import express from 'express';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';
import {
  createTrialAccount,
  listTrialAccounts,
  extendTrialAccount,
  revokeTrialAccount,
  getStudentTrialStatus
} from '../controllers/trialController.js';

const router = express.Router();

// Admin Endpoints (Strictly Protected by verifyAdminAuth)
router.post('/admin/trial/create', verifyAdminAuth, createTrialAccount);
router.get('/admin/trial/list', verifyAdminAuth, listTrialAccounts);
router.post('/admin/trial/extend/:id', verifyAdminAuth, extendTrialAccount);
router.post('/admin/trial/revoke/:id', verifyAdminAuth, revokeTrialAccount);

// Student Endpoint (Checks trial status & live countdown)
router.get('/student/trial-status', getStudentTrialStatus);

export default router;
