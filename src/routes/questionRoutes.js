import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/', async (req, res) => {
  try {
    const { data: questions } = await supabase.from('question_bank').select('*').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, questions: questions || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/questions — Create a new question directly in the questions table
router.post('/', async (req, res) => {
  try {
    const { test_id, section, question_number, question_text, type, options, correct_answer, image_url } = req.body;

    if (!test_id) {
      return res.status(400).json({ success: false, error: 'test_id is required' });
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        test_id,
        section: section || 'Physics',
        question_number: question_number || 1,
        question_text: question_text || 'New Question',
        type: type || 'MCQ',
        question_type: type || 'MCQ',
        options: Array.isArray(options) && options.length === 4 ? options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: correct_answer || 'A',
        image_url: image_url || null,
        marks_positive: 4,
        marks_negative: 1,
        status: 'approved'
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, question: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;