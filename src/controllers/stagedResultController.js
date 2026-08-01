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
        org_id: item.org_id,
        test_id: item.test_id,
        student_id: item.student_id,
        raw_score: item.raw_score,
        section_scores: item.section_scores,
        percentage: Number(((item.raw_score / Math.max(1, questionMap.size * 4)) * 100).toFixed(2)),
        rank_overall: rankOverall,
        percentile: percentile,
        attempt_type: 'live'
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
