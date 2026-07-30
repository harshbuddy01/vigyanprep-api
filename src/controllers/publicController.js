import { supabase } from '../db/supabase.js';

export const getPublicTests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_series')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, tests: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tests', details: err.message });
  }
};

export const getPublicPyqs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_series')
      .select('*')
      .eq('is_active', true)
      .ilike('title', '%PYQ%')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, pyqs: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch PYQs', details: err.message });
  }
};

export const getPublicTestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: test, error: testErr } = await supabase
      .from('test_series')
      .select('*')
      .eq('id', id)
      .single();

    if (testErr) throw testErr;

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('test_series_id', id);

    if (qErr) throw qErr;

    return res.status(200).json({
      success: true,
      test,
      questions: questions || []
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch test details', details: err.message });
  }
};
