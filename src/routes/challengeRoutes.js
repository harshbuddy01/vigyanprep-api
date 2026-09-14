import express from 'express';
import { supabase } from '../db/supabase.js';
import { recalculateTestScoresAndRanks } from '../controllers/stagedResultController.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

/**
 * Helper to enrich raw challenge records with Question & Student details
 */
async function enrichChallenges(challenges) {
  if (!challenges || challenges.length === 0) return [];

  const qIds = [...new Set(challenges.map(c => c.question_id).filter(Boolean))];
  const sIds = [...new Set(challenges.map(c => c.student_id).filter(Boolean))];

  // 1. Batch fetch questions
  let questionsMap = {};
  if (qIds.length > 0) {
    const { data: qList } = await supabase
      .from('questions')
      .select('id, question_number, question_text, correct_answer, section')
      .in('id', qIds);
    (qList || []).forEach(q => { questionsMap[q.id] = q; });
  }

  // 2. Batch fetch students
  let studentsMap = {};
  if (sIds.length > 0) {
    const { data: sList } = await supabase
      .from('students')
      .select('id, email, full_name, roll_number')
      .in('id', sIds);
    (sList || []).forEach(s => {
      studentsMap[s.id] = {
        name: s.full_name || 'Student',
        email: s.email || '—',
        roll: s.roll_number || null
      };
    });

    // Also check subscriptions fallback if student not in students table
    const missingSids = sIds.filter(id => !studentsMap[id]);
    if (missingSids.length > 0) {
      const { data: subList } = await supabase
        .from('subscriptions')
        .select('student_id, student_email, student_name')
        .in('student_id', missingSids);
      (subList || []).forEach(sub => {
        if (!studentsMap[sub.student_id]) {
          studentsMap[sub.student_id] = {
            name: sub.student_name || 'Student',
            email: sub.student_email || '—',
            roll: null
          };
        }
      });
    }
  }

  return challenges.map(c => {
    const q = questionsMap[c.question_id];
    const s = studentsMap[c.student_id] || {};

    const studentName = s.name || c.student_name || 'Student';
    const studentEmail = s.email || c.student_email || '—';
    const rollNo = s.roll || (studentEmail !== '—' ? 'VP-' + studentEmail.split('@')[0].toUpperCase().slice(0, 8) : '—');
    const questionNumber = q ? q.question_number : null;

    return {
      ...c,
      // Status normalized for any frontend casing
      status: (c.status || 'pending').toLowerCase(),
      // Question attributes
      questionNumber: questionNumber,
      question_number: questionNumber,
      questionText: q?.question_text || '',
      question_text: q?.question_text || '',
      current_correct_answer: q?.correct_answer || '',
      section: q?.section || '',
      // Student attributes
      studentName: studentName,
      student_name: studentName,
      studentEmail: studentEmail,
      student_email: studentEmail,
      rollNo: rollNo,
      roll_number: rollNo,
      students: {
        full_name: studentName,
        email: studentEmail
      },
      // Proof attributes
      proofUrl: c.proof_image_url || c.proofUrl || null,
      proofImage: c.proof_image_url || c.proofUrl || null
    };
  });
}

// POST /api/challenges - Student submits challenge
router.post('/', verifyAuth, async (req, res) => {
  try {
    const { test_id, question_id, reason, proof_image_url } = req.body;
    const student_id = req.user.id;

    const { data, error } = await supabase
      .from('challenges')
      .insert([{
        test_id,
        question_id,
        student_id,
        reason,
        proof_image_url,
        status: 'pending'
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/challenges - Admin gets challenges
router.get('/', verifyAdminAuth, async (req, res) => {
  try {
    const { test_id } = req.query;
    let query = supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (test_id) query = query.eq('test_id', test_id);

    const { data, error } = await query;
    if (error) throw error;

    const enriched = await enrichChallenges(data || []);
    res.status(200).json({ success: true, challenges: enriched, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/challenges/test/:testId - Admin gets challenges for a test
router.get('/test/:testId', verifyAdminAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('test_id', testId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = await enrichChallenges(data || []);
    res.status(200).json({ success: true, challenges: enriched, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Common handler for accepting a challenge and recalculating scores
 */
async function handleAcceptChallenge(challengeId, newAnswer, res) {
  if (!newAnswer || !String(newAnswer).trim()) {
    return res.status(400).json({ success: false, error: 'newAnswer is required' });
  }

  const cleanAnswer = String(newAnswer).trim().toUpperCase();

  // 1. Fetch the challenge
  const { data: challenge, error: getError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (getError || !challenge) {
    return res.status(404).json({ success: false, error: 'Challenge not found' });
  }

  // 2. Update the question's official correct answer
  const { error: updateQuestionError } = await supabase
    .from('questions')
    .update({ correct_answer: cleanAnswer })
    .eq('id', challenge.question_id);

  if (updateQuestionError) throw updateQuestionError;

  // 3. Update challenge status in DB
  const { data, error: updateChallengeError } = await supabase
    .from('challenges')
    .update({
      status: 'accepted',
      new_answer: cleanAnswer,
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .select();

  if (updateChallengeError) throw updateChallengeError;

  // 4. Trigger automated score & rank recalculation for ALL students who took this test
  let recalcResult = null;
  try {
    recalcResult = await recalculateTestScoresAndRanks(challenge.test_id);
    console.log(`[Challenge] Recalculated scores for test ${challenge.test_id}: ${recalcResult.count} students updated.`);
  } catch (recalcErr) {
    console.error('Score recalculation failed during challenge accept:', recalcErr);
  }

  return res.status(200).json({
    success: true,
    message: `Challenge accepted. Answer key updated to "${cleanAnswer}" and scores recalculated for all students.`,
    newAnswer: cleanAnswer,
    recalculation: recalcResult,
    data
  });
}

/**
 * Common handler for rejecting a challenge
 */
async function handleRejectChallenge(challengeId, reply, proofUrl, res) {
  const { data, error } = await supabase
    .from('challenges')
    .update({
      status: 'rejected',
      admin_reply: reply || null,
      admin_proof_url: proofUrl || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .select();

  if (error) throw error;

  return res.status(200).json({
    success: true,
    message: 'Challenge rejected successfully.',
    data
  });
}

// Support BOTH POST and PATCH for accept & reject to guarantee no 404s
router.post('/accept/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newAnswer, new_answer } = req.body;
    await handleAcceptChallenge(id, newAnswer || new_answer, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/accept', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newAnswer, new_answer } = req.body;
    await handleAcceptChallenge(id, newAnswer || new_answer, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reject/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply, admin_reply, proofUrl, admin_proof_url } = req.body;
    await handleRejectChallenge(id, reply || admin_reply, proofUrl || admin_proof_url, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/reject', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply, admin_reply, proofUrl, admin_proof_url } = req.body;
    await handleRejectChallenge(id, reply || admin_reply, proofUrl || admin_proof_url, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
