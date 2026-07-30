import mongoose from 'mongoose';

const PdfUploadSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    examType: {
        type: String,
        default: ''
    },
    subject: {
        type: String,
        default: ''
    },
    topic: {
        type: String,
        default: ''
    },
    year: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    questionsExtracted: {
        type: Number,
        default: 0
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const PdfUpload = mongoose.model('PdfUpload', PdfUploadSchema);

export default PdfUpload;
