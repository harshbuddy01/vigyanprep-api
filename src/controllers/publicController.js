import { supabase } from '../db/supabase.js';

export const getPublicPyqs = async (req, res) => {
  try {
    // Fetch ALL tests that are not explicitly test_series content
    // Include: content_type='pyq', content_type=null, and any other non-test_series
    // Exclude: status='draft' (only show published/ongoing/null status)
    const { data, error } = await supabase
      .from('tests')
      .select('id, title, exam_type, pyq_year, duration_minutes, status, window_start, window_end, content_type, response_released_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter in JS for strict and reliable segregation
    const filtered = (data || []).filter(t => {
      // Exclude test_series content
      if (t.content_type === 'test_series') return false;
      // Exclude drafts
      if (t.status === 'draft') return false;
      // Must be designated PYQ or have PYQ year / title
      const isPyq = t.content_type === 'pyq' || !!t.pyq_year || (t.title && (t.title.toUpperCase().includes('PYQ') || t.title.toUpperCase().includes('OFFICIAL PAPER')));
      return isPyq;
    });

    const mapped = filtered.map(t => ({
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
      .select('id, title, exam_type, pyq_year, duration_minutes, status, window_start, window_end, content_type, response_released_at, created_at')
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

    // 🛡️ SECURITY SAFEGUARD: Do NOT leak questions for paid test series to anonymous public callers
    const isTestSeries = test.content_type === 'test_series';
    const sanitizedQuestions = isTestSeries
      ? [] // Strict protection for live test series
      : (questions || []).map(q => ({
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
        content_type: test.content_type || 'test_series',
        status: test.status || 'ongoing',
        response_released_at: test.response_released_at || null,
        pyq_year: test.pyq_year || test.year || null,
        year: test.pyq_year || test.year || null,
        duration_minutes: test.duration_minutes || 180,
        questions_count: test.questions_count || (questions ? questions.length : 60),
        total_marks: test.total_marks || (questions ? questions.length * 4 : 240),
        window_start: test.window_start,
        window_end: test.window_end
      },
      questions: sanitizedQuestions
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch test details', details: err.message });
  }
};

let globalSettings = {
  maintenanceMode: false,
  siteName: "VIGYAN.PREP",
  supportEmail: "support@vigyanprep.com"
};

export const getPublicSettings = async (req, res) => {
  return res.status(200).json({ success: true, settings: globalSettings });
};

export const updatePublicSettings = async (req, res) => {
  try {
    const { maintenanceMode, siteName, supportEmail } = req.body;
    if (typeof maintenanceMode === 'boolean') {
      globalSettings.maintenanceMode = maintenanceMode;
    }
    if (siteName) globalSettings.siteName = siteName;
    if (supportEmail) globalSettings.supportEmail = supportEmail;
    return res.status(200).json({ success: true, settings: globalSettings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
};
