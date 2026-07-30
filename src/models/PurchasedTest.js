import mongoose from "mongoose";

const purchasedTestSchema = new mongoose.Schema({
  // Reference to student
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true,
    index: true 
  },
  
  test_id: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Timestamps
  purchased_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index for email + test_id uniqueness
purchasedTestSchema.index({ email: 1, test_id: 1 }, { unique: true });

export const PurchasedTest = mongoose.model("PurchasedTest", purchasedTestSchema);