import mongoose from 'mongoose';

const testSeriesSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: [1, 'Price must be at least ₹1'],
    max: [99999, 'Price cannot exceed ₹99,999'],
    validate: {
      validator: Number.isInteger,
      message: 'Price must be a whole number'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
testSeriesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
testSeriesSchema.index({ testId: 1, isActive: 1 });

export const TestSeries = mongoose.model('TestSeries', testSeriesSchema);
