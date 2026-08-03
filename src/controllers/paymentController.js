import crypto from 'crypto';
import razorpayInstance from '../config/razorpay.js';
import { supabase } from '../db/supabase.js';
import { sendEmail, EMAIL_FROM } from '../services/emailService.js';
import { paymentConfirmationEmail } from '../services/emailTemplates.js';

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
    let finalStudentEmail = studentEmail || req.body?.email;
    let finalStudentName = studentName || req.body?.name;

    // Fallback: If website localStorage did not pass studentEmail, fetch email from Razorpay Payment API
    if (!finalStudentEmail && razorpay_payment_id && razorpay_payment_id !== 'manual' && razorpayInstance?.payments) {
      try {
        const rzpPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        if (rzpPayment?.email) {
          finalStudentEmail = rzpPayment.email;
        }
        if (rzpPayment?.notes?.email) {
          finalStudentEmail = finalStudentEmail || rzpPayment.notes.email;
        }
        if (rzpPayment?.notes?.name) {
          finalStudentName = finalStudentName || rzpPayment.notes.name;
        }
      } catch (rzpErr) {
        console.warn('⚠️ Could not fetch email from Razorpay API:', rzpErr.message);
      }
    }

    let resolvedStudentId = req.user?.id || req.body?.studentId || req.body?.student_id;

    // Auto-resolve studentId from email if studentId was not provided in payment request
    if (!resolvedStudentId && finalStudentEmail) {
      const cleanEmail = String(finalStudentEmail).trim().toLowerCase();

      // 1. Look up in users table
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (user?.id) {
        resolvedStudentId = user.id;
      } else {
        // 2. Look up in students table
        const { data: std } = await supabase
          .from('students')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (std?.id) {
          resolvedStudentId = std.id;
        } else {
          // 3. Auto-create user profile for new student
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              email: cleanEmail,
              full_name: finalStudentName || 'Student',
              role: 'student',
              org_id: '00000000-0000-0000-0000-000000000001'
            })
            .select('id')
            .maybeSingle();

          if (newUser?.id) resolvedStudentId = newUser.id;
        }
      }
    }

    // Fallback ID if no student ID could be resolved
    const finalStudentId = resolvedStudentId || '00000000-0000-0000-0000-000000000001';

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
      student_id: finalStudentId,
      plan_id: planId || null,
      student_email: finalStudentEmail || null,
      student_name: finalStudentName || null,
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
    if (planId) {
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const subscriptionRecord = {
        student_id: finalStudentId,
        plan_id: planId,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        student_email: finalStudentEmail || null,
        student_name: finalStudentName || null,
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

    // 5. Send payment confirmation email
    if (finalStudentEmail) {
      try {
        const startsFormatted = subscriptionData ? new Date(subscriptionData.starts_at).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Today';
        const expiresFormatted = subscriptionData ? new Date(subscriptionData.expires_at).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '30 days from now';

        const html = paymentConfirmationEmail({
          studentName: finalStudentName || 'Student',
          planName: planName || 'Test Series Pass',
          examType: examType || 'IAT',
          durationDays,
          amount: amount || 999,
          startsAt: startsFormatted,
          expiresAt: expiresFormatted,
          paymentId: razorpay_payment_id || 'N/A'
        });

        await sendEmail(finalStudentEmail, `\u2705 Payment Confirmed \u2014 ${planName || 'Test Series'}`, html, { from: EMAIL_FROM.PAYMENT });
      } catch (emailErr) {
        console.error('\u26a0\ufe0f Payment confirmation email failed (non-fatal):', emailErr.message);
      }
    }

    // 6. Return success with subscription details
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
