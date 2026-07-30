import express from 'express';
import Student from '../models/Student.js';
import { StudentAttempt } from '../models/StudentAttempt.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { StudentPayment } from '../models/StudentPayment.js'; // 🔒 NEW: Import for cleanup
import { PurchasedTest } from '../models/PurchasedTest.js'; // 🔒 NEW: Import for cleanup
import { EmailLog } from '../models/EmailLog.js'; // 🔒 NEW: Import for cleanup
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// ✅ SECURITY FIX: Protect ALL student data routes
// Apply authentication middleware to all routes in this file
router.use(verifyAdminAuth);

// ==================== GET ALL STUDENTS ====================
// GET /api/admin/students?search=xyz
router.get('/', async (req, res) => {
    try {
        const { search = '' } = req.query;

        console.log(`👥 [STUDENTS] Fetching students... Search: "${search}"`);

        let query = {};

        if (search) {
            query = {
                $or: [
                    { email: { $regex: search, $options: 'i' } },
                    { fullName: { $regex: search, $options: 'i' } },
                    { rollNumber: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const students = await Student.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        // Get additional stats for each student
        const studentsWithStats = await Promise.all(
            students.map(async (student) => {
                const testsAttempted = await StudentAttempt.countDocuments({
                    email: student.email
                });

                const payments = await PaymentTransaction.find({
                    email: student.email,
                    status: 'paid'
                });

                // 📚 Aggregate all purchased tests for the "Course" column
                const purchasedTests = await PurchasedTest.find({ email: student.email });
                const courseList = purchasedTests.length > 0 
                    ? purchasedTests.map(t => t.test_id.toUpperCase()).join(', ')
                    : (student.course || 'IAT');

                const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

                return {
                    id: student._id,
                    email: student.email,
                    name: student.fullName || 'N/A', // Frontend expects 'name'
                    rollNumber: student.rollNumber || 'N/A',
                    course: courseList, // Shows "IAT, NEST" etc.
                    testsAttempted,
                    totalPaid: totalPaid / 100,
                    lastLogin: student.lastLoginAt,
                    joinDate: new Date(student.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    }), // Frontend expects 'joinDate' formatted
                    status: 'active'
                };
            })
        );

        console.log(`✅ [STUDENTS] Found ${studentsWithStats.length} students`);

        res.json({
            success: true,
            students: studentsWithStats,
            total: studentsWithStats.length
        });
    } catch (error) {
        console.error('❌ [STUDENTS] Error fetching students:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET SINGLE STUDENT ====================
// GET /api/admin/students/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`👤 [STUDENTS] Fetching student: ${id}`);

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Get attempts
        const attempts = await StudentAttempt.find({ email: student.email })
            .sort({ submitted_at: -1 })
            .limit(10);

        // Get payments
        const payments = await PaymentTransaction.find({
            email: student.email
        }).sort({ created_at: -1 });

        res.json({
            success: true,
            student: {
                id: student._id,
                email: student.email,
                fullName: student.fullName,
                rollNumber: student.rollNumber,
                createdAt: student.createdAt,
                lastLoginAt: student.lastLoginAt,
                attempts,
                payments
            }
        });
    } catch (error) {
        console.error('❌ [STUDENTS] Error fetching student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ADD NEW STUDENT ====================
// POST /api/admin/students
router.post('/', async (req, res) => {
    try {
        const { email, fullName, rollNumber } = req.body;

        console.log(`➕ [STUDENTS] Adding new student: ${email}`);

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({
                success: false,
                error: 'Student with this email already exists'
            });
        }

        const newStudent = new Student({
            email,
            fullName: fullName || null,
            rollNumber: rollNumber || null
        });

        await newStudent.save();

        console.log(`✅ [STUDENTS] Student added: ${newStudent._id}`);

        res.status(201).json({
            success: true,
            message: 'Student added successfully',
            student: {
                id: newStudent._id,
                email: newStudent.email,
                fullName: newStudent.fullName,
                rollNumber: newStudent.rollNumber
            }
        });
    } catch (error) {
        console.error('❌ [STUDENTS] Error adding student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UPDATE STUDENT ====================
// PUT /api/admin/students/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, fullName, rollNumber } = req.body;

        console.log(`✏️ [STUDENTS] Updating student: ${id}`);

        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            { email, fullName, rollNumber },
            { new: true, runValidators: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        console.log(`✅ [STUDENTS] Student updated: ${id}`);

        res.json({
            success: true,
            message: 'Student updated successfully',
            student: updatedStudent
        });
    } catch (error) {
        console.error('❌ [STUDENTS] Error updating student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DELETE STUDENT ====================
// DELETE /api/admin/students/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🗑️ [STUDENTS] Deleting student: ${id}`);

        const deletedStudent = await Student.findByIdAndDelete(id);

        if (!deletedStudent) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Also delete ALL related data across various collections
        await Promise.all([
            StudentAttempt.deleteMany({ email: deletedStudent.email }),
            PurchasedTest.deleteMany({ email: deletedStudent.email }),
            StudentPayment.deleteMany({ email: deletedStudent.email }),
            PaymentTransaction.deleteMany({ email: deletedStudent.email }),
            EmailLog.deleteMany({ email: deletedStudent.email })
        ]);

        console.log(`✅ [STUDENTS] Student and all related records deleted: ${id} (${deletedStudent.email})`);

        res.json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (error) {
        console.error('❌ [STUDENTS] Error deleting student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET STUDENT RESULTS ====================
// GET /api/admin/students/:id/results
router.get('/:id/results', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📊 [STUDENTS] Fetching results for student: ${id}`);

        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        const attempts = await StudentAttempt.find({ email: student.email })
            .sort({ submitted_at: -1 });

        res.json({
            success: true,
            results: attempts
        });
    } catch (error) {
        console.error('❌ [STUDENTS] Error fetching results:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

console.log('✅ Student routes loaded');

export default router;
