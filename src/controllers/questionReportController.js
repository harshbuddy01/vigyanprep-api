// backend/controllers/questionReportController.js
// 🚩 QUESTION REPORTS (CHALLENGES) CONTROLLER

import { supabase } from '../db/supabase.js';

/**
 * Submit Question Report (Student) with Anti-Spam Constraints
 */
export const submitQuestionReport = async (req, res) => {
  try {
    const { testId, questionId, reason, proofUrl } = req.body;
    const studentId = req.user?.id;

    if (!testId || !questionId || !reason) {
      return res.status(400).json({ error: 'testId, questionId, and reason are required' });
    }

    // 🛡️ Anti-Spam Check 1: Reason length >= 20 characters
    const cleanReason = String(reason).trim();
    if (cleanReason.length < 20) {
      return res.status(400).json({
        error: 'Reason description must be at least 20 characters long.'
      });
    }

    // 🛡️ Anti-Spam Check 2: Max 5 reports per student per test
    const { count } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId)
      .eq('student_id', studentId);

    if (count && count >= 5) {
      return res.status(429).json({
        error: 'You have reached the maximum limit of 5 reports per test.'
      });
    }

    const { data: report, error } = await supabase
      .from('challenges')
      .insert({
        test_id: testId,
        question_id: questionId,
        student_id: studentId,
        reason: cleanReason,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

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
