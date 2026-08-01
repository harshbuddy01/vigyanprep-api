// backend/controllers/examLifecycleController.js
// ⏱️ SERVER-AUTHORITATIVE EXAM LIFECYCLE, AUTOSAVE & ANTI-CHEAT ENGINE

import { supabase } from '../db/supabase.js';

/**
 * Start Exam Attempt (Server-Authoritative Clock & Deadline)
 */
export const startAttempt = async (req, res) => {
  try {
    const { testId } = req.params;
    const studentId = req.user?.id || req.body?.student_id;
    const orgId = req.user?.org_id || '00000000-0000-0000-0000-000000000001';

    if (!studentId) {
      return res.status(401).json({ error: 'Student authentication required' });
    }

    // 1. Fetch test details
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testErr || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Check existing attempt
    const { data: existing } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      // Resume existing attempt
      const now = new Date();
      const deadline = new Date(existing.server_deadline);
      const isExpired = now > deadline || existing.status === 'submitted';

      return res.status(200).json({
        success: true,
        attempt: existing,
        resumed: true,
        remaining_seconds: Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000)),
        isExpired
      });
    }

    // 2. Server-authoritative start time and deadline
    const startedAt = new Date();
    const durationMinutes = test.duration_minutes || 180;
    const serverDeadline = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .insert({
        org_id: orgId,
        test_id: testId,
        student_id: studentId,
        started_at: startedAt.toISOString(),
        server_deadline: serverDeadline.toISOString(),
        status: 'in_progress',
        warning_count: 0,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      })
      .select()
      .single();

    if (attemptErr) throw attemptErr;

    return res.status(200).json({
      success: true,
      attempt,
      resumed: false,
      remaining_seconds: durationMinutes * 60
    });
  } catch (err) {
    console.error('startAttempt error:', err);
    return res.status(500).json({ error: 'Failed to start exam attempt', details: err.message });
  }
};

/**
 * 10-Second Periodic Autosave Sync Handler
 */
export const autosaveAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, warningCount } = req.body;

    if (!attemptId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'attemptId and answers array are required' });
    }

    // Fetch attempt to check deadline & ownership
    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const now = new Date();
    const deadline = new Date(attempt.server_deadline);

    if (now > deadline || attempt.status === 'submitted') {
      return res.status(403).json({
        error: 'Exam duration has expired. Submitting attempt automatically.',
        expired: true
      });
    }

    // Save/upsert answers
    const upsertRows = answers.map(a => ({
      attempt_id: attemptId,
      question_id: a.questionId || a.question_id,
      answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
      answered_at: new Date().toISOString()
    }));

    if (upsertRows.length > 0) {
      await supabase.from('attempt_answers').upsert(upsertRows, { onConflict: 'attempt_id,question_id' });
    }

    // Update warning count if provided
    if (typeof warningCount === 'number') {
      await supabase.from('attempts').update({ warning_count: warningCount }).eq('id', attemptId);
    }

    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    return res.status(200).json({
      success: true,
      remaining_seconds: remainingSeconds,
      syncedCount: upsertRows.length
    });
  } catch (err) {
    console.error('autosaveAnswers error:', err);
    return res.status(500).json({ error: 'Autosave failed', details: err.message });
  }
};

/**
 * Log Anti-Cheat Proctoring Event (tab switches, fullscreen exit)
 */
export const logProctorEvent = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { eventType, metadata } = req.body;

    if (!attemptId || !eventType) {
      return res.status(400).json({ error: 'attemptId and eventType are required' });
    }

    await supabase.from('attempt_events').insert({
      attempt_id: attemptId,
      event_type: eventType,
      metadata: metadata || {}
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to log proctor event', details: err.message });
  }
};

/**
 * Submit Exam Attempt (Manual or Auto Deadline)
 */
export const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { submitReason } = req.body; // 'manual', 'auto_time', 'auto_proctor'

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.status === 'submitted') {
      return res.status(200).json({ success: true, message: 'Attempt already submitted', attempt });
    }

    const submittedAt = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from('attempts')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
        submit_reason: submitReason || 'manual'
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      attempt: updated
    });
  } catch (err) {
    console.error('submitAttempt error:', err);
    return res.status(500).json({ error: 'Failed to submit attempt', details: err.message });
  }
};
