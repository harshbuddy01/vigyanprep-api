import express from 'express';
import { adminAuth } from '../middlewares/adminAuth.js';
import {
  getAllTestSeries,
  getTestSeriesById,
  updateTestSeriesPrice,
  getPriceHistory
} from '../controllers/testSeriesController.js';

const router = express.Router();

// 🔒 ALL ROUTES REQUIRE ADMIN AUTHENTICATION

// GET /api/admin/test-series - List all test series with prices
router.get('/', adminAuth, getAllTestSeries);

// GET /api/admin/test-series/:testId - Get specific test series
router.get('/:testId', adminAuth, getTestSeriesById);

// PATCH /api/admin/test-series/:testId/price - Update price (ADMIN ONLY)
router.patch('/:testId/price', adminAuth, updateTestSeriesPrice);

// GET /api/admin/test-series/:testId/price-history - Get price change audit trail
router.get('/:testId/price-history', adminAuth, getPriceHistory);

export default router;
