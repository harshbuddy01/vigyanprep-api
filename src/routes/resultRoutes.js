import express from 'express';
import { StudentAttempt } from '../models/StudentAttempt.js'; // ✅ FIXED: Named import
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// ✅ SECURITY FIX: Protect ALL result routes
// Apply authentication middleware to all routes in this file
router.use(verifyAdminAuth);

// ==================== GET ALL RESULTS ====================
router.get('/', async (req, res) => {
    try {
        const { testId, search, page = 1, limit = 20 } = req.query;

        const query = {};
        if (testId) query.test_id = testId;
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { roll_number: { $regex: search, $options: 'i' } }
            ];
        }

        const results = await StudentAttempt.find(query)
            .sort({ submitted_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await StudentAttempt.countDocuments(query);

        res.json({
            success: true,
            results,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET SINGLE RESULT ====================
router.get('/:id', async (req, res) => {
    try {
        const result = await StudentAttempt.findById(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Result not found'
            });
        }

        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Get result error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== RESULT STATISTICS ====================
router.get('/stats/overview', async (req, res) => {
    try {
        const { testId } = req.query;
        const query = testId ? { test_id: testId } : {};

        const [stats] = await StudentAttempt.aggregate([
            { $match: query },
            {
                $facet: {
                    overall: [
                        {
                            $group: {
                                _id: null,
                                avgScore: { $avg: '$percentage' },
                                maxScore: { $max: '$score' },
                                minScore: { $min: '$score' },
                                totalAttempts: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        res.json({
            success: true,
            stats: stats.overall[0] || {
                avgScore: 0,
                maxScore: 0,
                minScore: 0,
                totalAttempts: 0
            }
        });
    } catch (error) {
        console.error('Result stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SCORE DISTRIBUTION ====================
router.get('/stats/distribution', async (req, res) => {
    try {
        const { testId } = req.query;
        const query = testId ? { test_id: testId } : {};

        const distribution = await StudentAttempt.aggregate([
            { $match: query },
            {
                $bucket: {
                    groupBy: '$percentage',
                    boundaries: [0, 25, 50, 75, 100, 101],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 },
                        students: { $push: '$email' }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            distribution
        });
    } catch (error) {
        console.error('Score distribution error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== TOP PERFORMERS ====================
router.get('/stats/top-performers', async (req, res) => {
    try {
        const { testId, limit = 10 } = req.query;
        const query = testId ? { test_id: testId } : {};

        const topPerformers = await StudentAttempt.find(query)
            .sort({ score: -1, submitted_at: 1 })
            .limit(parseInt(limit))
            .select('email roll_number score percentage test_name submitted_at');

        res.json({
            success: true,
            topPerformers
        });
    } catch (error) {
        console.error('Top performers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DELETE RESULT ====================
router.delete('/:id', async (req, res) => {
    try {
        const result = await StudentAttempt.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Result not found'
            });
        }

        res.json({
            success: true,
            message: 'Result deleted successfully'
        });
    } catch (error) {
        console.error('Delete result error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
