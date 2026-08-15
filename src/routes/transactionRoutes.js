import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/', async (req, res) => {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, razorpay_order_id, razorpay_payment_id, amount, status, student_id, plan_id, student_email, student_name, plan_name, exam_type, duration_days, verified_at, created_at')
      .order('created_at', { ascending: false });
    return res.status(200).json({ success: true, transactions: payments || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/transactions/grant — Manually activate subscription for any student email
router.post('/grant', async (req, res) => {
  try {
    const { studentEmail, studentName, planId, durationDays = 90, bundleIncludes = ['IAT', 'NEST'] } = req.body;
    if (!studentEmail) {
      return res.status(400).json({ success: false, error: 'Student email is required' });
    }

    const cleanEmail = String(studentEmail).trim().toLowerCase();
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + (durationDays || 90) * 24 * 60 * 60 * 1000);

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .insert({
        student_email: cleanEmail,
        student_name: studentName || 'Student',
        plan_id: planId || '1cb618ba-4faa-43a6-98a8-736338d260b0',
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        amount_paid: 0,
        bundle_includes: bundleIncludes,
        student_id: '00000000-0000-0000-0000-000000000001'
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `Subscription successfully activated for ${cleanEmail}!`,
      subscription: sub
    });
  } catch (err) {
    console.error('Manual grant subscription error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
