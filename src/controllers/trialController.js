// backend/controllers/trialController.js
// 🌟 24-HOUR VIP DEMO & TRIAL PASS MANAGEMENT CONTROLLER

import { supabase } from '../db/supabase.js';

const TRIAL_PLAN_ID = 'e0000000-0000-0000-0000-000000000024';

/**
 * Admin: Create a 24-Hour VIP Demo Account
 * POST /api/admin/trial/create
 */
export const createTrialAccount = async (req, res) => {
  try {
    const { name, email, targetExam = 'IAT', notes = '', customPassword } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Student email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const password = customPassword?.trim() || `VP-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Check if student already has a PAID (non-trial) active subscription
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_email', cleanEmail)
      .eq('status', 'active');

    const paidSub = (existingSubs || []).find(s => s.plan_id !== TRIAL_PLAN_ID && new Date(s.expires_at) > new Date());
    if (paidSub) {
      return res.status(400).json({
        success: false,
        error: `Cannot issue trial: ${cleanEmail} is already an active Paid Subscriber! (${paidSub.plan_name || 'Paid Pass'})`
      });
    }

    // 2. Try creating user in Supabase Auth if auth.admin is enabled
    let authUserId = null;
    try {
      if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.createUser === 'function') {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            is_trial: true,
            target_exam: targetExam
          }
        });
        if (authUser?.user?.id) {
          authUserId = authUser.user.id;
        } else if (authErr && !authErr.message?.includes('already registered')) {
          console.warn('Supabase auth.admin notice:', authErr.message);
        }
      }
    } catch (e) {
      console.warn('Auth admin create notice:', e.message);
    }

    // 3. Ensure student profile exists in students table
    const { data: studentRecord, error: studentErr } = await supabase
      .from('students')
      .upsert({
        ...(authUserId ? { id: authUserId } : {}),
        email: cleanEmail,
        full_name: cleanName,
        course: targetExam
      }, { onConflict: 'email' })
      .select()
      .single();

    if (studentErr) {
      console.error('Students table upsert error:', studentErr.message);
    }

    const studentId = studentRecord?.id || authUserId || `trial_${Date.now()}`;
    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // Exactly 24 hours

    // 4. Archive/Deactivate any previous trial subscriptions for this email
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('student_email', cleanEmail)
      .eq('plan_id', TRIAL_PLAN_ID);

    // 5. Create fresh 24-hour VIP Trial subscription
    const bundleIncludes = targetExam === 'ALL'
      ? ['IAT', 'NEST', 'JEE', 'CMI', 'ISI']
      : [targetExam];

    const { data: newSub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        student_id: studentId,
        student_email: cleanEmail,
        student_name: cleanName,
        plan_id: TRIAL_PLAN_ID,
        starts_at: startsAt,
        expires_at: expiresAt,
        status: 'active',
        amount_paid: 0,
        bundle_includes: bundleIncludes,
        razorpay_payment_id: `TRIAL_VIP_${Date.now()}`,
        razorpay_order_id: notes ? `NOTE: ${notes.slice(0, 50)}` : 'VIP_TRIAL_PASS'
      })
      .select()
      .single();

    if (subErr) {
      console.error('Trial subscription insert error:', subErr.message);
      return res.status(500).json({ success: false, error: 'Failed to create trial subscription' });
    }

    // 6. Generate formatted WhatsApp invite message
    const whatsappInvite = `*🏆 VigyanPrep VIP 24-Hour CBT Pass*\n\n` +
      `Hello ${cleanName}! Here are your credentials for 24-hour full access to the official VigyanPrep exam simulation:\n\n` +
      `🌐 *Test Portal:* https://test.vigyanprep.com\n` +
      `📧 *Email:* ${cleanEmail}\n` +
      `🔑 *Temporary Password:* ${password}\n` +
      `🎯 *Target Exam:* ${targetExam}\n` +
      `⏳ *Validity:* Exactly 24 Hours from now\n\n` +
      `_Note: Includes full practice tests (IAT 01-03, JEE 01), authentic NTA CBT layout, scientific calculator & AIR rank analysis. Best of luck!_`;

    return res.status(201).json({
      success: true,
      message: '24-Hour VIP Demo Pass created successfully',
      trial: {
        id: newSub.id,
        studentId,
        name: cleanName,
        email: cleanEmail,
        password,
        targetExam,
        startsAt,
        expiresAt,
        remainingSeconds: 24 * 3600,
        status: 'active',
        whatsappInvite
      }
    });

  } catch (err) {
    console.error('createTrialAccount error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin: List All Trial / Demo Accounts with Live Expiry
 * GET /api/admin/trial/list
 */
export const listTrialAccounts = async (req, res) => {
  try {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('plan_id', TRIAL_PLAN_ID)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const now = new Date();

    const formatted = (subs || []).map(s => {
      const expiresAt = new Date(s.expires_at);
      const isExpired = now >= expiresAt || s.status !== 'active';
      const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
      const remainingSeconds = Math.floor(remainingMs / 1000);

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);

      return {
        id: s.id,
        studentId: s.student_id,
        name: s.student_name,
        email: s.student_email,
        startsAt: s.starts_at,
        expiresAt: s.expires_at,
        status: isExpired ? 'expired' : 'active',
        remainingSeconds,
        remainingFormatted: isExpired ? 'Expired' : `${hours}h ${minutes}m left`,
        bundleIncludes: s.bundle_includes,
        notes: s.razorpay_order_id?.startsWith('NOTE: ') ? s.razorpay_order_id.replace('NOTE: ', '') : ''
      };
    });

    return res.status(200).json({
      success: true,
      trials: formatted,
      totalCount: formatted.length,
      activeCount: formatted.filter(t => t.status === 'active').length
    });
  } catch (err) {
    console.error('listTrialAccounts error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin: Extend a Trial Account by +24 Hours
 * POST /api/admin/trial/extend/:id
 */
export const extendTrialAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.body;

    const { data: existing, error: getErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      return res.status(404).json({ success: false, error: 'Trial pass not found' });
    }

    const currentExpiry = new Date(existing.expires_at);
    const baseTime = currentExpiry > new Date() ? currentExpiry.getTime() : Date.now();
    const newExpiresAt = new Date(baseTime + hours * 3600 * 1000).toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('subscriptions')
      .update({
        expires_at: newExpiresAt,
        status: 'active'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      message: `Trial pass extended by ${hours} hours successfully`,
      newExpiresAt,
      trial: updated
    });
  } catch (err) {
    console.error('extendTrialAccount error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin: Revoke a Trial Account Immediately
 * POST /api/admin/trial/revoke/:id
 */
export const revokeTrialAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'revoked',
        expires_at: new Date(Date.now() - 1000).toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Trial pass revoked successfully',
      trial: updated
    });
  } catch (err) {
    console.error('revokeTrialAccount error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Student: Check Own Trial Status & Live Countdown
 * GET /api/student/trial-status
 */
export const getStudentTrialStatus = async (req, res) => {
  try {
    const studentEmail = req.user?.email || req.query.email;
    if (!studentEmail) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = studentEmail.trim().toLowerCase();

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_email', cleanEmail)
      .eq('plan_id', TRIAL_PLAN_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    const trialSub = subs?.[0];

    if (!trialSub) {
      return res.status(200).json({ success: true, isTrial: false });
    }

    const expiresAt = new Date(trialSub.expires_at);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const isExpired = remainingMs <= 0 || trialSub.status !== 'active';
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return res.status(200).json({
      success: true,
      isTrial: true,
      status: isExpired ? 'expired' : 'active',
      isExpired,
      expiresAt: trialSub.expires_at,
      startsAt: trialSub.starts_at,
      remainingSeconds,
      canAccessLiveTests: false, // Strict anti-cheating rule: trials cannot enter live tests
      bundleIncludes: trialSub.bundle_includes
    });
  } catch (err) {
    console.error('getStudentTrialStatus error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
