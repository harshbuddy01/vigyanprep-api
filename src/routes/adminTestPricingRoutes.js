import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/series', async (req, res) => {
  try {
    const { data: series } = await supabase.from('test_series').select('*').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, testSeries: series || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
