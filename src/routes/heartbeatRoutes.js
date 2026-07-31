import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAuth } from '../middlewares/auth.js';

const router = express.Router();

// All heartbeat routes require a valid student session
router.use(verifyAuth);

router.post('/', async (req, res) => {
    try {
        const { attempt_id, time_remaining, answers_json, warning_count } = req.body;
        const studentId = req.user.id; // from verified JWT

        if (!attempt_id) {
            return res.status(400).json({ success: false, message: 'attempt_id is required' });
        }

        // SECURITY: verify this attempt belongs to the authenticated student
        // Prevents VP-021: anonymous callers overwriting any student's attempt
        const { data: ownership, error: ownerErr } = await supabase
            .from('test_attempts')
            .select('id')
            .eq('id', attempt_id)
            .eq('student_id', studentId)
            .single();

        if (ownerErr || !ownership) {
            return res.status(403).json({
                success: false,
                message: 'Attempt not found or does not belong to this student.'
            });
        }

        const { data, error } = await supabase
            .from('test_attempts')
            .update({
                time_remaining,
                answers_json,
                warning_count,
                heartbeat_at: new Date().toISOString()
            })
            .eq('id', attempt_id)
            .select();

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Heartbeat Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
