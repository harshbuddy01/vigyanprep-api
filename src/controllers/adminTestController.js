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
    const { testId } = req.params;
    const { questions, question } = req.body;

    // Support both single question and array of questions
    const questionsToInsert = questions || (question ? [question] : []);

    if (questionsToInsert.length === 0) {
      // If just basic fields sent directly (not wrapped in questions/question)
      const { section, question_number, question_text, type, options, correct_answer, image_url } = req.body;
      if (question_text || section) {
        questionsToInsert.push({ section, question_number, question_text, type, options, correct_answer, image_url });
      }
    }

    if (questionsToInsert.length === 0) {
      return res.status(400).json({ success: false, error: 'No questions provided' });
    }

    const rows = questionsToInsert.map((q, idx) => ({
      test_id: testId,
      section: q.section || 'Physics',
      question_number: q.question_number || idx + 1,
      question_text: q.question_text || q.text || 'New Question',
      type: q.type || 'MCQ',
      question_type: q.type || 'MCQ',
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: q.correct_answer || q.correctAnswer || 'A',
      image_url: q.image_url || q.imageUrl || null,
      marks_positive: q.marks_positive || 4,
      marks_negative: q.marks_negative || 1,
      status: 'approved'
    }));

    const { data, error } = await supabase
      .from('questions')
      .insert(rows)
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      questions: data,
      question: data && data.length === 1 ? data[0] : undefined,
      insertedCount: data ? data.length : 0
    });
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
