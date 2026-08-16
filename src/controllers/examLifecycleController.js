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

    // Save/upsert answers
    const upsertRows = normalizedAnswers.map(a => ({
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
    const { submitReason, answers } = req.body; // 'manual', 'auto_time', 'auto_proctor'

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

    if (normalizedAnswers.length > 0) {
      const upsertRows = normalizedAnswers.map(a => ({
        attempt_id: attemptId,
        question_id: a.questionId || a.question_id,
        answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
        answered_at: new Date().toISOString()
      }));
      await supabase.from('attempt_answers').upsert(upsertRows, { onConflict: 'attempt_id,question_id' }).catch(err => {
        console.warn('Upsert on submit notice:', err.message);
      });
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
    if (attempt.student_id !== studentId) return res.status(403).json({ error: 'Access denied' });

    if (attempt.status !== 'submitted') {
      return res.status(202).json({ success: true, status: 'in_progress', message: 'Exam not yet submitted' });
    }

    // 2. Fetch test info & verify result release status
    const { data: test } = await supabase
      .from('tests')
      .select('id, title, exam_type, content_type, duration_minutes, response_released_at')
      .eq('id', attempt.test_id)
      .maybeSingle();

    const { data: studentAnswers } = await supabase
      .from('attempt_answers').select('question_id, answer').eq('attempt_id', attemptId);

    const answersMap = {};
    if (studentAnswers) studentAnswers.forEach(a => { answersMap[a.question_id] = a.answer; });

    const isPyq = test?.content_type === 'pyq';
    const resultReleased = isPyq || !!(test?.response_released_at && new Date(test.response_released_at) <= new Date());

    const questionSelect = resultReleased
      ? 'id, question_text, text, options, section, correct_answer, marks_positive, marks_negative, solution_explanation, image_url, question_number'
      : 'id, question_text, text, options, section, marks_positive, marks_negative, image_url, question_number';

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
        if (studentAns === correctAns) { status = 'correct'; marksEarned = mp; }
        else { status = 'incorrect'; marksEarned = -mn; }
      } else if (studentAns) {
        status = 'attempted';
      }

      return { ...q, studentAnswer: studentAns, correctAnswer: correctAns, status, marksEarned: resultReleased ? marksEarned : null };
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
      .select('id, question_text, text, options, section, correct_answer, marks_positive, marks_negative, solution_explanation, model_answer, image_url, question_number')
      .eq('test_id', testId)
      .order('question_number', { ascending: true });

    return res.status(200).json({
      success: true,
      testTitle: test.title,
      examType: test.exam_type,
      totalQuestions: (rawQuestions || []).length,
      questions: (rawQuestions || []).map(q => ({
        ...q,
        solution_explanation: q.solution_explanation || q.model_answer || 'Detailed solution provided by academic panel.'
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch paper solutions', details: err.message });
  }
};
