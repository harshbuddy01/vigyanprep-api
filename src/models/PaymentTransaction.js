import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema({
  // Student information
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true,
    index: true 
  },
  
  // Razorpay details
  razorpay_order_id: { 
    type: String, 
    required: true,
    index: true 
  },
  
  razorpay_payment_id: { 
    type: String, 
    required: false,
    default: null,
    index: true 
  },
  
  razorpay_signature: { 
    type: String, 
    required: false,
    default: null
  },
  
  // Test information
  test_id: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Transaction details
  amount: { 
    type: Number, 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'paid',
    index: true 
  },
  
  // Timestamps
  created_at: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on every save
paymentTransactionSchema.pre('save', function () {
  this.updated_at = Date.now();
});

export const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);