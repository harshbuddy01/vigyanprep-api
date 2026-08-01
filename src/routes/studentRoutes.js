import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/', async (req, res) => {
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

    let combinedList = [...usersList, ...studentsList];

    if (authList.length > 0) {
      const mappedAuth = authList.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'Student'),
        name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'Student'),
        role: u.user_metadata?.role || 'student',
        status: 'Active',
        created_at: u.created_at
      }));
      combinedList.push(...mappedAuth);
    }

    // Normalize student profile structure
    const normalized = combinedList.map(s => ({
      id: s.id || `std_${s.email}`,
      full_name: s.full_name || s.name || (s.email ? s.email.split('@')[0] : 'Student'),
      name: s.full_name || s.name || (s.email ? s.email.split('@')[0] : 'Student'),
      email: s.email,
      role: s.role || 'student',
      status: s.status || 'Active',
      created_at: s.created_at || new Date().toISOString()
    })).filter(s => s.email && s.role !== 'super_admin');

    // Deduplicate records by email
    const uniqueStudents = Array.from(new Map(normalized.map(s => [s.email.toLowerCase(), s])).values());

    return res.status(200).json({ success: true, students: uniqueStudents, data: uniqueStudents });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
