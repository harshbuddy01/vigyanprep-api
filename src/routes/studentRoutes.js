import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/', async (req, res) => {
  try {
    const { data: students } = await supabase.from('users').select('*').eq('role', 'student').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, students: students || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
