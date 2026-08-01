// backend/controllers/stagedResultController.js
// 🏆 STAGED RESULT RELEASE & RANK CALCULATION ENGINE

import { supabase } from '../db/supabase.js';

/**
 * Get Student Result by Attempt ID (Respects Staged Release Flags)
 */
export const getStudentResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;

    // 1. Fetch Attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // 2. Fetch Result record
    const { data: result } = await supabase
      .from('results')
      .select('*')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    // 3. Fetch Attempt Answers
    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const stages = result?.published_stages || {
      stage_1_response_sheet: true, // Default: response sheet visible immediately
      stage_2_answer_key: false,
      stage_3_marks: false,
      stage_4_rank_list: false
    };

    // If Stage 2 (Answer Key) is NOT released, strip correct answers from return
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
    console.error('getStudentResult error:', err);
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

    // Update all results for this test
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
 * Admin / System: Calculate Scores and Ranks for a Test Paper
 */
export const calculateTestRanks = async (req, res) => {
  try {
    const { testId } = req.params;

    // 1. Fetch all submitted attempts for this test
    const { data: attempts, error: attErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('status', 'submitted');

    if (attErr) throw attErr;

    // 2. Fetch all questions & answer keys
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

    // Sort by raw_score descending for Overall Rank
    scoredAttempts.sort((a, b) => b.raw_score - a.raw_score);

    const totalStudents = scoredAttempts.length;

    // Calculate overall rank & percentile, then save to results table
    for (let i = 0; i < totalStudents; i++) {
      const item = scoredAttempts[i];
      const rankOverall = i + 1;
      const percentile = totalStudents > 1 ? Number(((totalStudents - rankOverall) / (totalStudents - 1) * 100).toFixed(2)) : 100;

      // Upsert into results
      await supabase.from('results').upsert({
        attempt_id: item.attempt_id,
        org_id: item.org_id,
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
      message: `Calculated ranks for ${totalStudents} students`,
      totalStudents
    });
  } catch (err) {
    console.error('calculateTestRanks error:', err);
    return res.status(500).json({ error: 'Failed to calculate test ranks', details: err.message });
  }
};
