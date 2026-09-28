// backend/controllers/trialController.js
// 🌟 24-HOUR VIP DEMO & TRIAL PASS MANAGEMENT CONTROLLER

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase.js';
import { sendEmail, EMAIL_FROM } from '../services/emailService.js';
import { trialRequestReceivedEmail, trialActivatedEmail } from '../services/emailTemplates.js';

const TRIAL_PLAN_ID = 'e0000000-0000-0000-0000-000000000024';

const formatTrialInvite = ({ name, email, password, targetExam }) => {
  return `*🏆 VigyanPrep VIP 24-Hour CBT Pass*\n\n` +
    `Hello ${name}! Here are your credentials for 24-hour full access to the official VigyanPrep exam simulation:\n\n` +
    `🌐 *Test Portal:* https://test.vigyanprep.com\n` +
    `📧 *Email:* ${email}\n` +
    `🔑 *Temporary Password:* ${password}\n` +
    `🎯 *Target Exam:* ${targetExam}\n` +
    `⏳ *Validity:* Exactly 24 Hours from activation\n\n` +
    `_Note: Includes full practice tests (IAT 01-03, JEE 01), authentic NTA CBT layout, scientific calculator & diagnostic percentage analysis. Best of luck!_`;
};

/**
 * Public: Student Requests a 24-Hour VIP Demo Pass from Website
 * POST /api/public/trial-request
 */
export const requestTrialAccount = async (req, res) => {
  try {
    const { name, email, targetExam = 'IAT', phone = '' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Student email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();

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
        error: `You already have an active enrolled subscription (${paidSub.plan_name || 'Paid Pass'})! Log in directly at https://test.vigyanprep.com.`
      });
    }

    // 2. Check if student already has an ACTIVE 24-hour trial
    const activeTrial = (existingSubs || []).find(s => s.plan_id === TRIAL_PLAN_ID && new Date(s.expires_at) > new Date());
    if (activeTrial) {
      return res.status(200).json({
        success: true,
        alreadyActive: true,
        message: 'Your 24-Hour VIP Demo Pass is already active! You can log in directly at https://test.vigyanprep.com.'
      });
    }

    // 3. Check if there is already a PENDING request
    const { data: pendingSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_email', cleanEmail)
      .eq('plan_id', TRIAL_PLAN_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (pendingSubs && pendingSubs.length > 0) {
      return res.status(200).json({
        success: true,
        alreadyPending: true,
        message: 'We have already received your request! Our academic team will verify and activate your pass within 1-2 hours.'
      });
    }

    // 4. Insert new pending trial request into subscriptions table
    const bundleIncludes = targetExam === 'ALL'
      ? ['IAT', 'NEST', 'JEE', 'CMI', 'ISI']
      : [targetExam];

    const studentId = crypto.randomUUID();
    const now = new Date();
    const expiresPlaceholder = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const { data: insertedRequest, error: insertErr } = await supabase
      .from('subscriptions')
      .insert({
        student_id: studentId,
        student_email: cleanEmail,
        student_name: cleanName,
        plan_id: TRIAL_PLAN_ID,
        bundle_includes: bundleIncludes,
        amount_paid: 0,
        starts_at: now.toISOString(),
        expires_at: expiresPlaceholder,
        status: 'pending',
        razorpay_order_id: phone ? `PHONE: ${phone.trim()}` : null
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Trial request insert error:', insertErr);
      throw insertErr;
    }

    // 5. Send acknowledgment email to student via Brevo
    try {
      const emailHtml = trialRequestReceivedEmail({
        studentName: cleanName,
        email: cleanEmail,
        targetExam: targetExam === 'ALL' ? 'All Science Exams (IAT, NEST, JEE, ISI/CMI)' : targetExam
      });
      await sendEmail(
        cleanEmail,
        '⚡ We Received Your 24-Hour VIP Demo Request — VigyanPrep',
        emailHtml,
        { from: EMAIL_FROM.NOTIFICATION, replyTo: EMAIL_FROM.SUPPORT }
      );
    } catch (emailErr) {
      console.warn('Acknowledgment email send notice:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'We have received your email. Our team will verify and update your pass within 1 to 2 hours. Kindly please wait, you will receive a confirmation email shortly.',
      requestId: insertedRequest?.id
    });

  } catch (err) {
    console.error('requestTrialAccount error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin: Create a 24-Hour VIP Demo Account Directly
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

    const studentId = studentRecord?.id || authUserId || crypto.randomUUID();
    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // Exactly 24 hours

    // 4. Archive/Deactivate any previous trial subscriptions for this email
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('student_email', cleanEmail)
      .eq('plan_id', TRIAL_PLAN_ID);

    // 5. Create fresh 24-hour VIP Trial subscription
    const bundleIncludes = Array.isArray(req.body.bundleIncludes) && req.body.bundleIncludes.length > 0
      ? req.body.bundleIncludes
      : targetExam === 'ALL'
      ? ['IAT', 'NEST', 'JEE', 'CMI', 'ISI']
      : [targetExam];

    const { data: newSub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        student_id: studentId,
        student_email: cleanEmail,
        student_name: cleanName,
        plan_id: TRIAL_PLAN_ID,
        bundle_includes: bundleIncludes,
        amount_paid: 0,
        starts_at: startsAt,
        expires_at: expiresAt,
        status: 'active',
        razorpay_payment_id: `PASS: ${password}`,
        razorpay_order_id: notes ? `NOTE: ${notes.slice(0, 50)}` : 'VIP_TRIAL_PASS'
      })
      .select()
      .single();

    if (subErr) {
      console.error('Trial subscription insert error:', subErr.message);
      return res.status(500).json({ success: false, error: 'Failed to create trial subscription' });
    }

    // 6. Generate formatted WhatsApp invite message
    const whatsappInvite = formatTrialInvite({
      name: cleanName,
      email: cleanEmail,
      password,
      targetExam: bundleIncludes.join(', '),
      expiresAt
    });

    // 7. Send credentials email via Brevo
    try {
      const emailHtml = trialActivatedEmail({
        studentName: cleanName,
        email: cleanEmail,
        password,
        bundleIncludes
      });
      await sendEmail(
        cleanEmail,
        '🎉 Your 24-Hour VIP Demo Pass is Active — VigyanPrep CBT Portal',
        emailHtml,
        { from: EMAIL_FROM.NOTIFICATION, replyTo: EMAIL_FROM.SUPPORT }
      );
    } catch (emailErr) {
      console.warn('Activation email send notice:', emailErr.message);
    }

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
 * Admin: Approve a Pending Trial Request & Issue Credentials
 * POST /api/admin/trial/approve/:id
 */
export const approveTrialRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { customPassword } = req.body || {};

    const { data: request, error: getErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (getErr || !request) {
      return res.status(404).json({ success: false, error: 'Trial request not found' });
    }

    const cleanEmail = request.student_email.toLowerCase();
    const cleanName = request.student_name || cleanEmail.split('@')[0];
    const password = customPassword?.trim() || `VP-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Try creating user in Supabase Auth if auth.admin is enabled
    let authUserId = request.student_id;
    try {
      if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.createUser === 'function') {
        const { data: authUser } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            is_trial: true,
            target_exam: request.bundle_includes?.[0] || 'IAT'
          }
        });
        if (authUser?.user?.id) {
          authUserId = authUser.user.id;
        }
      }
    } catch (e) {
      console.warn('Auth admin create notice:', e.message);
    }

    // 2. Ensure student profile exists in students table
    try {
      await supabase
        .from('students')
        .upsert({
          id: authUserId,
          email: cleanEmail,
          full_name: cleanName,
          course: request.bundle_includes?.join(', ') || 'IAT'
        }, { onConflict: 'email' });
    } catch (e) {}

    // 3. Activate the 24-hour pass starting right now
    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { data: updatedSub, error: updateErr } = await supabase
      .from('subscriptions')
      .update({
        student_id: authUserId,
        status: 'active',
        starts_at: startsAt,
        expires_at: expiresAt,
        razorpay_payment_id: `PASS: ${password}`
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Format WhatsApp invite
    const whatsappInvite = formatTrialInvite({
      name: cleanName,
      email: cleanEmail,
      password,
      targetExam: (request.bundle_includes || ['IAT']).join(', '),
      expiresAt
    });

    // 5. Send activation email with credentials via Brevo
    try {
      const emailHtml = trialActivatedEmail({
        studentName: cleanName,
        email: cleanEmail,
        password,
        bundleIncludes: request.bundle_includes || ['IAT', 'NEST']
      });
      await sendEmail(
        cleanEmail,
        '🎉 Your 24-Hour VIP Demo Pass is Active — VigyanPrep CBT Portal',
        emailHtml,
        { from: EMAIL_FROM.NOTIFICATION, replyTo: EMAIL_FROM.SUPPORT }
      );
    } catch (emailErr) {
      console.warn('Activation email send notice:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `24-Hour VIP Demo Pass approved and credentials sent to ${cleanEmail}`,
      password,
      whatsappInvite,
      trial: updatedSub
    });

  } catch (err) {
    console.error('approveTrialRequest error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin: Reject / Dismiss a Pending Trial Request
 * POST /api/admin/trial/reject/:id
 */
export const rejectTrialRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Trial request dismissed',
      trial: updated
    });
  } catch (err) {
    console.error('rejectTrialRequest error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin: List All Trial / Demo Accounts & Pending Requests
 * GET /api/admin/trial/list
 */
export const listTrialAccounts = async (req, res) => {
  try {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('plan_id', TRIAL_PLAN_ID)
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) throw error;

    const now = new Date();

    const formatted = (subs || []).map(s => {
      const isPending = s.status === 'pending';
      const isRejected = s.status === 'rejected';
      const expiresAt = new Date(s.expires_at);
      const isExpired = !isPending && !isRejected && (now >= expiresAt || s.status !== 'active');
      const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
      const remainingSeconds = Math.floor(remainingMs / 1000);

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);

      let status = 'active';
      let remainingFormatted = `${hours}h ${minutes}m left`;

      if (isPending) {
        status = 'pending';
        remainingFormatted = 'Pending Approval';
      } else if (isRejected) {
        status = 'rejected';
        remainingFormatted = 'Rejected';
      } else if (isExpired) {
        status = 'expired';
        remainingFormatted = 'Expired';
      }

      return {
        id: s.id,
        studentId: s.student_id,
        name: s.student_name,
        email: s.student_email,
        startsAt: s.starts_at,
        expiresAt: s.expires_at,
        createdAt: s.created_at,
        status,
        remainingSeconds,
        remainingFormatted,
        bundleIncludes: s.bundle_includes,
        password: s.razorpay_payment_id?.startsWith('PASS: ') ? s.razorpay_payment_id.replace('PASS: ', '') : null,
        phone: s.razorpay_order_id?.startsWith('PHONE: ') ? s.razorpay_order_id.replace('PHONE: ', '') : null,
        notes: s.razorpay_order_id ? s.razorpay_order_id.replace(/^NOTE:\s*/i, '') : ''
      };
    });

    const pendingRequests = formatted.filter(t => t.status === 'pending');
    const activeTrials = formatted.filter(t => t.status === 'active');
    const expiredTrials = formatted.filter(t => t.status === 'expired' || t.status === 'rejected');

    return res.status(200).json({
      success: true,
      trials: formatted,
      pendingRequests,
      activeTrials,
      expiredTrials,
      pendingCount: pendingRequests.length,
      activeCount: activeTrials.length,
      totalCount: formatted.length
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
 * GET /api/student/trial-status or /api/trial/status
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

    if (trialSub.status === 'pending') {
      return res.status(200).json({
        success: true,
        isTrial: true,
        status: 'pending',
        isExpired: false,
        message: 'Your 24-hour VIP pass request is pending admin verification.'
      });
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

/**
 * Student Self-Claim: Instant 24-Hour VIP Demo Pass with Anti-Abuse
 * Constraints:
 * 1. Strictly 1 trial per email lifetime (cannot reuse or register new trial)
 * 2. Strictly 1 trial per IP address (cannot create multi-accounts from same device/network)
 * 3. Cannot claim if already an active paid subscriber
 * POST /api/trial/claim
 */
export const claimTrialAccount = async (req, res) => {
  try {
    // 1. Get student identity from req.user or Authorization header or body
    let userEmail = req.user?.email;
    let userName = req.user?.name;
    let userId = req.user?.id;

    if (!userEmail && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const rawToken = req.headers.authorization.replace('Bearer ', '').trim();
        const decoded = jwt.decode(rawToken);
        if (decoded?.email) userEmail = decoded.email;
        if (decoded?.name) userName = decoded.name;
        if (decoded?.id || decoded?.sub) userId = decoded.id || decoded.sub;
      } catch (e) {}
    }

    const email = userEmail || req.body?.email;
    const name = userName || req.body?.name || email?.split('@')[0] || 'Student';
    const targetExam = req.body?.targetExam || 'ALL';

    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid student email is required to activate your 24-Hour VIP Demo Pass.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 2. Extract and sanitize verified client IP
    const rawIp = req.headers['cf-connecting-ip'] || 
                  req.headers['x-real-ip'] || 
                  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                  req.socket?.remoteAddress || 
                  req.ip || 
                  '';
    const clientIp = rawIp.replace(/^.*:/, '').trim() || rawIp.trim();

    console.log(`[TrialClaim] Processing 24-hr trial request for ${cleanEmail} (IP: ${clientIp})`);

    // 3. Check for existing subscriptions for this email
    const { data: existingSubs, error: subsErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_email', cleanEmail);

    if (subsErr) {
      console.error('[TrialClaim] Subscription lookup error:', subsErr.message);
    }

    // 4. Rule: If already an active PAID subscriber, trial is unneeded
    const paidSub = (existingSubs || []).find(s => 
      s.plan_id !== TRIAL_PLAN_ID && 
      s.status === 'active' && 
      new Date(s.expires_at) > new Date()
    );
    if (paidSub) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_PAID',
        error: `You are already enrolled in an active subscription (${paidSub.plan_name || 'Pass'})! You have complete access to all test series.`
      });
    }

    // 5. Rule: If student already has an active 24-hr trial currently running, return it
    const activeTrial = (existingSubs || []).find(s => 
      s.plan_id === TRIAL_PLAN_ID && 
      s.status === 'active' && 
      new Date(s.expires_at) > new Date()
    );
    if (activeTrial) {
      const remainingSec = Math.max(0, Math.floor((new Date(activeTrial.expires_at).getTime() - Date.now()) / 1000));
      return res.status(200).json({
        success: true,
        alreadyActive: true,
        message: 'Your 24-Hour VIP Demo Pass is already active!',
        trial: {
          id: activeTrial.id,
          expiresAt: activeTrial.expires_at,
          remainingSeconds: remainingSec
        }
      });
    }

    // 6. Anti-Abuse Rule 1: STRICTLY 1 TRIAL PER EMAIL LIFETIME
    const priorEmailTrial = (existingSubs || []).find(s => s.plan_id === TRIAL_PLAN_ID);
    if (priorEmailTrial) {
      console.warn(`[TrialClaim] Blocked repeated email trial for ${cleanEmail}`);
      return res.status(403).json({
        success: false,
        code: 'EMAIL_ALREADY_USED',
        error: 'A 24-Hour VIP Demo Pass has already been used for this email account. Each student account is eligible for exactly 1 free trial. Please upgrade to a test pass to continue.'
      });
    }

    // 7. Anti-Abuse Rule 2: STRICTLY 1 TRIAL PER IP ADDRESS
    const isLoopback = !clientIp || clientIp === '127.0.0.1' || clientIp === 'localhost' || clientIp === '::1';
    if (!isLoopback) {
      const { data: ipSubs, error: ipErr } = await supabase
        .from('subscriptions')
        .select('id, student_email, created_at, razorpay_order_id')
        .eq('plan_id', TRIAL_PLAN_ID)
        .ilike('razorpay_order_id', `%IP: ${clientIp}%`);

      if (ipErr) {
        console.warn('[TrialClaim] IP check query notice:', ipErr.message);
      } else if (ipSubs && ipSubs.length > 0) {
        console.warn(`[TrialClaim] Blocked IP multi-account abuse: IP ${clientIp} already used by ${ipSubs[0].student_email}`);
        return res.status(429).json({
          success: false,
          code: 'IP_ALREADY_USED',
          error: `A 24-Hour Free Demo has already been activated from this internet connection or device (IP: ${clientIp}). To prevent trial abuse, only 1 free trial is permitted per network. Please choose a subscription plan to continue.`
        });
      }
    }

    // 8. Security verification passed! Create VIP Demo Pass
    const password = `VP-${Math.floor(100000 + Math.random() * 900000)}`;
    const studentId = userId || crypto.randomUUID();
    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const bundleIncludes = targetExam === 'ALL'
      ? ['IAT', 'NEST', 'JEE', 'CMI', 'ISI']
      : [targetExam];

    // Ensure student record exists
    try {
      await supabase.from('students').upsert({
        id: studentId,
        email: cleanEmail,
        full_name: cleanName,
        course: bundleIncludes.join(', ')
      }, { onConflict: 'email' });
    } catch (upsertErr) {
      console.warn('[TrialClaim] Student upsert notice:', upsertErr.message);
    }

    // Insert new active 24-hour trial subscription
    const { data: newSub, error: insertErr } = await supabase
      .from('subscriptions')
      .insert({
        student_id: studentId,
        student_email: cleanEmail,
        student_name: cleanName,
        plan_id: TRIAL_PLAN_ID,
        bundle_includes: bundleIncludes,
        amount_paid: 0,
        starts_at: startsAt,
        expires_at: expiresAt,
        status: 'active',
        razorpay_payment_id: `PASS: ${password}`,
        razorpay_order_id: `IP: ${clientIp || 'UNKNOWN'}`
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[TrialClaim] Subscription insert error:', insertErr);
      return res.status(500).json({ success: false, error: 'Failed to create trial subscription' });
    }

    console.log(`[TrialClaim] ✅ Successfully activated 24-hr trial for ${cleanEmail} from IP ${clientIp}`);

    // Send credentials & activation confirmation email via Brevo
    try {
      const emailHtml = trialActivatedEmail({
        studentName: cleanName,
        email: cleanEmail,
        password,
        bundleIncludes
      });
      await sendEmail(
        cleanEmail,
        '🎉 Your 24-Hour VIP Demo Pass is Active — VigyanPrep CBT Portal',
        emailHtml,
        { from: EMAIL_FROM.NOTIFICATION, replyTo: EMAIL_FROM.SUPPORT }
      );
    } catch (emailErr) {
      console.warn('[TrialClaim] Activation email send notice:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: '🎉 Your 24-Hour VIP Demo Pass is now active! You have full practice access for the next 24 hours.',
      trial: {
        id: newSub.id,
        name: cleanName,
        email: cleanEmail,
        password,
        targetExam,
        startsAt,
        expiresAt,
        remainingSeconds: 24 * 3600,
        bundleIncludes,
        status: 'active'
      }
    });

  } catch (err) {
    console.error('[TrialClaim] Fatal error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

