// backend/controllers/questionReportController.js
// 🚩 QUESTION REPORTS (CHALLENGES) CONTROLLER

import { supabase } from '../db/supabase.js';

/**
 * Submit Question Report (Student) with Anti-Spam Constraints
 */
export const submitQuestionReport = async (req, res) => {
  try {
    const { testId, questionId, reason, proofUrl } = req.body;
    const studentId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    if (!testId || !questionId || !reason) {
      return res.status(400).json({ error: 'testId, questionId, and reason are required' });
    }

    // 🛡️ Anti-Spam Check 1: Reason length >= 10 characters
    const cleanReason = String(reason).trim();
    if (cleanReason.length < 10) {
      return res.status(400).json({
        error: 'Reason description must be at least 10 characters long.'
      });
    }

    const { data: report, error } = await supabase
      .from('challenges')
      .insert({
        test_id: testId,
        question_id: questionId,
        student_id: studentId,
        reason: cleanReason,
        proof_image_url: proofUrl || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // If student_id foreign key constraint triggers with guest ID, insert without student_id
      const { data: retryReport, error: retryErr } = await supabase
        .from('challenges')
        .insert({
          test_id: testId,
          question_id: questionId,
          reason: cleanReason,
          proof_image_url: proofUrl || null,
          status: 'pending'
        })
        .select()
        .single();

      if (retryErr) throw retryErr;
      return res.status(200).json({
        success: true,
        message: 'Question report submitted successfully',
        report: retryReport
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Question report submitted successfully',
      report
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit question report', details: err.message });
  }
};

/**
 * Resolve Question Report (Admin)
 */
export const resolveQuestionReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolution, newAnswer, adminNote } = req.body; // 'answer_changed' | 'dropped' | 'rejected'

    const { data: report } = await supabase.from('challenges').select('*').eq('id', reportId).single();
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (resolution === 'answer_changed' && newAnswer) {
      // Update correct answer in questions table
      await supabase.from('questions').update({ correct_answer: newAnswer }).eq('id', report.question_id);
    }

    await supabase
      .from('challenges')
      .update({
        status: 'resolved'
      })
      .eq('id', reportId);

    return res.status(200).json({
      success: true,
      message: `Report resolved with action: ${resolution}`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Resolution failed', details: err.message });
  }
};
