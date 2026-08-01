import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/summary', async (req, res) => {
  try {
    const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: attemptCount } = await supabase.from('attempts').select('*', { count: 'exact', head: true });
    const { count: testCount } = await supabase.from('tests').select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      summary: {
        students: studentCount || 0,
        attempts: attemptCount || 0,
        tests: testCount || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
