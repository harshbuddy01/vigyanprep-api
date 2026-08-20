// =============================================
// ADAPTIVE CHAPTER REVISION ROUTES
// Created: 2026-08-20
// =============================================

import { Router } from 'express';
import { verifyAuth } from '../middlewares/auth.js';
import {
  getChapters,
  generateTest,
  submitTest,
  getChapterMastery,
  getAttemptDetails
} from '../controllers/adaptiveController.js';

const router = Router();

// ─── PUBLIC (no auth needed) ────────────────────────────
// Get chapter list for an exam type
router.get('/chapters', getChapters);

// ─── AUTHENTICATED (student must be logged in) ──────────
// Generate an adaptive practice test
router.post('/generate-test', verifyAuth, generateTest);

// Submit test answers and get diagnosis
router.post('/submit-test', verifyAuth, submitTest);

// Get student's concept mastery data
router.get('/mastery', verifyAuth, getChapterMastery);

// Get full attempt details (for diagnosis page)
router.get('/attempt/:attemptId', verifyAuth, getAttemptDetails);

export default router;
