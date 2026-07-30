import { ScheduledTest } from '../models/ScheduledTest.js';
import Question from '../schemas/QuestionSchema.js';
import { TestQuestion } from '../models/TestQuestion.js';
import mongoose from 'mongoose';

// Get upcoming tests
export const getUpcomingTests = async (req, res) => {
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Start of today

        // Fetch tests that are in 'draft' or 'scheduled' status AND date is today or future
        const tests = await ScheduledTest.find({
            status: { $in: ['draft', 'scheduled'] },
            exam_date: { $gte: currentDate }
        })
            .sort({ exam_date: 1 })
            .lean();

        res.json({
            success: true,
            data: tests
        });
    } catch (error) {
        console.error('Error fetching upcoming tests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming tests',
            error: error.message
        });
    }
};

// Get questions by subject
export const getQuestionsBySubject = async (req, res) => {
    try {
        const { subject } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const validSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject'
            });
        }

        // Query against 'section' (per QuestionSchema.js) but mapped from 'subject' param
        const totalQuestions = await Question.countDocuments({ section: subject });

        const questions = await Question.find({ section: subject })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: {
                questions: questions.map(q => ({ ...q, subject: q.section })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalQuestions / limit),
                    totalQuestions: totalQuestions,
                    limit: limit
                }
            }
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch questions',
            error: error.message
        });
    }
};

// Get selected questions for a test
export const getTestQuestions = async (req, res) => {
    try {
        const { testId } = req.params;

        const testQuestions = await TestQuestion.find({ testId })
            .populate('questionId')
            .sort({ questionOrder: 1 })
            .lean();

        const questionsBySubject = {};
        let totalQuestions = 0;
        let totalMarks = 0;

        testQuestions.forEach(tq => {
            if (!tq.questionId) return; // Handle orphaned references

            if (!questionsBySubject[tq.subject]) {
                questionsBySubject[tq.subject] = [];
            }

            questionsBySubject[tq.subject].push({
                _id: tq.questionId._id,
                questionText: tq.questionId.questionText,
                questionType: tq.questionId.questionType,
                options: tq.questionId.options,
                questionOrder: tq.questionOrder,
                marks: tq.marks,
                negativeMarks: tq.negativeMarks,
                images: tq.questionId.images || []
            });

            totalQuestions++;
            totalMarks += tq.marks;
        });

        res.json({
            success: true,
            data: {
                testId,
                questionsBySubject,
                totalQuestions,
                totalMarks
            }
        });
    } catch (error) {
        console.error('Error fetching test questions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test questions',
            error: error.message
        });
    }
};

// Add questions to test
export const addQuestionsToTest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { testId } = req.params;
        const { questions } = req.body;

        if (!questions || !Array.isArray(questions)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Questions array is required'
            });
        }

        const test = await ScheduledTest.findById(testId).session(session);
        if (!test) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        if (test.isFinalized) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Cannot modify finalized test'
            });
        }

        // 2. Perform Bulk Write (Upsert new selections)
        const bulkOps = questions.map((q, idx) => ({
            updateOne: {
                filter: { 
                    testId: new mongoose.Types.ObjectId(testId), 
                    questionId: new mongoose.Types.ObjectId(q.questionId) 
                },
                update: {
                    $set: {
                        subject: q.subject,
                        questionOrder: q.questionOrder || (idx + 1),
                        marks: q.marks || 4,
                        negativeMarks: q.negativeMarks || 1,
                        addedBy: req.admin._id,
                        addedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await TestQuestion.bulkWrite(bulkOps, { session });
        }

        // 3. REMOVE questions that were NOT in the new list (Sync Mode)
        const questionIds = questions.map(q => new mongoose.Types.ObjectId(q.questionId));
        const deleteResult = await TestQuestion.deleteMany({
            testId: new mongoose.Types.ObjectId(testId),
            questionId: { $not: { $in: questionIds } }
        }, { session });

        console.log(`🧹 Sync: Removed ${deleteResult.deletedCount} unselected questions from test ${testId}`);

        // 4. Update Test Metadata (Total Questions)
        const stats = await TestQuestion.aggregate([
            { $match: { testId: new mongoose.Types.ObjectId(testId) } },
            {
                $group: {
                    _id: '$subject',
                    count: { $sum: 1 },
                    marks: { $sum: '$marks' }
                }
            }
        ]).session(session);

        let totalQ = 0;
        let totalM = 0;
        const subjects = stats.map(s => {
            totalQ += s.count;
            totalM += s.marks;
            return {
                subjectName: s._id,
                isIncluded: true,
                questionCount: s.count,
                totalMarks: s.marks
            };
        });

        test.subjects = subjects;
        test.total_questions = totalQ;
        test.total_marks = totalM;
        await test.save({ session });

        await session.commitTransaction();
        res.json({ success: true, message: 'Questions updated' });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error adding questions:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

// Finalize test
export const finalizeTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const test = await ScheduledTest.findById(testId);

        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
        if (test.total_questions === 0) return res.status(400).json({ success: false, message: 'Cannot finalize empty test' });

        test.isFinalized = true;
        test.status = 'scheduled';
        test.finalizedAt = new Date();
        await test.save();

        res.json({ success: true, message: 'Test finalized' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Remove questions from test
export const removeQuestionsFromTest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { testId } = req.params;
        const { questionIds } = req.body;

        if (!questionIds || !Array.isArray(questionIds)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'questionIds array is required' });
        }

        await TestQuestion.deleteMany({
            testId,
            questionId: { $in: questionIds }
        }).session(session);

        // Recalculate stats
        const stats = await TestQuestion.aggregate([
            { $match: { testId: new mongoose.Types.ObjectId(testId) } },
            {
                $group: {
                    _id: '$subject',
                    count: { $sum: 1 },
                    marks: { $sum: '$marks' }
                }
            }
        ]).session(session);

        let totalQ = 0;
        let totalM = 0;
        const subjects = stats.map(s => {
            totalQ += s.count;
            totalM += s.marks;
            return { subjectName: s._id, isIncluded: true, questionCount: s.count, totalMarks: s.marks };
        });

        const test = await ScheduledTest.findById(testId).session(session);
        test.subjects = subjects;
        test.total_questions = totalQ;
        test.total_marks = totalM;
        await test.save({ session });

        await session.commitTransaction();
        res.json({ success: true, message: 'Questions removed' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

// Delete test
export const deleteTest = async (req, res) => {
    try {
        const { testId } = req.params;
        await TestQuestion.deleteMany({ testId });
        await ScheduledTest.findByIdAndDelete(testId);
        res.json({ success: true, message: 'Test deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Reschedule test
export const rescheduleTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { testDate, testTime } = req.body;
        await ScheduledTest.findByIdAndUpdate(testId, {
            exam_date: new Date(testDate),
            test_time: testTime // Ensure field name matches model if exists
        });
        res.json({ success: true, message: 'Test rescheduled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Test preview data
export const getTestPreview = async (req, res) => {
    // Set a hard 8-second timeout to prevent hanging
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            console.error('TIMEOUT: getTestPreview took more than 8 seconds for testId:', req.params.testId);
            res.status(504).json({ success: false, error: 'Preview request timed out. The database query took too long.' });
        }
    }, 8000);

    try {
        const { testId } = req.params;
        console.log('getTestPreview: Starting for testId:', testId);

        const test = await ScheduledTest.findById(testId).lean();
        console.log('getTestPreview: ScheduledTest found:', !!test);

        if (!test) {
            clearTimeout(timeout);
            return res.status(404).json({ success: false, error: 'Test not found' });
        }

        const testQuestions = await TestQuestion.find({ testId }).populate('questionId').sort({ questionOrder: 1 }).lean();
        console.log('getTestPreview: TestQuestions found:', testQuestions.length);

        const sections = [];
        const grouped = {};

        testQuestions.forEach((tq, idx) => {
            if (!tq.questionId) return;
            if (!grouped[tq.subject]) grouped[tq.subject] = [];
            grouped[tq.subject].push({
                _id: tq.questionId._id,
                questionNo: idx + 1,
                questionText: tq.questionId.questionText,
                options: (tq.questionId.options || []).map((o, i) => {
                    const defaultId = String.fromCharCode(65 + i);
                    if (typeof o === 'object' && o !== null) {
                        return { 
                            optionId: o.optionId || defaultId, 
                            optionText: o.optionText || o.text || '',
                            imageUrl: o.imageUrl || null
                        };
                    }
                    return { 
                        optionId: defaultId, 
                        optionText: typeof o === 'string' ? o : JSON.stringify(o),
                        imageUrl: null
                    };
                }),
                imageUrl: tq.questionId.imageUrl || null,
                testId: tq.questionId.testId || null,
                images: tq.questionId.images || []
            });
        });

        Object.keys(grouped).forEach(subject => {
            sections.push({ subjectName: subject, questions: grouped[subject] });
        });

        clearTimeout(timeout);
        if (!res.headersSent) {
            console.log('getTestPreview: Sending response with', sections.length, 'sections');
            res.json({ success: true, data: { ...test, sections } });
        }
    } catch (error) {
        clearTimeout(timeout);
        console.error('getTestPreview ERROR:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
