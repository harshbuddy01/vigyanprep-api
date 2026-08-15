import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();

// All routes require student authentication
router.use(verifyAuth);

// Disable browser cache for student routes to prevent showing stale cached data
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// GET /api/student/subscriptions — Returns the student's active subscriptions with plan details
router.get('/subscriptions', async (req, res) => {
  try {
    const studentId = req.user?.id;
    const studentEmail = req.user?.email;

    if (!studentId && !studentEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // 1. Query student subscriptions
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    if (studentId && isUUID(studentId) && studentEmail) {
      query = query.or(`student_id.eq.${studentId},student_email.ilike."${studentEmail.trim()}"`);
    } else if (studentId && isUUID(studentId)) {
      query = query.eq('student_id', studentId);
    } else if (studentEmail) {
      query = query.eq('student_email', studentEmail.trim());
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Subscriptions fetch error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 2. Safely fetch plan details for extracted plan IDs
    const planIds = [...new Set((subscriptions || []).map(s => s.plan_id).filter(Boolean))];
    let plansMap = {};
    if (planIds.length > 0) {
      const { data: plansData } = await supabase.from('plans').select('*').in('id', planIds);
      (plansData || []).forEach(p => { plansMap[p.id] = p; });
    }

    // 3. Enriched active subscriptions
    const activeSubscriptions = (subscriptions || [])
      .filter(sub => sub.status === 'active')
      .map(sub => {
        const expiresAt = new Date(sub.expires_at);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        return {
          ...sub,
          plan: plansMap[sub.plan_id] || {
            id: sub.plan_id,
            name: sub.plan_name || 'Test Series Pass',
            exam_type: sub.exam_type || 'IAT',
            duration_days: sub.duration_days || 30
          },
          days_remaining: daysRemaining
        };
      });

    return res.status(200).json({
      success: true,
      subscriptions: activeSubscriptions,
      activeCount: activeSubscriptions.length
    });
  } catch (error) {
    console.error('❌ Subscriptions route error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/student/dashboard — Personalized dashboard data with subscriptions + upcoming tests
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user?.id;
    const studentEmail = req.user?.email;

    // 1. Get active subscriptions
    let subQuery = supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active');

    const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    if (studentId && isUUID(studentId) && studentEmail) {
      subQuery = subQuery.or(`student_id.eq.${studentId},student_email.ilike."${studentEmail.trim()}"`);
    } else if (studentId && isUUID(studentId)) {
      subQuery = subQuery.eq('student_id', studentId);
    } else if (studentEmail) {
      subQuery = subQuery.eq('student_email', studentEmail.trim());
    }

    const { data: rawSubscriptions, error: subError } = await subQuery;
    if (subError) throw subError;

    // Fetch plan details in a separate query to bypass the missing foreign key constraint
    const planIds = [...new Set((rawSubscriptions || []).map(s => s.plan_id).filter(Boolean))];
    let plansMap = {};
    if (planIds.length > 0) {
      const { data: plansData } = await supabase.from('plans').select('*').in('id', planIds);
      (plansData || []).forEach(p => { plansMap[p.id] = p; });
    }

    const subscriptions = (rawSubscriptions || []).map(sub => ({
      ...sub,
      plans: plansMap[sub.plan_id] || {
        name: sub.plan_name || 'Test Series Pass',
        exam_type: sub.exam_type || 'IAT',
        duration_days: sub.duration_days || 30
      }
    }));

    // 2. Get subscribed exam types
    const subscribedExamTypes = [...new Set(
      (subscriptions || [])
        .map(s => s.plans?.exam_type || s.exam_type)
        .filter(Boolean)
    )];

    // 3. Fetch upcoming tests filtered by subscribed exam types
    let testsQuery = supabase
      .from('tests')
      .select('*')
      .eq('content_type', 'test_series')
      .in('status', ['frozen', 'live', 'scheduled'])
      .order('window_start', { ascending: true });

    if (subscribedExamTypes.length > 0) {
      testsQuery = testsQuery.in('exam_type', subscribedExamTypes);
    }

    const { data: rawTests } = await testsQuery;

    const tests = (rawTests || []).map(t => ({
      ...t,
      title: t.name || t.title,
      examType: t.exam_type,
      year: t.pyq_year ? String(t.pyq_year) : null
    }));

    // 4. Separate upcoming vs live tests
    const now = new Date();
    const upcomingTests = tests.filter(t =>
      t.window_start && new Date(t.window_start) > now
    );
    const liveTests = tests.filter(t => {
      if (!t.window_start) return false;
      const start = new Date(t.window_start);
      const end = t.window_end ? new Date(t.window_end) : null;
      return start <= now && (!end || end >= now);
    });

    return res.status(200).json({
      success: true,
      subscriptions: subscriptions || [],
      subscribedExamTypes,
      upcomingTests,
      liveTests,
      totalTests: tests.length
    });
  } catch (error) {
    console.error('❌ Student dashboard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/student/hall-tickets — Returns all hall tickets for the logged-in student
router.get('/hall-tickets', async (req, res) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: hallTickets, error } = await supabase
      .from('hall_tickets')
      .select('*')
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('❌ Hall tickets fetch error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Fetch test details in separate queries to bypass missing foreign key constraint
    const testIds = [...new Set((hallTickets || []).map(t => t.test_id).filter(Boolean))];
    let testsMap = {};
    if (testIds.length > 0) {
      // 1. Query 'tests' table
      const { data: testsData } = await supabase.from('tests').select('*').in('id', testIds);
      (testsData || []).forEach(t => {
        testsMap[t.id] = {
          id: t.id,
          title: t.title,
          name: t.title,
          exam_type: t.exam_type,
          test_type: t.exam_type,
          window_start: t.window_start,
          window_end: t.window_end,
          duration_minutes: t.duration_minutes,
          status: t.status
        };
      });

      // 2. Query 'scheduled_tests' table for any other tests
      const remainingTestIds = testIds.filter(id => !testsMap[id]);
      if (remainingTestIds.length > 0) {
        const { data: schedData } = await supabase.from('scheduled_tests').select('*').in('id', remainingTestIds);
        (schedData || []).forEach(t => {
          testsMap[t.id] = {
            id: t.id,
            title: t.test_name,
            name: t.test_name,
            exam_type: t.test_type,
            test_type: t.test_type,
            window_start: t.exam_date,
            window_end: t.exam_date,
            duration_minutes: t.duration_minutes,
            status: t.status
          };
        });
      }
    }

    const enrichedTickets = (hallTickets || []).map(ticket => {
      return {
        ...ticket,
        test: testsMap[ticket.test_id] || null
      };
    });

    return res.status(200).json({
      success: true,
      hallTickets: enrichedTickets
    });
  } catch (error) {
    console.error('❌ Student hall tickets error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/student/attempts — Returns all exam attempts by the logged-in student
router.get('/attempts', async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('id, test_id, started_at, status, submitted_at, warning_count')
      .eq('student_id', studentId);

    if (error) {
      console.error('❌ Student attempts error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const attemptedTestIds = (attempts || [])
      .filter(a => a.status === 'submitted')
      .map(a => a.test_id);

    return res.status(200).json({
      success: true,
      attempts: attempts || [],
      attemptedTestIds
    });
  } catch (error) {
    console.error('❌ Student attempts route error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
