import express from 'express';
import {
  // Admin dashboard
  getDashboardStats,
  getAdminProfile,
  getNotifications,
  getNotificationsCount,
  // Scheduled tests
  getScheduledTests,
  getPastTests, // ✅ Added past tests
  createScheduledTest,
  getTestDetails,
  updateTestStatus,
  deleteTest,
  getAvailableTests // keep if needed by other things, but let's check
} from '../controllers/adminController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// ✅ SECURITY FIX: Protect ALL admin routes
router.use(verifyAdminAuth);

// ========== DASHBOARD ENDPOINTS ==========
router.get('/stats', getDashboardStats);
router.get('/profile', getAdminProfile);
router.get('/notifications', getNotifications);
router.get('/notifications-count', getNotificationsCount);

// ========== SCHEDULED TESTS ENDPOINTS ==========
router.post('/tests', createScheduledTest);        // ✅ FIXED: POST /api/admin/tests
router.get('/scheduled-tests', getScheduledTests);  // ✅ Get all scheduled tests
// router.get('/tests', getScheduledTests);            // ❌ REMOVED: Conflicts with adminTestPricingRoutes
router.get('/past-tests', getPastTests);            // ✅ Get past tests (Fixes 404)
router.get('/tests/:testId', getTestDetails);      // ✅ Get specific test
router.put('/tests/:testId', updateTestStatus);    // ✅ FIXED: PUT /api/admin/tests/:id
router.delete('/tests/:testId', deleteTest);       // ✅ FIXED: DELETE /api/admin/tests/:id

export default router;
