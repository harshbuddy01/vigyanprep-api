// backend/controllers/hallTicketController.js
// 🎟️ HALL TICKET & 16-HEX UNIQUE EXAM ID ENGINE

import crypto from 'crypto';
import { supabase } from '../db/supabase.js';

// Rate limiter tracking map (max 5 entry attempts per minute per account)
const entryAttemptTracker = new Map();

/**
 * Generate 16-Hex Unique Exam ID
 * Format: EXAM-{TEST_PREFIX}-{16_HEX_CHARS}
 */
export function generateUniqueExamId(testPrefix = 'IAT') {
  const randomHex = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16 hex chars (64 bits entropy)
  const cleanPrefix = String(testPrefix).toUpperCase().substring(0, 4);
  return `EXAM-${cleanPrefix}-${randomHex}`;
}

/**
 * Issue Hall Ticket for a Student & Test
 */
export const issueHallTicket = async (req, res) => {
  try {
    const { testId, studentId } = req.body;
    const orgId = req.user?.org_id || '00000000-0000-0000-0000-000000000001';

    if (!testId || !studentId) {
      return res.status(400).json({ error: 'testId and studentId are required' });
    }

    // Check existing hall ticket
    const { data: existing } = await supabase
      .from('hall_tickets')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ success: true, hallTicket: existing });
    }

    // Fetch test details for prefix
    const { data: test } = await supabase.from('tests').select('exam_type').eq('id', testId).single();
    const uniqueExamId = generateUniqueExamId(test?.exam_type || 'IAT');

    const { data: ticket, error } = await supabase
      .from('hall_tickets')
      .insert({
        org_id: orgId,
        test_id: testId,
        student_id: studentId,
        unique_exam_id: uniqueExamId,
        issued_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      hallTicket: ticket
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to issue hall ticket', details: err.message });
  }
};

/**
 * Validate 16-Hex Exam ID with 5-Attempts/Min Rate Limiting
 */
export const validateExamId = async (req, res) => {
  try {
    const { uniqueExamId, testId } = req.body;
    const studentId = req.user?.id || req.body?.student_id;

    if (!uniqueExamId || !testId || !studentId) {
      return res.status(400).json({ error: 'uniqueExamId, testId, and studentId are required' });
    }

    // 🛡️ Rate Limiting: Max 5 attempts per minute per student account
    const trackerKey = `rate_${studentId}`;
    const now = Date.now();
    const studentAttempts = entryAttemptTracker.get(trackerKey) || [];
    const recentAttempts = studentAttempts.filter(t => t > now - 60000);

    if (recentAttempts.length >= 5) {
      return res.status(429).json({
        error: 'Too many exam ID entry attempts. Please wait 1 minute before trying again.',
        rateLimited: true
      });
    }

    recentAttempts.push(now);
    entryAttemptTracker.set(trackerKey, recentAttempts);

    // Verify Hall Ticket in DB
    const { data: ticket } = await supabase
      .from('hall_tickets')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .eq('unique_exam_id', uniqueExamId.trim().toUpperCase())
      .maybeSingle();

    if (!ticket) {
      return res.status(401).json({
        error: 'Invalid Exam ID for this test paper.',
        valid: false
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      hallTicket: ticket
    });
  } catch (err) {
    return res.status(500).json({ error: 'Validation error', details: err.message });
  }
};
