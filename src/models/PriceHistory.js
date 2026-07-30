import mongoose from 'mongoose';

/**
 * Price History Model - Audit Trail
 * Tracks all price changes for security and compliance
 */
const priceHistorySchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    index: true
  },
  oldPrice: {
    type: Number,
    required: true
  },
  newPrice: {
    type: Number,
    required: true
  },
  changedBy: {
    type: String,
    required: true,
    // Admin email or username
  },
  changedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  reason: {
    type: String,
    default: 'Price update via admin panel'
  }
});

// Index for faster audit queries
priceHistorySchema.index({ testId: 1, changedAt: -1 });
priceHistorySchema.index({ changedBy: 1, changedAt: -1 });

export const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);
