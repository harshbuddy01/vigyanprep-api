// backend/routes/adminTestSeriesRoutes.js
// 🎯 ADMIN TEST SERIES MANAGEMENT & SERVER-SIDE FREEZE GATE

import express from 'express';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';
import { supabase } from '../db/supabase.js';

const router = express.Router();
router.use(verifyAdminAuth);

// LIST — test series only
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('content_type', 'test_series')
      .order('window_start', { ascending: false });

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, tests: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE — must persist the window (24h Allen Model)
router.post('/', async (req, res) => {
  try {
    const { title, name, exam_type, window_start, window_end, duration_minutes, description } = req.body;
    const testTitle = title || name;

    if (!testTitle || !exam_type || !window_start || !window_end) {
      return res.status(400).json({
        success: false,
        error: 'title, exam_type, window_start and window_end are required'
      });
    }

    if (new Date(window_end) <= new Date(window_start)) {
      return res.status(400).json({
        success: false,
        error: 'window_end must be after window_start'
      });
    }

    const { data, error } = await supabase
      .from('tests')
      .insert({
        title: testTitle,
        exam_type: exam_type.toUpperCase(),
        content_type: 'test_series',
        window_start,
        window_end,
        duration_minutes: duration_minutes || 180,
        description,
        status: 'draft',
        preview_status: 'pending'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, test: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// FREEZE — enforce the preview gate server-side
router.put('/:id/freeze', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: test } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .eq('content_type', 'test_series')
      .single();

    if (!test) {
      return res.status(404).json({ success: false, error: 'Test series paper not found' });
    }

    if (test.preview_status !== 'valid') {
      return res.status(409).json({
        success: false,
        code: 'PREVIEW_REQUIRED',
        error: 'Complete an admin preview run before freezing this paper.'
      });
    }

    const { data, error } = await supabase
      .from('tests')
      .update({
        status: 'frozen',
        frozen_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, test: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE test details (Title, Exam Type, Window Start/End, Duration)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, name, exam_type, window_start, window_end, duration_minutes, description } = req.body;

    const updates = {};
    if (title || name) updates.title = title || name;
    if (exam_type) updates.exam_type = exam_type.toUpperCase();
    if (window_start) updates.window_start = window_start;
    if (window_end) updates.window_end = window_end;
    if (duration_minutes) updates.duration_minutes = parseInt(duration_minutes, 10);
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabase
      .from('tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, test: data, message: 'Test details updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE test
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, message: 'Test deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
