import mongoose from 'mongoose';

const DoubtSchema = new mongoose.Schema({
    studentEmail: {
        type: String,
        required: true,
        index: true
    },
    questionText: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    handwritingStyle: {
        type: String,
        enum: ['neat', 'cursive', 'casual'],
        default: 'neat'
    },
    isComplex: {
        type: Boolean,
        default: false
    },
    imagesUsed: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster history retrieval
DoubtSchema.index({ studentEmail: 1, createdAt: -1 });

export default mongoose.model('Doubt', DoubtSchema);
