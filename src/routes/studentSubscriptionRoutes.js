import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();

// All routes require student authentication
router.use(verifyAuth);

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
      query = query.ilike('student_email', studentEmail.trim());
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Subscription fetch error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 2. Safely fetch plan details for extracted plan IDs
    const planIds = [...new Set((subscriptions || []).map(s => s.plan_id).filter(Boolean))];
    let plansMap = {};
    if (planIds.length > 0) {
      const { data: plansData } = await supabase.from('plans').select('*').in('id', planIds);
      (plansData || []).forEach(p => { plansMap[p.id] = p; });
    }

    // Auto-expire subscriptions that have passed their expiry date
    const now = new Date();
    const enrichedSubs = (subscriptions || []).map(sub => {
      const isExpired = sub.expires_at && new Date(sub.expires_at) < now;
      if (isExpired && sub.status === 'active') {
        // Mark as expired in DB (fire-and-forget)
        supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id).then(() => {});
      }
      return {
        ...sub,
        status: isExpired ? 'expired' : sub.status,
        plan: plansMap[sub.plan_id] || sub.plans || {
          name: sub.plan_name || 'Test Series Pass',
          exam_type: sub.exam_type || 'IAT',
          duration_days: sub.duration_days || 30
        },
        days_remaining: isExpired ? 0 : Math.max(0, Math.ceil((new Date(sub.expires_at) - now) / (1000 * 60 * 60 * 24)))
      };
    });

    return res.status(200).json({
      success: true,
      subscriptions: enrichedSubs,
      activeCount: enrichedSubs.filter(s => s.status === 'active').length
    });
  } catch (error) {
    console.error('❌ Student subscriptions error:', error);
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
      .select('*, plans:plan_id(id, name, exam_type, duration_days)')
      .eq('status', 'active');

    const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    if (studentId && isUUID(studentId) && studentEmail) {
      subQuery = subQuery.or(`student_id.eq.${studentId},student_email.ilike."${studentEmail.trim()}"`);
    } else if (studentId && isUUID(studentId)) {
      subQuery = subQuery.eq('student_id', studentId);
    } else if (studentEmail) {
      subQuery = subQuery.eq('student_email', studentEmail.trim());
    }

    const { data: subscriptions } = await subQuery;

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

    const { data: tests } = await testsQuery;

    // 4. Separate upcoming vs live tests
    const now = new Date();
    const upcomingTests = (tests || []).filter(t =>
      t.window_start && new Date(t.window_start) > now
    );
    const liveTests = (tests || []).filter(t => {
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
      totalTests: (tests || []).length
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
      .select('id, test_id, unique_exam_id, issued_at, delivered_email, tests:test_id(id, title, name, exam_type, test_type, window_start, window_end, duration_minutes, status)')
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('❌ Hall tickets fetch error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const enrichedTickets = (hallTickets || []).map(ticket => ({
      ...ticket,
      test: ticket.tests || null
    }));

    return res.status(200).json({
      success: true,
      hallTickets: enrichedTickets
    });
  } catch (error) {
    console.error('❌ Student hall tickets error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
