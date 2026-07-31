import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js'; // student auth
import crypto from 'crypto';

const router = express.Router();

// POST /api/exam-access/issue
// Called by auth portal after login to get a short-lived exam code
// Student must be authenticated via their Supabase session token
router.post('/issue', verifyAuth, async (req, res) => {
  try {
    const { test_series_id } = req.body;
    const studentId = req.user.id;
    
    // Verify student has purchased this test series
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', studentId)
      .eq('test_series_id', test_series_id)
      .single();
    
    if (!purchase) {
      return res.status(403).json({ success: false, message: 'Test series not purchased.' });
    }
    
    // Generate a cryptographically random, single-use, 60-second code
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds
    
    // Store in Supabase
    await supabase.from('exam_access_codes').insert({
      code,
      student_id: studentId,
      test_series_id,
      expires_at: expiresAt.toISOString(),
      used: false
    });
    
    res.json({ success: true, code, expiresAt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/exam-access/exchange
// Called by test.vigyanprep.com to exchange the code for a session
router.post('/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code required.' });
    
    // Look up code
    const { data: accessCode, error } = await supabase
      .from('exam_access_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single();
    
    if (error || !accessCode) {
      return res.status(401).json({ success: false, message: 'Invalid or expired access code.' });
    }
    
    // Check expiry
    if (new Date() > new Date(accessCode.expires_at)) {
      return res.status(401).json({ success: false, message: 'Access code expired. Please log in again.' });
    }
    
    // Burn the code (single-use)
    await supabase.from('exam_access_codes').update({ used: true }).eq('code', code);
    
    // Fetch student details
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, email, roll_number')
      .eq('id', accessCode.student_id)
      .single();
    
    // Issue a short-lived exam session token (2 hours)
    import jwt from 'jsonwebtoken';
    const examToken = jwt.sign(
      { studentId: student.id, testSeriesId: accessCode.test_series_id, type: 'exam_session' },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );
    
    res.json({
      success: true,
      examToken,
      student: { name: student.full_name, email: student.email, rollNumber: student.roll_number }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
