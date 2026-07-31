import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/exam-access/issue
// Called by auth.vigyanprep.com after a student logs in.
// Requires a valid student Bearer token (Supabase JWT).
// Returns a 60-second, single-use opaque code — NOT a JWT.
// ─────────────────────────────────────────────────────────────
router.post('/issue', verifyAuth, async (req, res) => {
  try {
    const { test_series_id } = req.body;
    const studentId = req.user.id;

    if (!test_series_id) {
      return res.status(400).json({ success: false, message: 'test_series_id is required.' });
    }

    // Verify this student has purchased the test series
    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', studentId)
      .eq('test_series_id', test_series_id)
      .single();

    if (purchaseErr || !purchase) {
      return res.status(403).json({
        success: false,
        message: 'Access denied — this test series has not been purchased.'
      });
    }

    // Generate a cryptographically random 64-char opaque code
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60 seconds

    const { error: insertErr } = await supabase.from('exam_access_codes').insert({
      code,
      student_id: studentId,
      test_series_id,
      expires_at: expiresAt,
      used: false
    });

    if (insertErr) throw insertErr;

    return res.json({ success: true, code, expiresAt });
  } catch (err) {
    console.error('exam-access/issue error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/exam-access/exchange
// Called by test.vigyanprep.com to exchange a one-time code
// for a short-lived exam session token.
// No auth required here — the code IS the credential.
// ─────────────────────────────────────────────────────────────
router.post('/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'code is required.' });
    }

    // Look up the access code
    const { data: accessCode, error } = await supabase
      .from('exam_access_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single();

    if (error || !accessCode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or already-used access code. Please log in again.'
      });
    }

    // Check expiry
    if (new Date() > new Date(accessCode.expires_at)) {
      return res.status(401).json({
        success: false,
        message: 'Access code expired (60s limit). Please log in again.'
      });
    }

    // Burn the code — single use only
    await supabase.from('exam_access_codes').update({ used: true }).eq('code', code);

    // Fetch student profile
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, full_name, email, roll_number')
      .eq('id', accessCode.student_id)
      .single();

    if (studentErr || !student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Issue a short-lived exam session token (3 hours, matches exam max duration)
    const examToken = jwt.sign(
      {
        studentId: student.id,
        testSeriesId: accessCode.test_series_id,
        type: 'exam_session'
      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    return res.json({
      success: true,
      examToken,
      student: {
        id: student.id,
        name: student.full_name,
        email: student.email,
        rollNumber: student.roll_number
      }
    });
  } catch (err) {
    console.error('exam-access/exchange error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
