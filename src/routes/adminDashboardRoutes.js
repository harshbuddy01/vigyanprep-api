import express from 'express';
import Student from '../models/Student.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js'; // ✅ FIXED: Named import
import { StudentAttempt } from '../models/StudentAttempt.js'; // ✅ FIXED: Named import
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// ✅ SECURITY FIX: Protect ALL admin dashboard routes
router.use(verifyAdminAuth);

// ==================== DASHBOARD STATS ====================
router.get('/stats', async (req, res) => {
    try {
        const [totalStudents, totalRevenue, totalTests] = await Promise.all([
            Student.countDocuments(),
            PaymentTransaction.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            StudentAttempt.distinct('test_id')
        ]);

        res.json({
            success: true,
            stats: {
                totalStudents,
                totalRevenue: totalRevenue[0]?.total || 0,
                totalTests: totalTests.length,
                activeTests: totalTests.length // Placeholder
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PERFORMANCE DATA ====================
router.get('/performance', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        const days = parseInt(period.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const performanceData = await StudentAttempt.aggregate([
            { $match: { submitted_at: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$submitted_at' } },
                    avgScore: { $avg: '$percentage' },
                    totalAttempts: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: performanceData.map(item => ({
                date: item._id,
                avgScore: Math.round(item.avgScore * 100) / 100,
                attempts: item.totalAttempts
            }))
        });
    } catch (error) {
        console.error('Performance data error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UPCOMING TESTS ====================
router.get('/upcoming-tests', async (req, res) => {
    try {
        // Placeholder - replace with actual test scheduling logic
        res.json({
            success: true,
            tests: []
        });
    } catch (error) {
        console.error('Upcoming tests error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== RECENT ACTIVITY ====================
// ✅ Added /activity alias for API documentation compatibility
router.get('/activity', async (req, res) => {
    try {
        const recentAttempts = await StudentAttempt.find()
            .sort({ submitted_at: -1 })
            .limit(10)
            .select('email test_name score submitted_at');

        res.json({
            success: true,
            activities: recentAttempts.map(attempt => ({
                id: attempt._id,
                email: attempt.email,
                testName: attempt.test_name,
                score: attempt.score,
                timestamp: attempt.submitted_at
            }))
        });
    } catch (error) {
        console.error('Dashboard activity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/recent-activity', async (req, res) => {
    try {
        const recentAttempts = await StudentAttempt.find()
            .sort({ submitted_at: -1 })
            .limit(10)
            .select('email test_name score submitted_at');

        res.json({
            success: true,
            activities: recentAttempts.map(attempt => ({
                id: attempt._id,
                email: attempt.email,
                testName: attempt.test_name,
                score: attempt.score,
                timestamp: attempt.submitted_at
            }))
        });
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ADMIN PROFILE ====================
router.get('/profile', async (req, res) => {
    try {
        // Return admin profile data
        res.json({
            success: true,
            profile: {
                name: 'Admin User',
                email: 'admin@vigyanprep.com',
                role: 'Super Admin',
                avatar: null
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== NOTIFICATIONS ====================
router.get('/notifications', async (req, res) => {
    try {
        // Placeholder notifications
        res.json({
            success: true,
            notifications: []
        });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/notifications/count', async (req, res) => {
    try {
        res.json({
            success: true,
            count: 0
        });
    } catch (error) {
        console.error('Notification count error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/notifications/:id/read', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
