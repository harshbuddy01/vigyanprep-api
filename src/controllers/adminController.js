import { supabase } from '../db/supabase.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: testCount } = await supabase.from('tests').select('*', { count: 'exact', head: true });
    const { count: questionCount } = await supabase.from('question_bank').select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents: studentCount || 0,
        totalTests: testCount || 0,
        totalQuestions: questionCount || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminProfile = async (req, res) => {
  return res.status(200).json({ success: true, admin: req.admin });
};

export const getNotifications = async (req, res) => {
  return res.status(200).json({ success: true, notifications: [] });
};

export const getNotificationsCount = async (req, res) => {
  return res.status(200).json({ success: true, count: 0 });
};

export const getScheduledTests = async (req, res) => {
  try {
    const { data: tests } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, tests: tests || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getPastTests = async (req, res) => {
  try {
    const { data: tests } = await supabase.from('tests').select('*').eq('status', 'closed').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, tests: tests || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createScheduledTest = async (req, res) => {
  try {
    const { name, title, exam_type, duration_minutes } = req.body;
    const { data: test, error } = await supabase
      .from('tests')
      .insert({
        title: title || name || 'New Test Paper',
        exam_type: exam_type || 'IAT',
        duration_minutes: duration_minutes || 180,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, test });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;
    const { data: test } = await supabase.from('tests').select('*').eq('id', testId).single();
    return res.status(200).json({ success: true, test });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateTestStatus = async (req, res) => {
  try {
    const { testId } = req.params;
    const { status } = req.body;
    const { data: test } = await supabase.from('tests').update({ status }).eq('id', testId).select().single();
    return res.status(200).json({ success: true, test });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { testId } = req.params;
    await supabase.from('tests').delete().eq('id', testId);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAvailableTests = async (req, res) => {
  try {
    const { data: tests } = await supabase.from('tests').select('*');
    return res.status(200).json({ success: true, tests: tests || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
