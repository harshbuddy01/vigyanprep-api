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
    let testErr = null;

    // 1. Try 'tests' table first
    const res1 = await supabase.from('tests').select('*').eq('id', id).single();
    if (res1.data) {
      test = res1.data;
    } else {
      // 2. Fallback to 'test_series'
      const res2 = await supabase.from('test_series').select('*').eq('id', id).single();
      test = res2.data;
      testErr = res2.error;
    }

    if (!test) throw testErr || new Error('Test not found');

    // 3. Fetch questions linked by test_id or test_series_id
    let { data: questions } = await supabase
      .from('questions')
      .select('*')
      .or(`test_id.eq.${id},test_series_id.eq.${id}`)
      .order('question_number', { ascending: true });

    if (!questions || questions.length === 0) {
      const qRes2 = await supabase.from('questions').select('*').eq('test_id', id).order('question_number', { ascending: true });
      questions = qRes2.data || [];
    }

    return res.status(200).json({
      success: true,
      test,
      title: test.title,
      examType: test.exam_type || test.test_type || 'IAT',
      questions: questions || []
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch test details', details: err.message });
  }
};
