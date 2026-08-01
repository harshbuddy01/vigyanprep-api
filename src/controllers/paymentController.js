import crypto from 'crypto';
import razorpayInstance from '../config/razorpay.js';
import { supabase } from '../db/supabase.js';

const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_API_SECRET || '';

export async function createPaymentOrder(req, res) {
  try {
    const { planId, amount: bodyAmount, testId, testSeriesId } = req.body;
    const studentId = req.user?.id;

    let finalAmount = bodyAmount || 999;

    // Validate price against database if planId is provided
    if (planId) {
      const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
      if (plan) {
        finalAmount = plan.discount_price || plan.price || finalAmount;
      }
    }

    const amountInPaisa = Math.round(finalAmount * 100);

    if (razorpayInstance) {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          planId: planId || '',
          testId: testId || testSeriesId || '',
          studentId: studentId || ''
        }
      });

      return res.status(200).json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: keyId
        }
      });
    }

    // Fallback simulation mode if Razorpay credentials are not set on environment
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return res.status(200).json({
      success: true,
      order: {
        id: orderId,
        amount: amountInPaisa,
        currency: 'INR',
        key: keyId || 'rzp_test_mockKey123'
      }
    });
  } catch (error) {
    console.error('❌ Razorpay order creation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, amount } = req.body;
    const studentId = req.user?.id || req.body?.studentId;

    if (keySecret && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
    }

    // Save payment record to Supabase
    await supabase.from('payments').insert({
      razorpay_order_id: razorpay_order_id || 'manual',
      razorpay_payment_id: razorpay_payment_id || 'manual',
      amount: amount || 999,
      status: 'captured',
      student_id: studentId,
      plan_id: planId,
      verified_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function verifyUserFull(req, res) {
  return res.status(200).json({ success: true, verified: true });
}
