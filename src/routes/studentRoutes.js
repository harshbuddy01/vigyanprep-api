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

// POST /api/admin/students/notify — Manually send email (via AWS SES) or generate WhatsApp notification
router.post('/notify', async (req, res) => {
  try {
    const { studentEmail, studentName, channel, subject, message, testId } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ success: false, error: 'studentEmail is required' });
    }

    if (channel === 'email') {
      const { sendEmail, EMAIL_FROM } = await import('../services/emailService.js');
      
      const htmlBody = `
        <div style="background-color:#0f0d08;padding:32px;font-family:sans-serif;color:#e8dcc8;">
          <div style="max-width:550px;margin:0 auto;background:#1a1610;border:1px solid rgba(212,165,32,0.3);border-radius:12px;padding:28px;">
            <h2 style="color:#d4a520;margin-top:0;">📢 Notification from VIGYAN.prep</h2>
            <p>Dear <strong>${studentName || 'Student'}</strong>,</p>
            <div style="background:rgba(212,165,32,0.08);padding:16px;border-left:4px solid #d4a520;margin:20px 0;line-height:1.6;">
              ${(message || '').replace(/\n/g, '<br/>')}
            </div>
            <p style="font-size:13px;color:#9a8c75;">
              If you have any questions, reach out to us at <a href="mailto:support@vigyanprep.com" style="color:#d4a520;">support@vigyanprep.com</a>.
            </p>
          </div>
        </div>
      `;

      const result = await sendEmail(
        studentEmail,
        subject || '📢 Notification from VIGYAN.prep',
        htmlBody,
        { from: EMAIL_FROM.NOTIFICATION }
      );

      if (!result || !result.success) {
        return res.status(400).json({
          success: false,
          error: result?.error || 'AWS SES failed to deliver email. Check if account is in Sandbox mode.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Email notification sent successfully',
        result
      });
    }

    if (channel === 'whatsapp') {
      // Formulate WhatsApp message text and deep link
      const text = encodeURIComponent(`Hello ${studentName || 'Student'},\n\n${message || 'Important update regarding your test series on VIGYAN.prep.'}\n\nVisit: https://test.vigyanprep.com/dashboard`);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${text}`;

      return res.status(200).json({
        success: true,
        whatsappUrl,
        message: 'WhatsApp notification link generated'
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid channel (use email or whatsapp)' });
  } catch (err) {
    console.error('❌ Admin notify student error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
