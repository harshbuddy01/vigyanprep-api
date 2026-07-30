import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  rollNumber: {
    type: String,
    default: null
  },
  fullName: {
    type: String,
    default: null
  },
  course: { // 📚 ADDED: Course field for frontend compatibility
    type: String,
    default: 'IAT' // Default to IAT if missing
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
});

// Index is automatically created by unique: true
// StudentSchema.index({ email: 1 });

export default mongoose.model('Student', StudentSchema);
