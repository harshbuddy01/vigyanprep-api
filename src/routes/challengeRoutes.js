import express from 'express';
import { supabase } from '../db/supabase.js';
import { recalculateAllScores } from '../utils/recalculateScores.js';
import { verifyAuth } from '../middlewares/auth.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// POST /api/challenges - Student submits challenge
router.post('/', verifyAuth, async (req, res) => {
    try {
        const { test_id, question_id, reason, proof_image_url } = req.body;
        const student_id = req.user.id;

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
router.get('/', verifyAdminAuth, async (req, res) => {
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
router.patch('/:id/accept', verifyAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { newAnswer } = req.body;

        const { data: challenge, error: getError } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', id)
            .single();

        if (getError) throw getError;

        // Fetch examType from the test record
        const { data: test, error: testError } = await supabase
            .from('tests')
            .select('exam_type')
            .eq('id', challenge.test_id)
            .single();

        if (testError || !test) throw new Error('Test not found');
        const examType = test.exam_type;

        // Update the questions table correct_answer
        const { error: updateQuestionError } = await supabase
            .from('questions')
            .update({ correct_answer: newAnswer })
            .eq('id', challenge.question_id);
            
        if (updateQuestionError) throw updateQuestionError;

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
router.patch('/:id/reject', verifyAdminAuth, async (req, res) => {
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
