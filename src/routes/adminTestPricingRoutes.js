import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

// GET ALL PLANS
router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, plans: plans || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE / SAVE PLAN
router.post('/plans', async (req, res) => {
  try {
    const { exam_type, name, duration_days, price, discount_price, active } = req.body;

    if (!exam_type || !name || !price) {
      return res.status(400).json({ success: false, error: 'exam_type, name, and price are required' });
    }

    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        exam_type: exam_type.toUpperCase(),
        name,
        duration_days: parseInt(duration_days) || 30,
        price: parseFloat(price),
        discount_price: discount_price ? parseFloat(discount_price) : null,
        active: active !== undefined ? Boolean(active) : true
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE PLAN
router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { exam_type, name, duration_days, price, discount_price, active } = req.body;

    const { data: plan, error } = await supabase
      .from('plans')
      .update({
        exam_type: exam_type ? exam_type.toUpperCase() : undefined,
        name,
        duration_days: duration_days ? parseInt(duration_days) : undefined,
        price: price ? parseFloat(price) : undefined,
        discount_price: discount_price !== undefined ? parseFloat(discount_price) : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/series', async (req, res) => {
  try {
    const { data: series } = await supabase.from('tests').select('*').eq('content_type', 'test_series').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, testSeries: series || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
