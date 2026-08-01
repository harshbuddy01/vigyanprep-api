import { supabase } from '../db/supabase.js';

export const getPublicTests = async (req, res) => {
  try {
    const { data: testsData } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
    const { data: seriesData } = await supabase.from('test_series').select('*').order('created_at', { ascending: false });

    const combinedMap = new Map();
    [...(testsData || []), ...(seriesData || [])].forEach(item => {
      if (item && item.id && !combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    });

    const combined = Array.from(combinedMap.values());
    return res.status(200).json({ success: true, tests: combined, pyqs: combined });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tests', details: err.message });
  }
};

export const getPublicPyqs = async (req, res) => {
  try {
    const { data: testsData } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
    const { data: seriesData } = await supabase.from('test_series').select('*').order('created_at', { ascending: false });

    const combinedMap = new Map();
    [...(testsData || []), ...(seriesData || [])].forEach(item => {
      if (item && item.id && !combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    });

    const combined = Array.from(combinedMap.values());
    return res.status(200).json({ success: true, tests: combined, pyqs: combined });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch PYQs', details: err.message });
  }
};

export const getPublicTestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let test = null;

    const res1 = await supabase.from('tests').select('*').eq('id', id).single();
    if (res1.data) {
      test = res1.data;
    } else {
      const res2 = await supabase.from('test_series').select('*').eq('id', id).single();
      test = res2.data;
    }

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
      // 🔒 Note: correct_answer & solution intentionally omitted during live test!
    }));

    return res.status(200).json({
      success: true,
      test: {
        id: test.id,
        title: test.title || test.name,
        examType: test.exam_type || test.test_type || 'IAT',
        duration_minutes: test.duration_minutes || 180
      },
      questions: sanitizedQuestions
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch test details', details: err.message });
  }
};
