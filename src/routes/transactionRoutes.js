import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/', async (req, res) => {
  try {
    const { data: payments } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, transactions: payments || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
