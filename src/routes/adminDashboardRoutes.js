import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/stats', async (req, res) => {
  try {
    const fetchUsers = supabase.from('users').select('*').then(r => r.data || []).catch(() => []);
    const fetchStudents = supabase.from('students').select('*').then(r => r.data || []).catch(() => []);

    let fetchAuth = Promise.resolve([]);
    if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.listUsers === 'function') {
      fetchAuth = supabase.auth.admin.listUsers()
        .then(r => r.data?.users || [])
        .catch(() => []);
    }

    const [usersList, studentsList, authList] = await Promise.all([
      fetchUsers,
      fetchStudents,
      fetchAuth
    ]);

    let combinedStudents: any[] = [...usersList, ...studentsList];
    if (authList.length > 0) {
      const mappedAuth = authList.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'Student'),
        role: u.user_metadata?.role || 'student',
        created_at: u.created_at
      }));
      combinedStudents.push(...mappedAuth);
    }

    const uniqueStudents = Array.from(
      new Map(
        combinedStudents
          .filter(s => s.email && s.role !== 'super_admin')
          .map(s => [s.email.toLowerCase(), s])
      ).values()
    );

    // 2. Fetch real active PAID test series count (EXCLUDING free PYQ papers)
    const { count: testCount } = await supabase
      .from('tests')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'test_series');

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
        totalStudents: uniqueStudents.length,
        activeTests: testCount || 0,
        totalAttempts: attemptCount || 0,
        activeUsers: uniqueStudents.length,
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
