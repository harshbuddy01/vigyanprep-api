import express from 'express';
import Student from '../models/Student.js';
import { PurchasedTest } from '../models/PurchasedTest.js';
import { verifyAuth } from '../middlewares/auth.js';  // ✅ SECURITY FIX: Import auth middleware

const router = express.Router();

// ✅ NEW: GET /api/user/session - Fast session check for frontend
// Returns loggedIn: true if cookie is valid
router.get('/session', verifyAuth, async (req, res) => {
    try {
        const email = req.user.email;
        let student = await Student.findOne({ email: email.toLowerCase().trim() });

        if (!student) {
            const { StudentPayment } = await import('../models/StudentPayment.js');
            student = await StudentPayment.findOne({ email: email.toLowerCase().trim() });
        }
        
        if (!student) {
            return res.json({ loggedIn: false });
        }

        const purchases = await PurchasedTest.find({ email: student.email.toLowerCase().trim() });
        const purchasedTests = purchases.map(p => p.test_id);

        res.json({
            loggedIn: true,
            user: {
                email: student.email,
                rollNumber: student.rollNumber,
                fullName: student.fullName,
                purchasedTests: purchasedTests
            }
        });
    } catch (error) {
        res.status(500).json({ loggedIn: false });
    }
});

// ✅ SECURITY FIX (Issue #48): Added authentication to user routes
// GET /api/user/profile - Get user profile data
router.get('/profile', verifyAuth, async (req, res) => {
    try {
        const email = req.user.email;
        const normalizedEmail = email.toLowerCase().trim();

        let student = await Student.findOne({ email: normalizedEmail });

        if (!student) {
            const { StudentPayment } = await import('../models/StudentPayment.js');
            student = await StudentPayment.findOne({ email: normalizedEmail });
        }

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Get purchased tests
        const purchases = await PurchasedTest.find({ email: normalizedEmail });
        const purchasedTests = purchases.map(p => p.test_id);

        res.json({
            success: true,
            fullName: student.fullName || '',
            email: student.email,
            rollNumber: student.rollNumber || student.roll_number || 'N/A',
            purchasedTests: purchasedTests,
            course: student.course || 'IAT'
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// ✅ FIX: PUBLIC endpoint for pre-purchase verification
// No authentication required - used before payment to check duplicates
// GET /api/check-purchase/:testId?email=user@example.com
router.get('/check-purchase/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        const { email } = req.query;  // Get email from query parameter

        // Validate email parameter
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email parameter is required'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Email format validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const purchase = await PurchasedTest.findOne({
            email: normalizedEmail,
            test_id: testId
        });

        res.json({
            success: true,
            alreadyPurchased: !!purchase,
            purchaseDate: purchase?.purchased_at || null
        });

    } catch (error) {
        console.error('Error checking purchase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check purchase status'
        });
    }
});

export default router;
