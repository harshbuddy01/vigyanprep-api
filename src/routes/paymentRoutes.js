import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Payment gateway online' });
});

export default router;
