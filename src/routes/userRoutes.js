import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();
router.use(verifyAuth);

router.get('/profile', async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
