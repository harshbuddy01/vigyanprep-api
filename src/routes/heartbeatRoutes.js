import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { attempt_id, time_remaining, answers_json, warning_count } = req.body;

        if (!attempt_id) {
            return res.status(400).json({ success: false, message: 'attempt_id is required' });
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

        if (error) {
            throw error;
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Heartbeat Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
