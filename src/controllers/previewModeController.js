// backend/controllers/previewModeController.js
// 🔍 PREVIEW MODE QUALITY GATE & PREVIEW INVALIDATION ENGINE

import { supabase } from '../db/supabase.js';

/**
 * Submit Admin Preview Attempt (Sets preview_status = 'valid')
 */
export const submitPreviewAttempt = async (req, res) => {
  try {
    const { testId, answers } = req.body;
    const adminId = req.user?.id;

    if (!testId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'testId and answers array required' });
    }

    // Fetch questions to evaluate accuracy
    const { data: questions } = await supabase
      .from('questions')
      .select('id, section, correct_answer, marks_positive, marks_negative')
      .eq('test_id', testId);

    const questionMap = new Map();
    (questions || []).forEach(q => questionMap.set(q.id, q));

    let correctCount = 0;
    let score = 0;

    answers.forEach(ans => {
      const q = questionMap.get(ans.question_id);
      if (!q) return;

      const isCorrect = String(ans.answer).trim().toUpperCase() === String(q.correct_answer).trim().toUpperCase();
      if (isCorrect) {
        correctCount++;
        score += Number(q.marks_positive) || 4;
      } else if (ans.answer && ans.answer.trim() !== '') {
        score -= Math.abs(Number(q.marks_negative) || 1);
      }
    });

    // Record preview run (resilient: log warning if table is missing)
    let run = null;
    try {
      const { data, error: runErr } = await supabase
        .from('preview_runs')
        .insert({
          test_id: testId,
          admin_id: adminId || '00000000-0000-0000-0000-000000000001',
          score,
          total_questions: (questions || []).length,
          correct_count: correctCount,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (runErr) {
        console.warn('⚠️ Could not save to preview_runs table:', runErr.message);
      } else {
        run = data;
      }
    } catch (err) {
      console.warn('⚠️ Exception saving to preview_runs table:', err.message);
    }

    // ✅ Set test preview status to valid
    await supabase.from('tests').update({ preview_status: 'valid' }).eq('id', testId);

    return res.status(200).json({
      success: true,
      previewRun: run,
      score,
      correctCount,
      totalQuestions: (questions || []).length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record preview run', details: err.message });
  }
};

/**
 * 🔒 Invalidate Preview Status (Triggered whenever any question/answer key in test is edited)
 */
export async function invalidatePreviewStatus(testId) {
  try {
    await supabase
      .from('tests')
      .update({ preview_status: 'invalidated', status: 'draft' })
      .eq('id', testId);
    return true;
  } catch (err) {
    console.error('Error invalidating preview:', err);
    return false;
  }
}

/**
 * Endpoint to check if test is eligible for Freeze
 */
export const checkFreezeEligibility = async (req, res) => {
  try {
    const { testId } = req.params;
    const { data: test } = await supabase.from('tests').select('preview_status, status').eq('id', testId).single();

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const isEligible = test.preview_status === 'valid';

    return res.status(200).json({
      success: true,
      eligibleForFreeze: isEligible,
      previewStatus: test.preview_status,
      message: isEligible
        ? 'Test is preview-validated and ready for Freeze.'
        : 'Must complete at least one admin Preview run before freezing this test paper.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Eligibility check failed', details: err.message });
  }
};
