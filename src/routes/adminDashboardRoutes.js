import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/stats', async (req, res) => {
  try {
    // 1. Fetch real student count from database
    const { count: studentCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 2. Fetch real active tests count from database
    const { count: testCount } = await supabase
      .from('tests')
      .select('*', { count: 'exact', head: true });

    // 3. Fetch real attempt count from database
    const { count: attemptCount } = await supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true });

    // 4. Fetch real payments from database
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, created_at, verified_at');

    const totalRevenue = (payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents: studentCount || 0,
        activeTests: testCount || 0,
        totalAttempts: attemptCount || 0,
        activeUsers: studentCount || 0,
        revenue: totalRevenue,
        revenueTrend: [
          { name: 'Mon', revenue: 0 },
          { name: 'Tue', revenue: 0 },
          { name: 'Wed', revenue: 0 },
          { name: 'Thu', revenue: 0 },
          { name: 'Fri', revenue: 0 },
          { name: 'Sat', revenue: 0 },
          { name: 'Sun', revenue: totalRevenue }
        ]
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
