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

    let combinedStudents = [...usersList, ...studentsList];
    if (authList.length > 0) {
      const mappedAuth = authList.map(u => ({
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
      .select('amount, created_at, verified_at, status');

    const capturedPayments = (payments || []).filter(p => p.status === 'captured');
    const totalRevenue = capturedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Generate real daily revenue trend from the last 7 days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyRevenue = {};
    dayNames.forEach(d => { dailyRevenue[d] = 0; });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    capturedPayments.forEach(p => {
      const paymentDate = new Date(p.verified_at || p.created_at);
      if (paymentDate >= sevenDaysAgo) {
        const dayName = dayNames[paymentDate.getDay()];
        dailyRevenue[dayName] += Number(p.amount) || 0;
      }
    });

    // Order trend starting from today going back 7 days
    const today = new Date().getDay();
    const orderedTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      const name = dayNames[dayIndex];
      orderedTrend.push({ name, revenue: dailyRevenue[name] });
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents: uniqueStudents.length,
        activeTests: testCount || 0,
        totalAttempts: attemptCount || 0,
        activeUsers: uniqueStudents.length,
        revenue: totalRevenue,
        revenueTrend: orderedTrend
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
