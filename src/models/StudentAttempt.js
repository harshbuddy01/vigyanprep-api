import mongoose from "mongoose";

const studentAttemptSchema = new mongoose.Schema({
  // Student Information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },

  roll_number: {
    type: String,
    index: true
  },

  // Test Information
  test_id: {
    type: String,
    required: true,
    index: true
  },

  test_name: {
    type: String
  },

  // Question Metrics
  total_questions: {
    type: Number,
    required: true
  },

  attempted_questions: {
    type: Number,
    required: true
  },

  correct_answers: {
    type: Number,
    required: true
  },

  wrong_answers: {
    type: Number,
    required: true
  },

  unanswered: {
    type: Number,
    required: true
  },

  // Score
  score: {
    type: Number,
    required: true
  },

  percentage: {
    type: Number,
    required: true
  },

  // Time
  time_taken: {
    type: Number,
    default: 0
  },

  // Answers (Array of user selections)
  answers: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },

  // Question-wise Results
  question_wise_results: {
    type: [{
      questionId: String,
      questionNumber: Number,
      userAnswer: mongoose.Schema.Types.Mixed,
      correctAnswer: String,
      isCorrect: Boolean,
      marks: Number,
      section: String,
      status: String // 'correct', 'wrong', 'unanswered', 'pending_manual'
    }],
    default: []
  },

  // Timestamps
  started_at: {
    type: Date
  },

  submitted_at: {
    type: Date,
    default: Date.now,
    index: true
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for email + test_id + submitted_at
studentAttemptSchema.index({ email: 1, test_id: 1, submitted_at: -1 });

export const StudentAttempt = mongoose.model("StudentAttempt", studentAttemptSchema);