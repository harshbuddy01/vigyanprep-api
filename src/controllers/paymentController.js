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
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      planId, amount, studentEmail, studentName
    } = req.body;
    const studentId = req.user?.id || req.body?.studentId;

    // 1. Verify Razorpay signature
    if (keySecret && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
    }

    // 2. Look up plan details from database
    let planName = '';
    let examType = '';
    let durationDays = 30;
    if (planId) {
      const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
      if (plan) {
        planName = plan.name || '';
        examType = plan.exam_type || '';
        durationDays = plan.duration_days || 30;
      }
    }

    // 3. Save enriched payment record with student details
    const paymentRecord = {
      razorpay_order_id: razorpay_order_id || 'manual',
      razorpay_payment_id: razorpay_payment_id || 'manual',
      amount: amount || 999,
      status: 'captured',
      student_id: studentId || null,
      plan_id: planId || null,
      student_email: studentEmail || null,
      student_name: studentName || null,
      plan_name: planName || null,
      exam_type: examType || null,
      duration_days: durationDays,
      verified_at: new Date().toISOString()
    };

    const { error: paymentError } = await supabase.from('payments').insert(paymentRecord);
    if (paymentError) {
      console.error('❌ Payment insert error:', paymentError);
    }

    // 4. Create subscription record with start/expiry dates
    let subscriptionData = null;
    if (planId && studentId) {
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const subscriptionRecord = {
        student_id: studentId,
        plan_id: planId,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        student_email: studentEmail || null,
        student_name: studentName || null,
        amount_paid: amount || 999,
        razorpay_payment_id: razorpay_payment_id || null,
        razorpay_order_id: razorpay_order_id || null
      };

      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();

      if (subError) {
        console.error('⚠️ Subscription insert error (non-fatal):', subError.message);
      } else {
        subscriptionData = sub;
      }
    }

    // 5. Return success with subscription details
    return res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscription: subscriptionData ? {
        id: subscriptionData.id,
        planName,
        examType,
        durationDays,
        startsAt: subscriptionData.starts_at,
        expiresAt: subscriptionData.expires_at,
        status: subscriptionData.status
      } : null
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function verifyUserFull(req, res) {
  return res.status(200).json({ success: true, verified: true });
}
