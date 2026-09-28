// backend/controllers/examLifecycleController.js
// ⏱️ SERVER-AUTHORITATIVE EXAM LIFECYCLE, AUTOSAVE & ANTI-CHEAT ENGINE

import { supabase } from '../db/supabase.js';
import { recalculateTestScoresAndRanks } from './stagedResultController.js';

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

    // Ensure student record exists in students table
    if (studentId && req.user?.email) {
      try {
        await supabase.from('students').upsert({
          id: studentId,
          email: req.user.email,
          full_name: req.user.name || req.body?.candidateName || req.user.email.split('@')[0],
          last_login_at: new Date().toISOString()
        }, { onConflict: 'email' });
      } catch (stSyncErr) {
        console.warn('Student sync notice:', stSyncErr.message);
      }
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

    // Anti-Cheating & AIR Merit Isolation: Restrict VIP trial accounts from accessing active Live scheduled tests
    const now = new Date();
    const TRIAL_PLAN_ID = 'e0000000-0000-0000-0000-000000000024';
    const winStart = test.window_start ? new Date(test.window_start) : null;
    const winEnd = test.window_end ? new Date(test.window_end) : null;
    const isLiveScheduled = test.content_type === 'test_series' && 
      !test.response_released_at && 
      !test.result_released_at && 
      ((winStart && winEnd && now >= winStart && now <= winEnd) || (winStart && now < winStart));

    if (isLiveScheduled) {
      const studentEmail = req.user?.email;
      let subQuery = supabase
        .from('subscriptions')
        .select('id, plan_id, expires_at, status')
        .eq('status', 'active');

      if (studentId && studentEmail) {
        subQuery = subQuery.or(`student_id.eq.${studentId},student_email.ilike."${studentEmail.trim()}"`);
      } else if (studentEmail) {
        subQuery = subQuery.eq('student_email', studentEmail.trim());
      } else {
        subQuery = subQuery.eq('student_id', studentId);
      }

      const { data: userSubs } = await subQuery;
      const activeSubs = (userSubs || []).filter(s => new Date(s.expires_at) > now);
      const hasPaid = activeSubs.some(s => s.plan_id !== TRIAL_PLAN_ID);
      const isTrialOnly = !hasPaid && activeSubs.some(s => s.plan_id === TRIAL_PLAN_ID);

      if (isTrialOnly) {
        return res.status(403).json({
          success: false,
          error: 'Live proctored tests are reserved for enrolled students to protect All-India Merit Rankings. You have full access to all practice papers (IAT 01-03, JEE 01) and PYQ archives with your 24-hour VIP pass!',
          code: 'TRIAL_LIVE_TEST_RESTRICTED'
        });
      }
    }

    // Check existing attempt
    const { data: existing } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      // Resume existing attempt - fetch all previously saved answers
      const now = new Date();
      const deadline = new Date(existing.server_deadline);
      const isExpired = now > deadline || existing.status === 'submitted';

      const { data: savedAnswers } = await supabase
        .from('attempt_answers')
        .select('question_id, answer')
        .eq('attempt_id', existing.id);

      const answersMap = {};
      (savedAnswers || []).forEach(a => {
        if (a.question_id && a.answer) {
          answersMap[a.question_id] = a.answer;
        }
      });

      return res.status(200).json({
        success: true,
        attempt: existing,
        resumed: true,
        answers: answersMap,
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
        test_id: testId,
        student_id: studentId,
        started_at: startedAt.toISOString(),
        server_deadline: serverDeadline.toISOString(),
        status: 'in_progress',
        warning_count: 0,
        ip_address: req.ip || null,
        user_agent: req.headers['user-agent'] || null
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

    if (!attemptId || (!Array.isArray(answers) && (!answers || typeof answers !== 'object'))) {
      return res.status(400).json({ error: 'attemptId and answers payload are required' });
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
      if (attempt.status !== 'submitted') {
        await supabase.from('attempts').update({
          status: 'submitted',
          submitted_at: attempt.server_deadline || now.toISOString(),
          submit_reason: 'auto_time'
        }).eq('id', attemptId);
      }
      return res.status(403).json({
        error: 'Exam duration has expired. Submitting attempt automatically.',
        expired: true
      });
    }

    // Normalize answers from either Array or Key-Value Object
    let normalizedAnswers = [];
    if (Array.isArray(answers)) {
      normalizedAnswers = answers;
    } else if (answers && typeof answers === 'object') {
      normalizedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        answer: ans
      }));
    }

    // Filter answers to only save questions belonging to this test
    const { data: testQuestions } = await supabase
      .from('questions')
      .select('id')
      .eq('test_id', attempt.test_id);
    const validQIds = new Set((testQuestions || []).map(q => q.id));

    // Save/upsert answers (only for valid questions belonging to this test)
    const upsertRows = normalizedAnswers
      .map(a => ({
        attempt_id: attemptId,
        question_id: a.questionId || a.question_id,
        answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
        answered_at: new Date().toISOString()
      }))
      .filter(row => validQIds.size === 0 || validQIds.has(row.question_id));

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
    const { submitReason, answers } = req.body; // 'manual', 'auto_time', 'auto_proctor'

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // Persist final answers if provided in submission payload (Array or Object format)
    let normalizedAnswers = [];
    if (Array.isArray(answers)) {
      normalizedAnswers = answers;
    } else if (answers && typeof answers === 'object') {
      normalizedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        answer: ans
      }));
    }

    if (attempt.status === 'submitted') {
      // If client provides answers that may have failed to save earlier due to network drops or token expiry:
      if (normalizedAnswers.length > 0) {
        const { data: testQuestions } = await supabase
          .from('questions')
          .select('id')
          .eq('test_id', attempt.test_id);
        const validQIds = new Set((testQuestions || []).map(q => q.id));

        const upsertRows = normalizedAnswers
          .map(a => ({
            attempt_id: attemptId,
            question_id: a.questionId || a.question_id,
            answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
            answered_at: new Date().toISOString()
          }))
          .filter(row => validQIds.size === 0 || validQIds.has(row.question_id));

        if (upsertRows.length > 0) {
          await supabase.from('attempt_answers').upsert(upsertRows, { onConflict: 'attempt_id,question_id' }).catch(err => {
            console.warn('Upsert on submit notice:', err.message);
          });
          try {
            await recalculateTestScoresAndRanks(attempt.test_id);
          } catch (recalcErr) {
            console.warn('Recalc error:', recalcErr.message);
          }
        }
      }
      return res.status(200).json({ success: true, message: 'Attempt already submitted and answers synchronized', attempt });
    }

    if (normalizedAnswers.length > 0) {
      const { data: testQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('test_id', attempt.test_id);
      const validQIds = new Set((testQuestions || []).map(q => q.id));

      const upsertRows = normalizedAnswers
        .map(a => ({
          attempt_id: attemptId,
          question_id: a.questionId || a.question_id,
          answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
          answered_at: new Date().toISOString()
        }))
        .filter(row => validQIds.size === 0 || validQIds.has(row.question_id));

      if (upsertRows.length > 0) {
        await supabase.from('attempt_answers').upsert(upsertRows, { onConflict: 'attempt_id,question_id' }).catch(err => {
          console.warn('Upsert on submit notice:', err.message);
        });
      }
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

    // Recalculate scores and ranks for this test
    try {
      await recalculateTestScoresAndRanks(attempt.test_id);
    } catch (recalcErr) {
      console.warn('Recalculate on submit notice:', recalcErr.message);
    }

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

/**
 * Synchronize Offline / Late Answers for an Attempt
 * Used by ResponseSheet and Exam recovery when answers stored in localStorage exceed what backend recorded
 */
export const syncAttemptAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;
    const studentId = req.user?.id;
    const studentEmail = req.user?.email;

    if (!attemptId) {
      return res.status(400).json({ success: false, error: 'attemptId is required' });
    }

    if (!answers || (typeof answers !== 'object' && !Array.isArray(answers))) {
      return res.status(400).json({ success: false, error: 'answers payload is required' });
    }

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    // Ownership check: allow student owner, matching email, or admin
    const isOwner = (studentId && attempt.student_id === studentId) ||
                    (studentEmail && attempt.student_email?.toLowerCase() === studentEmail.toLowerCase());
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('email')
        .eq('id', attempt.student_id)
        .maybeSingle();

      if (!studentRecord || studentRecord.email?.toLowerCase() !== studentEmail?.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Access denied: attempt does not belong to you' });
      }
    }

    // Normalize answers
    let normalized = [];
    if (Array.isArray(answers)) {
      normalized = answers.map(a => ({
        question_id: a.questionId || a.question_id,
        answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || '').trim()
      }));
    } else {
      normalized = Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        answer: typeof ans === 'object' ? JSON.stringify(ans) : String(ans || '').trim()
      }));
    }

    // Filter valid question IDs belonging to this test
    const { data: testQuestions, error: qErr } = await supabase
      .from('questions')
      .select('id')
      .eq('test_id', attempt.test_id);

    if (qErr) throw qErr;

    const validQIds = new Set((testQuestions || []).map(q => q.id));

    const rowsToUpsert = normalized
      .filter(a => a.question_id && validQIds.has(a.question_id) && a.answer !== '' && a.answer !== 'null' && a.answer !== 'undefined')
      .map(a => ({
        attempt_id: attemptId,
        question_id: a.question_id,
        answer: a.answer,
        answered_at: new Date().toISOString()
      }));

    if (rowsToUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('attempt_answers')
        .upsert(rowsToUpsert, { onConflict: 'attempt_id,question_id' });

      if (upsertErr) {
        console.error('[SyncAnswers] Upsert error:', upsertErr.message);
        return res.status(500).json({ success: false, error: 'Failed to sync answers: ' + upsertErr.message });
      }

      // Also merge into attempt.answers jsonb
      let mergedAnswers = attempt.answers && typeof attempt.answers === 'object' ? { ...attempt.answers } : {};
      rowsToUpsert.forEach(r => {
        mergedAnswers[r.question_id] = r.answer;
      });
      await supabase.from('attempts').update({ answers: mergedAnswers }).eq('id', attemptId);

      // Recalculate scores and ranks if submitted
      if (attempt.status === 'submitted') {
        try {
          await recalculateTestScoresAndRanks(attempt.test_id);
        } catch (rErr) {
          console.warn('[SyncAnswers] Recalculate warning:', rErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized ${rowsToUpsert.length} answers`,
      syncedCount: rowsToUpsert.length,
      testId: attempt.test_id
    });
  } catch (err) {
    console.error('[SyncAnswers] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during sync', details: err.message });
  }
};

/**
 * Get Attempt Result with Correct Answers (only if submitted + results released)
 * SECURE: correct_answer only returned after admin sets result_released_at on the test
 */
export const getAttemptResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;

    if (!attemptId) return res.status(400).json({ error: 'attemptId is required' });

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts').select('*').eq('id', attemptId).single();

    if (attemptErr || !attempt) return res.status(404).json({ error: 'Attempt not found' });

    if (attempt.status !== 'submitted') {
      return res.status(202).json({ success: true, status: 'in_progress', message: 'Exam not yet submitted' });
    }

    // 2. Fetch test info & verify result release status
    const { data: test } = await supabase
      .from('tests')
      .select('id, title, exam_type, content_type, duration_minutes, response_released_at, status')
      .eq('id', attempt.test_id)
      .maybeSingle();

    const isPyq = test?.content_type === 'pyq';
    const resultReleased = isPyq || test?.status === 'completed' || !!(test?.response_released_at && new Date(test.response_released_at) <= new Date());

    if (!resultReleased && studentId && attempt.student_id && attempt.student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied: results pending' });
    }

    const { data: studentAnswers } = await supabase
      .from('attempt_answers').select('question_id, answer').eq('attempt_id', attemptId);

    const answersMap = {};
    if (studentAnswers) studentAnswers.forEach(a => { answersMap[a.question_id] = a.answer; });

    const questionSelect = resultReleased
      ? 'id, question_text, options, section, type, correct_answer, marks_positive, marks_negative, model_answer, image_url, question_number'
      : 'id, question_text, options, section, type, marks_positive, marks_negative, image_url, question_number';

    const { data: questions } = await supabase
      .from('questions').select(questionSelect)
      .eq('test_id', attempt.test_id)
      .order('question_number', { ascending: true });

    const questionResults = (questions || []).map(q => {
      const studentAns = answersMap[q.id] || null;
      const correctAns = resultReleased ? (q.correct_answer || null) : null;
      const mp = q.marks_positive || 4;
      const mn = Math.abs(q.marks_negative || 1);

      let status = 'unattempted';
      let marksEarned = 0;

      if (studentAns && resultReleased && correctAns) {
        let isCorrect = false;
        if (q.type === 'Numerical') {
          const sNum = parseFloat(String(studentAns).trim());
          const cNum = parseFloat(String(correctAns).trim());
          if (!isNaN(sNum) && !isNaN(cNum)) {
            // Evaluated with numerical equality or 0.01 floating point tolerance
            isCorrect = Math.abs(sNum - cNum) <= 0.01 || String(studentAns).trim() === String(correctAns).trim();
          } else {
            isCorrect = String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
          }
        } else {
          isCorrect = studentAns === correctAns || String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
        }

        if (isCorrect) { status = 'correct'; marksEarned = mp; }
        else { status = 'incorrect'; marksEarned = -mn; }
      } else if (studentAns) {
        status = 'attempted';
      }

      return {
        ...q,
        studentAnswer: studentAns,
        correctAnswer: correctAns,
        solution_explanation: q.model_answer || '',
        status,
        marksEarned: resultReleased ? marksEarned : null
      };
    });

    let totalScore = null, sectionScores = null, rank = null, percentile = null;

    if (resultReleased) {
      totalScore = 0; sectionScores = {};
      questionResults.forEach(q => {
        const sec = q.section || 'General';
        if (!sectionScores[sec]) sectionScores[sec] = { correct: 0, incorrect: 0, unattempted: 0, score: 0 };
        totalScore += (q.marksEarned || 0);
        if (q.status === 'correct') { sectionScores[sec].correct++; sectionScores[sec].score += (q.marksEarned || 0); }
        else if (q.status === 'incorrect') { sectionScores[sec].incorrect++; sectionScores[sec].score += (q.marksEarned || 0); }
        else { sectionScores[sec].unattempted++; }
      });

      const { data: resultRow } = await supabase
        .from('results').select('rank_overall, percentile, raw_score')
        .eq('attempt_id', attemptId).maybeSingle();

      if (resultRow) {
        rank = resultRow.rank_overall;
        percentile = resultRow.percentile;
        totalScore = resultRow.raw_score ?? totalScore;
      }
    }

    return res.status(200).json({
      success: true,
      attempt: { id: attempt.id, status: attempt.status, started_at: attempt.started_at, submitted_at: attempt.submitted_at, warning_count: attempt.warning_count },
      test: { id: test?.id, title: test?.title, exam_type: test?.exam_type, content_type: test?.content_type },
      resultReleased,
      questions: questionResults,
      totalScore, sectionScores, rank, percentile,
      totalQuestions: questionResults.length,
      attempted: questionResults.filter(q => q.status !== 'unattempted').length
    });
  } catch (err) {
    console.error('getAttemptResult error:', err);
    return res.status(500).json({ error: 'Failed to get attempt result', details: err.message });
  }
};

/**
 * Get Paper Solutions and Official Answer Key (for students who missed or want review)
 */
export const getPaperSolutions = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) return res.status(400).json({ error: 'testId is required' });

    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, title, exam_type, content_type, duration_minutes, response_released_at, status')
      .eq('id', testId)
      .maybeSingle();

    if (testErr || !test) return res.status(404).json({ error: 'Test not found' });

    const isPyq = test.content_type === 'pyq';
    const resultReleased = isPyq || test.status === 'completed' || !!(test.response_released_at && new Date(test.response_released_at) <= new Date());

    if (!resultReleased) {
      return res.status(403).json({ success: false, error: 'Results and solutions for this exam have not been declared yet.' });
    }

    const { data: rawQuestions } = await supabase
      .from('questions')
      .select('id, question_text, options, section, correct_answer, marks_positive, marks_negative, model_answer, image_url, question_number')
      .eq('test_id', testId)
      .order('question_number', { ascending: true });

    return res.status(200).json({
      success: true,
      testTitle: test.title,
      examType: test.exam_type,
      totalQuestions: (rawQuestions || []).length,
      questions: (rawQuestions || []).map(q => ({
        ...q,
        solution_explanation: q.model_answer || 'Detailed solution provided by academic panel.'
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch paper solutions', details: err.message });
  }
};
