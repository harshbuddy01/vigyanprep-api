import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/stats', async (req, res) => {
  try {
    const { count: totalStudents } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: totalTests } = await supabase.from('tests').select('*', { count: 'exact', head: true });
    const { count: totalAttempts } = await supabase.from('attempts').select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents: totalStudents || 0,
        totalTests: totalTests || 0,
        totalAttempts: totalAttempts || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
