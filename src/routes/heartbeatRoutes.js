import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();

// All heartbeat routes require a valid student session
router.use(verifyAuth);

router.post('/', async (req, res) => {
    try {
        const { attempt_id, time_remaining, answers, answers_count, warning_count } = req.body;
        const studentId = req.user.id; // from verified JWT

        if (!attempt_id) {
            return res.status(400).json({ success: false, message: 'attempt_id is required' });
        }

        // SECURITY: verify this attempt belongs to the authenticated student
        // VP-V002 FIX: Use 'attempts' table (where lifecycle creates attempts)
        const { data: attempt, error: ownerErr } = await supabase
            .from('attempts')
            .select('id, server_deadline, status')
            .eq('id', attempt_id)
            .eq('student_id', studentId)
            .single();

        if (ownerErr || !attempt) {
            return res.status(403).json({
                success: false,
                message: 'Attempt not found or does not belong to this student.'
            });
        }

        // Check if exam has already been submitted or deadline passed
        const now = new Date();
        const deadline = new Date(attempt.server_deadline);
        if (attempt.status === 'submitted' || now > deadline) {
            return res.status(200).json({
                success: true,
                expired: true,
                remaining_seconds: 0,
                message: 'Exam already submitted or deadline passed.'
            });
        }

        // Save actual answers if provided (upsert into attempt_answers)
        if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
            const normalizedAnswers = Array.isArray(answers)
                ? answers
                : Object.entries(answers).map(([qId, ans]) => ({
                    question_id: qId,
                    answer: ans
                  }));

            const upsertRows = normalizedAnswers.map(a => ({
                attempt_id: attempt_id,
                question_id: a.questionId || a.question_id,
                answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
                answered_at: new Date().toISOString()
            }));

            if (upsertRows.length > 0) {
                await supabase
                    .from('attempt_answers')
                    .upsert(upsertRows, { onConflict: 'attempt_id,question_id' })
                    .catch(err => console.warn('Heartbeat upsert notice:', err.message));
            }
        }

        // Update warning count on the attempt
        if (typeof warning_count === 'number') {
            await supabase
                .from('attempts')
                .update({ warning_count })
                .eq('id', attempt_id);
        }

        // Return server-authoritative remaining seconds for timer sync (VP-V004)
        const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

        return res.status(200).json({
            success: true,
            remaining_seconds: remainingSeconds,
            syncedAnswers: answers ? Object.keys(answers).length : 0
        });
    } catch (error) {
        console.error('Heartbeat Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
