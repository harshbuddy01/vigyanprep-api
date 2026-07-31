import express from 'express';
import { supabase } from '../db/supabase.js';
import { recalculateAllScores } from '../utils/recalculateScores.js';

const router = express.Router();

// POST /api/challenges - Student submits challenge
router.post('/', async (req, res) => {
    try {
        const { test_id, question_id, reason, proof_image_url } = req.body;
        // In real app, get student_id from auth token
        const student_id = req.user?.id || 'temp_student_id';

        const { data, error } = await supabase
            .from('challenges')
            .insert([{ test_id, question_id, student_id, reason, proof_image_url, status: 'pending' }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/challenges - Admin gets challenges
router.get('/', async (req, res) => {
    try {
        const { test_id } = req.query;
        let query = supabase.from('challenges').select('*');
        if (test_id) query = query.eq('test_id', test_id);

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/challenges/:id/accept - Admin accepts challenge
router.patch('/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const { examType } = req.body; // Needed for recalculation

        const { data: challenge, error: getError } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', id)
            .single();

        if (getError) throw getError;

        // Update challenge status
        const { data, error } = await supabase
            .from('challenges')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;

        // Trigger score recalculation
        if (examType) {
            await recalculateAllScores(challenge.test_id, examType);
        }

        res.status(200).json({ success: true, message: 'Challenge accepted and scores recalculated.', data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/challenges/:id/reject - Admin rejects challenge
router.patch('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_reply, admin_proof_url } = req.body;

        const { data, error } = await supabase
            .from('challenges')
            .update({ 
                status: 'rejected', 
                admin_reply, 
                admin_proof_url, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
