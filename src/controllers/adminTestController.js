import { supabase } from '../db/supabase.js';

export const getUpcomingTests = async (req, res) => {
  try {
    const { data: tests } = await supabase.from('tests').select('*').order('scheduled_start', { ascending: true });
    return res.status(200).json({ success: true, tests: tests || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getQuestionsBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    const { data: questions } = await supabase.from('question_bank').select('*').ilike('subject', subject);
    return res.status(200).json({ success: true, questions: questions || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getTestQuestions = async (req, res) => {
  try {
    const { testId } = req.params;
    const { data: questions } = await supabase.from('questions').select('*').eq('test_id', testId).order('question_number', { ascending: true });
    return res.status(200).json({ success: true, questions: questions || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const addQuestionsToTest = async (req, res) => {
  try {
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const removeQuestionsFromTest = async (req, res) => {
  try {
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getTestPreview = async (req, res) => {
  try {
    const { testId } = req.params;
    const { data: test } = await supabase.from('tests').select('*').eq('id', testId).single();
    return res.status(200).json({ success: true, test });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const finalizeTest = async (req, res) => {
  try {
    const { testId } = req.params;
    await supabase.from('tests').update({ status: 'ready' }).eq('id', testId);
    return res.status(200).json({ success: true });
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

export const rescheduleTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { scheduled_start, scheduled_end } = req.body;
    await supabase.from('tests').update({ scheduled_start, scheduled_end }).eq('id', testId);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
