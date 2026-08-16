// backend/controllers/stagedResultController.js
// 🏆 STAGED RESULT RELEASE & TWO-TIER RANKING ENGINE

import { supabase } from '../db/supabase.js';

/**
 * Get Student Result by Attempt ID (Respects Staged Release Flags)
 */
export const getStudentResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const { data: result } = await supabase
      .from('results')
      .select('*')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const stages = result?.published_stages || {
      stage_1_response_sheet: true,
      stage_2_answer_key: false,
      stage_3_marks: false,
      stage_4_rank_list: false
    };

    let questionsWithKey = [];
    if (stages.stage_2_answer_key) {
      const { data: qData } = await supabase
        .from('questions')
        .select('id, question_number, section, question_text, options, correct_answer, solution_explanation, image_url')
        .eq('test_id', attempt.test_id);
      questionsWithKey = qData || [];
    }

    return res.status(200).json({
      success: true,
      attempt,
      stages,
      answers: answers || [],
      result: stages.stage_3_marks ? result : null,
      questionsWithKey: stages.stage_2_answer_key ? questionsWithKey : []
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch result', details: err.message });
  }
};

/**
 * Admin: Update Staged Release Controls for a Test
 */
export const updateResultStages = async (req, res) => {
  try {
    const { testId } = req.params;
    const { stage1ResponseSheet, stage2AnswerKey, stage3Marks, stage4RankList } = req.body;

    const stages = {
      stage_1_response_sheet: Boolean(stage1ResponseSheet),
      stage_2_answer_key: Boolean(stage2AnswerKey),
      stage_3_marks: Boolean(stage3Marks),
      stage_4_rank_list: Boolean(stage4RankList)
    };

    const { data, error } = await supabase
      .from('results')
      .update({ published_stages: stages })
      .eq('test_id', testId)
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Result release stages updated successfully',
      updatedCount: (data || []).length,
      stages
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update result stages', details: err.message });
  }
};

/**
 * Admin / System: Calculate Scores and Ranks (Two-Tier & Absent Exclusion)
 */
export const calculateTestRanks = async (req, res) => {
  try {
    const { testId } = req.params;

    // 1. Fetch only SUBMITTED LIVE attempts (Excludes absent & practice attempts)
    const { data: attempts, error: attErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('status', 'submitted')
      .eq('attempt_type', 'live')
      .is('is_absent', false); // 🛡️ ABSENT EXCLUSION: Exclude absent students from ranking denominator

    if (attErr) throw attErr;

    const { data: questions } = await supabase
      .from('questions')
      .select('id, section, correct_answer, marks_positive, marks_negative')
      .eq('test_id', testId);

    const questionMap = new Map();
    (questions || []).forEach(q => questionMap.set(q.id, q));

    const scoredAttempts = [];

    for (const att of (attempts || [])) {
      const { data: answers } = await supabase
        .from('attempt_answers')
        .select('*')
        .eq('attempt_id', att.id);

      let totalRawScore = 0;
      const sectionScores = {};

      (answers || []).forEach(ans => {
        const q = questionMap.get(ans.question_id);
        if (!q) return;

        const sec = q.section || 'Physics';
        if (!sectionScores[sec]) sectionScores[sec] = 0;

        const isCorrect = String(ans.answer).trim().toUpperCase() === String(q.correct_answer).trim().toUpperCase();
        if (isCorrect) {
          const pos = Number(q.marks_positive) || 4;
          totalRawScore += pos;
          sectionScores[sec] += pos;
        } else if (ans.answer && ans.answer.trim() !== '') {
          const neg = Math.abs(Number(q.marks_negative) || 1);
          totalRawScore -= neg;
          sectionScores[sec] -= neg;
        }
      });

      scoredAttempts.push({
        attempt_id: att.id,
        org_id: att.org_id,
        test_id: att.test_id,
        student_id: att.student_id,
        raw_score: totalRawScore,
        section_scores: sectionScores
      });
    }

    // Sort descending by raw score for Live Merit List
    scoredAttempts.sort((a, b) => b.raw_score - a.raw_score);

    // Denominator = total live submitted attempts only (Absent students excluded!)
    const liveDenominator = scoredAttempts.length;

    for (let i = 0; i < liveDenominator; i++) {
      const item = scoredAttempts[i];
      const rankOverall = i + 1;
      const percentile = liveDenominator > 1
        ? Number(((liveDenominator - rankOverall) / (liveDenominator - 1) * 100).toFixed(2))
        : 100;

      await supabase.from('results').upsert({
        attempt_id: item.attempt_id,
        test_id: item.test_id,
        student_id: item.student_id,
        raw_score: item.raw_score,
        section_scores: item.section_scores,
        percentage: Number(((item.raw_score / Math.max(1, questionMap.size * 4)) * 100).toFixed(2)),
        rank_overall: rankOverall,
        percentile: percentile
      }, { onConflict: 'attempt_id' });
    }

    return res.status(200).json({
      success: true,
      message: `Calculated ranks for ${liveDenominator} live test takers. Absent students excluded from denominator.`,
      liveDenominator
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to calculate test ranks', details: err.message });
  }
};

/**
 * Release Results — sets result_released_at on test, sends email to all students
 * Called from Admin UI "Release Results" button
 */
export const releaseResults = async (req, res) => {
  try {
    const testId = req.params.testId || req.params.id;
    if (!testId) return res.status(400).json({ error: 'testId is required' });

    // 1. Fetch test details
    const { data: test, error: testErr } = await supabase
      .from('tests').select('*').eq('id', testId).single();
    if (testErr || !test) return res.status(404).json({ error: 'Test not found' });

    // 2. Set response_released_at on the test
    const releasedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('tests')
      .update({
        response_released_at: releasedAt,
        status: 'completed'
      })
      .eq('id', testId);
    if (updateErr) throw updateErr;

    // 3. Find all submitted attempts for this test
    const { data: attempts, error: attErr } = await supabase
      .from('attempts')
      .select('id, student_id')
      .eq('test_id', testId)
      .eq('status', 'submitted');

    if (attErr) console.warn('Could not fetch attempts for result release:', attErr.message);

    let notified = 0;

    // 4. Send result notification email to each student
    if (attempts && attempts.length > 0) {
      try {
        const { sendEmail } = await import('../services/emailService.js');

        // Fetch student profiles for these attempts
        const studentIds = attempts.map(a => a.student_id).filter(Boolean);
        const { data: studentList } = await supabase
          .from('students')
          .select('id, email, full_name')
          .in('id', studentIds);

        const studentMap = new Map();
        (studentList || []).forEach(s => studentMap.set(s.id, s));

        const testTitle = test.title || test.name || 'Test';
        const examDate = new Date(test.window_start || releasedAt).toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });

        for (const attempt of attempts) {
          const student = studentMap.get(attempt.student_id);
          const email = student?.email;
          const name = student?.full_name || 'Student';
          if (!email) continue;

          // Fetch this student's rank from results table
          const { data: resultRow } = await supabase
            .from('results')
            .select('rank_overall, percentile, raw_score')
            .eq('attempt_id', attempt.id)
            .maybeSingle();

          const rank = resultRow?.rank_overall ? `#${resultRow.rank_overall}` : 'Pending';
          const score = resultRow?.raw_score !== null && resultRow?.raw_score !== undefined ? `${resultRow.raw_score}` : 'Pending';
          const percentile = resultRow?.percentile ? `${resultRow.percentile.toFixed(1)}th Percentile` : '';
          const resultUrl = `https://test.vigyanprep.com/response-sheet?testId=${testId}`;

          const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 30px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10);">
    <div style="background: #1b365d; padding: 32px 32px 24px; border-bottom: 4px solid #f59e0b;">
      <h1 style="color: white; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">🏆 Your Results Are Out!</h1>
      <p style="color: #fcd34d; font-size: 13px; margin: 6px 0 0; font-weight: 600;">VigyanPrep • ${testTitle}</p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="font-size: 15px; color: #374151;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Results for <strong>${testTitle}</strong> held on <strong>${examDate}</strong> have been officially declared.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; text-align: center;">
          <div style="flex: 1; min-width: 100px;">
            <div style="font-size: 28px; font-weight: 900; color: #1b365d;">${score}</div>
            <div style="font-size: 11px; color: #9ca3af; font-weight: 600; margin-top: 4px;">YOUR SCORE</div>
          </div>
          <div style="flex: 1; min-width: 100px;">
            <div style="font-size: 28px; font-weight: 900; color: #059669;">${rank}</div>
            <div style="font-size: 11px; color: #9ca3af; font-weight: 600; margin-top: 4px;">ALL-INDIA RANK</div>
          </div>
          ${percentile ? `<div style="flex: 1; min-width: 100px;">
            <div style="font-size: 18px; font-weight: 900; color: #d97706;">${percentile}</div>
            <div style="font-size: 11px; color: #9ca3af; font-weight: 600; margin-top: 4px;">PERCENTILE</div>
          </div>` : ''}
        </div>
      </div>
      <p style="font-size: 13px; color: #6b7280;">View your complete analysis — correct answers, section scores, and detailed Q&A review:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resultUrl}" style="display: inline-block; background: #1b365d; color: white; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; letter-spacing: 0.5px;">
          📊 View Full Result & Analysis →
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
        You can also download your response sheet and review each question with the official answer key on the results page.
      </p>
    </div>
    <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center;">
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">© 2026 VigyanPrep • IISER & NISER Preparation Platform</p>
    </div>
  </div>
</body>
</html>`;

          try {
            await sendEmail(email, `🏆 Results Declared — ${testTitle} | Your Rank: ${rank}`, html);
            notified++;
          } catch (emailErr) {
            console.error(`Failed to email ${email}:`, emailErr.message);
          }
        }
      } catch (emailImportErr) {
        console.error('Email service not available:', emailImportErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Results released successfully. ${notified} students notified.`,
      notified,
      releasedAt
    });
  } catch (err) {
    console.error('releaseResults error:', err);
    return res.status(500).json({ error: 'Failed to release results', details: err.message });
  }
};

/**
 * Admin: Get all student attempts & live counts for a test
 */
export const getTestAttemptsForAdmin = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) return res.status(400).json({ error: 'testId is required' });

    // Fetch all attempts for this test
    const { data: attempts, error: attErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .order('started_at', { ascending: false });

    if (attErr) throw attErr;

    // Fetch answers count per attempt
    const attemptIds = (attempts || []).map(a => a.id);
    let answerCounts = {};
    if (attemptIds.length > 0) {
      const { data: answers } = await supabase
        .from('attempt_answers')
        .select('attempt_id, question_id')
        .in('attempt_id', attemptIds);

      (answers || []).forEach(ans => {
        answerCounts[ans.attempt_id] = (answerCounts[ans.attempt_id] || 0) + 1;
      });
    }

    // Fetch student details from users / subscriptions
    const studentIds = (attempts || []).map(a => a.student_id).filter(Boolean);
    let studentsMap = {};
    if (studentIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name, name')
        .in('id', studentIds);

      (users || []).forEach(u => {
        studentsMap[u.id] = { name: u.full_name || u.name || 'Student', email: u.email };
      });

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('student_id, student_email, student_name')
        .in('student_id', studentIds);

      (subs || []).forEach(s => {
        if (!studentsMap[s.student_id] || !studentsMap[s.student_id].email) {
          studentsMap[s.student_id] = { name: s.student_name || 'Student', email: s.student_email };
        }
      });
    }

    const enriched = (attempts || []).map(a => ({
      id: a.id,
      student_id: a.student_id,
      student_name: studentsMap[a.student_id]?.name || 'Student',
      student_email: studentsMap[a.student_id]?.email || 'N/A',
      status: a.status,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      warning_count: a.warning_count || 0,
      attempted_count: answerCounts[a.id] || 0
    }));

    return res.status(200).json({
      success: true,
      attempts: enriched,
      count: enriched.length
    });
  } catch (err) {
    console.error('getTestAttemptsForAdmin error:', err);
    return res.status(500).json({ error: 'Failed to fetch test attempts', details: err.message });
  }
};

/**
 * Admin: Get complete candidate response sheet for an attempt
 */
export const getAttemptDetailForAdmin = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!attemptId) return res.status(400).json({ error: 'attemptId is required' });

    const { data: attempt, error: attErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attErr || !attempt) return res.status(404).json({ error: 'Attempt not found' });

    const { data: test } = await supabase
      .from('tests')
      .select('id, title, exam_type')
      .eq('id', attempt.test_id)
      .single();

    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const answersMap = {};
    (answers || []).forEach(a => { answersMap[a.question_id] = a.answer; });

    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_number, section, question_text, text, options, correct_answer, solution_explanation, image_url')
      .eq('test_id', attempt.test_id)
      .order('question_number', { ascending: true });

    // Lookup student name/email
    let studentName = 'Candidate';
    let studentEmail = 'N/A';

    if (attempt.student_id) {
      const { data: user } = await supabase.from('users').select('email, full_name, name').eq('id', attempt.student_id).maybeSingle();
      if (user) {
        studentName = user.full_name || user.name || studentName;
        studentEmail = user.email || studentEmail;
      }
    }

    const enrichedQuestions = (questions || []).map(q => {
      const studentAns = answersMap[q.id] || null;
      const correctAns = q.correct_answer || null;
      let status = 'unattempted';
      if (studentAns) {
        status = (correctAns && studentAns === correctAns) ? 'correct' : 'incorrect';
      }
      return {
        ...q,
        studentAnswer: studentAns,
        status
      };
    });

    return res.status(200).json({
      success: true,
      attempt,
      studentName,
      studentEmail,
      test,
      questions: enrichedQuestions,
      attempted_count: Object.keys(answersMap).length,
      total_questions: (questions || []).length
    });
  } catch (err) {
    console.error('getAttemptDetailForAdmin error:', err);
    return res.status(500).json({ error: 'Failed to fetch attempt details', details: err.message });
  }
};
