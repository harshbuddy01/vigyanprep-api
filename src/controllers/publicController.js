import { supabase } from '../db/supabase.js';

export const getPublicPyqs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('id, title, exam_type, pyq_year, duration_minutes, status, window_start, window_end, content_type, created_at')
      .neq('content_type', 'test_series')
      .or('status.neq.draft,status.is.null')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(t => ({
      ...t,
      name: t.title,
      examType: t.exam_type,
      year: t.pyq_year ? String(t.pyq_year) : null
    }));

    return res.status(200).json({ success: true, papers: mapped });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch PYQs', details: err.message });
  }
};

export const getPublicTests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('id, title, exam_type, pyq_year, duration_minutes, status, window_start, window_end, content_type, created_at')
      .eq('content_type', 'test_series')
      .or('status.neq.draft,status.is.null')
      .order('window_start', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(t => ({
      ...t,
      name: t.title,
      examType: t.exam_type,
      year: t.pyq_year ? String(t.pyq_year) : null
    }));

    return res.status(200).json({ success: true, tests: mapped });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tests', details: err.message });
  }
};

export const getPublicPlans = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, plans: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch plans', details: err.message });
  }
};

export const getPublicTestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: test } = await supabase.from('tests').select('*').eq('id', id).single();

    if (!test) return res.status(404).json({ error: 'Test paper not found' });

    let { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', id)
      .order('question_number', { ascending: true });

    // 🛡️ SECURITY SAFEGUARD: Strip out correct_answer & solution_explanation for public callers
    const sanitizedQuestions = (questions || []).map(q => ({
      id: q.id,
      question_number: q.question_number,
      section: q.section,
      question_text: q.question_text || q.body || q.text,
      type: q.type || q.question_type || 'MCQ',
      options: q.options,
      image_url: q.image_url || q.imageUrl || null
    }));

    return res.status(200).json({
      success: true,
      test: {
        id: test.id,
        title: test.title || test.name,
        examType: test.exam_type || test.test_type || 'IAT',
        exam_type: test.exam_type || test.test_type || 'IAT',
        pyq_year: test.pyq_year || test.year || null,
        year: test.pyq_year || test.year || null,
        duration_minutes: test.duration_minutes || 180,
        questions_count: test.questions_count || (sanitizedQuestions ? sanitizedQuestions.length : 60),
        total_marks: test.total_marks || (sanitizedQuestions ? sanitizedQuestions.length * 4 : 240),
        window_start: test.window_start,
        window_end: test.window_end
      },
      questions: sanitizedQuestions
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch test details', details: err.message });
  }
};
