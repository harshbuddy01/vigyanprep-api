// backend/controllers/questionReportController.js
// 🚩 QUESTION REPORTS (CHALLENGES) CONTROLLER

import { supabase } from '../db/supabase.js';

/**
 * Submit Question Report (Student) with Anti-Spam Constraints
 */
export const submitQuestionReport = async (req, res) => {
  try {
    const { testId, questionId, reason, proofUrl, attemptId, studentId: directStudentId } = req.body;

    if (!testId || !questionId || !reason) {
      return res.status(400).json({ error: 'testId, questionId, and reason are required' });
    }

    const cleanReason = String(reason).trim();
    if (cleanReason.length < 10) {
      return res.status(400).json({
        error: 'Reason description must be at least 10 characters long.'
      });
    }

    // Resolve valid student_id
    let effectiveStudentId = req.user?.id || directStudentId;
    if (!effectiveStudentId && attemptId) {
      const { data: att } = await supabase.from('attempts').select('student_id').eq('id', attemptId).maybeSingle();
      if (att?.student_id) effectiveStudentId = att.student_id;
    }
    if (!effectiveStudentId) {
      const { data: latestAtt } = await supabase.from('attempts').select('student_id').eq('test_id', testId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (latestAtt?.student_id) effectiveStudentId = latestAtt.student_id;
    }
    if (!effectiveStudentId) {
      const { data: firstStudent } = await supabase.from('students').select('id').limit(1).maybeSingle();
      if (firstStudent?.id) effectiveStudentId = firstStudent.id;
    }

    const { data: report, error } = await supabase
      .from('challenges')
      .insert({
        test_id: testId,
        question_id: questionId,
        student_id: effectiveStudentId,
        reason: cleanReason,
        proof_image_url: proofUrl || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Challenge insert error:', error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Question report submitted successfully',
      report
    });
  } catch (err) {
    console.error('submitQuestionReport error:', err);
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
