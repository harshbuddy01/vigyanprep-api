// backend/controllers/examController.js
// 🎯 SECURED SUPABASE-NATIVE EXAM CONTROLLER

import { supabase } from "../db/supabase.js";
import { generateAuthToken } from '../middlewares/auth.js';

/**
 * List all active/scheduled tests
 */
export const listScheduledTests = async (req, res) => {
  try {
    const { data: tests, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      tests: tests || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch scheduled tests' });
  }
};

/**
 * Get Public Test Series
 */
export const getPublicTestSeries = async (req, res) => {
  try {
    const { data: series, error } = await supabase
      .from('test_series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      testSeries: series || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch test series' });
  }
};

/**
 * Start Test (Returns JWT & Attempt Details)
 */
export const startTest = async (req, res) => {
  try {
    const { email, testId } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check user in Supabase
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!user) {
      // Create student user record
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          role: 'student',
          password_hash: 'N/A'
        })
        .select()
        .single();
      user = newUser;
    }

    const token = generateAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
      org_id: user.org_id
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (err) {
    console.error('startTest error:', err);
    return res.status(500).json({ success: false, message: 'Server error during test start' });
  }
};

/**
 * Get Questions for an Exam (Stripped of correct_answer)
 */
export const getQuestions = async (req, res) => {
  try {
    const testId = req.query.testId || req.params.testId;

    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_number', { ascending: true });

    if (error) throw error;

    // 🛡️ SECURITY SAFEGUARD: Strip out correct_answer during live attempts
    const sanitized = (questions || []).map(q => ({
      id: q.id,
      question_number: q.question_number,
      section: q.section || 'Physics',
      type: q.type || q.question_type || 'MCQ',
      question_text: q.question_text || q.body || q.text,
      options: q.options || [],
      image_url: q.image_url || q.imageUrl || null
    }));

    return res.status(200).json({
      success: true,
      questions: sanitized
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
};

/**
 * Submit Exam Answers
 */
export const submitExam = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    const studentId = req.user?.id;

    if (!attemptId) {
      return res.status(400).json({ success: false, message: 'attemptId is required' });
    }

    // Save individual answers to attempt_answers table (if answers provided)
    if (answers && typeof answers === 'object') {
      const answerEntries = Object.entries(answers);
      for (const [questionId, answer] of answerEntries) {
        await supabase
          .from('attempt_answers')
          .upsert({
            attempt_id: attemptId,
            question_id: questionId,
            selected_answer: String(answer),
            updated_at: new Date().toISOString()
          }, { onConflict: 'attempt_id,question_id' });
      }
    }

    // Update attempt status only (no answers column — it doesn't exist in the schema)
    const { data: attempt, error: attErr } = await supabase
      .from('attempts')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submit_reason: 'manual'
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (attErr) throw attErr;

    return res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      attempt
    });
  } catch (err) {
    console.error('❌ submitExam error:', err);
    return res.status(500).json({ success: false, message: 'Error submitting exam' });
  }
};

/**
 * Get Student Results
 */
export const getStudentResults = async (req, res) => {
  try {
    const studentId = req.user?.id;

    const { data: results, error } = await supabase
      .from('results')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      results: results || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch student results' });
  }
};

/**
 * Get User Info
 */
export const getUserInfo = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user info' });
  }
};

/**
 * Verify Access
 */
export const verifyAccess = async (req, res) => {
  return res.status(200).json({ success: true, access: true });
};
