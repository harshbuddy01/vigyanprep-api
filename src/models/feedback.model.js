import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  testId: {
    type: String,
    required: true,
    enum: ['iat', 'nest', 'isi'],
    lowercase: true
  },
  ratings: {
    login: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    interface: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    server: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  averageRating: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  }
});

// Calculate average rating before saving
feedbackSchema.pre('save', function(next) {
  const { login, interface: interfaceRating, quality, server } = this.ratings;
  this.averageRating = (login + interfaceRating + quality + server) / 4;
  next();
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;