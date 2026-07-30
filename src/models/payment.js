import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  // Student Information (ONE per email)
  email: { 
    type: String, 
    required: true, 
    unique: true,  // ONE email = ONE student record
    lowercase: true,
    trim: true,
    index: true 
  },
  
  rollNumber: { 
    type: String, 
    required: true, 
    unique: true,  // ONE roll number per student
    index: true 
  },
  
  // Purchased Tests (Array of test IDs)
  purchasedTests: { 
    type: [String], 
    default: []  // e.g., ['iat', 'nest', 'isi']
  },
  
  // Payment History (Array of all transactions)
  payments: [{
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    razorpay_signature: { type: String, required: true },
    testId: { type: String, required: true },  // Which test was purchased
    amount: { type: Number, required: true },
    status: { type: String, default: "paid" },
    paidAt: { type: Date, default: Date.now }
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on every save
paymentSchema.pre('save', function () {
  this.updatedAt = Date.now();
});


export const Payment = mongoose.model("Payment", paymentSchema);