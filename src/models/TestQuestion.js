import mongoose from 'mongoose';

const testQuestionSchema = new mongoose.Schema({
    testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScheduledTest',
        required: true,
        index: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['Physics', 'Chemistry', 'Mathematics', 'Biology']
    },
    questionOrder: {
        type: Number,
        required: true
    },
    marks: {
        type: Number,
        required: true,
        default: 4
    },
    negativeMarks: {
        type: Number,
        default: 1
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

// Compound index for efficient queries
testQuestionSchema.index({ testId: 1, subject: 1 });
testQuestionSchema.index({ testId: 1, questionOrder: 1 });

// Prevent duplicate questions in same test
testQuestionSchema.index({ testId: 1, questionId: 1 }, { unique: true });

export const TestQuestion = mongoose.model('TestQuestion', testQuestionSchema);
