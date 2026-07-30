import mongoose from 'mongoose';

const StudentAccessSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  email: { 
    type: String 
  },
  examId: { 
    type: String 
  },
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PaymentTransaction' 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index for fast access verification
StudentAccessSchema.index({ studentId: 1, examId: 1, expiresAt: 1 });

export default mongoose.model('StudentAccess', StudentAccessSchema);
