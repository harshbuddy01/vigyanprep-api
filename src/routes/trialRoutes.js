// backend/routes/trialRoutes.js
// 🌟 VIP Demo Pass & Trial Management Routes

import express from 'express';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';
import {
  createTrialAccount,
  listTrialAccounts,
  extendTrialAccount,
  revokeTrialAccount,
  getStudentTrialStatus,
  requestTrialAccount,
  approveTrialRequest,
  rejectTrialRequest
} from '../controllers/trialController.js';

const router = express.Router();

// Public Endpoints (No auth required)
router.post('/public/trial-request', requestTrialAccount);
router.post('/trial/request', requestTrialAccount);

// Student Endpoint (Checks trial status & live countdown)
router.get('/student/trial-status', getStudentTrialStatus);
router.get('/trial/status', getStudentTrialStatus);

// Admin Endpoints (Strictly Protected by verifyAdminAuth)
router.post('/admin/trial/create', verifyAdminAuth, createTrialAccount);
router.get('/admin/trial/list', verifyAdminAuth, listTrialAccounts);
router.post('/admin/trial/approve/:id', verifyAdminAuth, approveTrialRequest);
router.post('/admin/trial/reject/:id', verifyAdminAuth, rejectTrialRequest);
router.post('/admin/trial/extend/:id', verifyAdminAuth, extendTrialAccount);
router.post('/admin/trial/revoke/:id', verifyAdminAuth, revokeTrialAccount);

export default router;
