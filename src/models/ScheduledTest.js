import mongoose from 'mongoose';

// Schema for scheduled/upcoming tests
const ScheduledTestSchema = new mongoose.Schema({
  test_name: {
    type: String,
    required: true,
    trim: true,
    example: 'IAT Mock Test 1'
  },
  test_type: {
    type: String,
    enum: ['iat', 'nest', 'isi'],
    required: true,
    example: 'iat'
  },
  exam_date: {
    type: Date,
    required: true,
    example: '2026-02-15'
  },
  duration: {
    type: Number,
    default: 180,
    description: 'Duration in minutes',
    example: 180
  },
  total_questions: {
    type: Number,
    default: 60,
    example: 60
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  subjects: [
    {
      subjectName: {
        type: String,
        enum: ['Physics', 'Chemistry', 'Mathematics', 'Biology']
      },
      isIncluded: {
        type: Boolean,
        default: false
      },
      questionCount: {
        type: Number,
        default: 0
      },
      marksPerQuestion: {
        type: Number,
        default: 4
      },
      totalMarks: {
        type: Number,
        default: 0
      }
    }
  ],
  total_marks: {
    type: Number,
    default: 0
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  finalizedAt: Date,
  description: {
    type: String,
    default: '',
    trim: true
  },
  instructions: {
    type: String,
    default: '',
    trim: true
  },
  passing_score: {
    type: Number,
    default: 40,
    min: 0,
    max: 100
  },
  negative_marking: {
    type: Boolean,
    default: true
  },
  marks_per_question: {
    type: Number,
    default: 1
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: String,
    default: 'admin'
  }
});

// Update the updated_at field before saving
ScheduledTestSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create indexes for better query performance
ScheduledTestSchema.index({ test_type: 1, exam_date: 1 });
ScheduledTestSchema.index({ status: 1 });
ScheduledTestSchema.index({ created_at: -1 });

export const ScheduledTest = mongoose.model('ScheduledTest', ScheduledTestSchema);