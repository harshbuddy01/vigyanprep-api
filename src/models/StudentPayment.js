import mongoose from "mongoose";

const studentPaymentSchema = new mongoose.Schema({
  // Student Information
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    index: true 
  },
  
  roll_number: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Timestamps
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on every save
studentPaymentSchema.pre('save', function () {
  this.updated_at = Date.now();
});

export const StudentPayment = mongoose.model("StudentPayment", studentPaymentSchema);