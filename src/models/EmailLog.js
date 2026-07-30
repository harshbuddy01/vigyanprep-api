import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['enrollment', 'score_report', 'PAYMENT_CONFIRMATION', 'other'],
        default: 'enrollment'
    },
    testId: String,
    rollNumber: String,
    paymentId: {
        type: String,
        index: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['sent', 'failed'],
        required: true
    },
    error: String,
    messageId: String,
    sentAt: {
        type: Date,
        default: Date.now
    }
});

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);
