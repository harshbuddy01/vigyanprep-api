import express from 'express';
import { supabase } from '../db/supabase.js';
import { generateMeritList } from '../services/meritListService.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminAuth);

router.post('/:testId/release-responses', async (req, res) => {
    try {
        const { testId } = req.params;
        const { data: test, error: testErr } = await supabase
            .from('tests')
            .select('*')
            .eq('id', testId)
            .single();

        if (testErr || !test) return res.status(404).json({ success: false, error: 'Test not found' });

        if (test.window_end && new Date() < new Date(test.window_end)) {
            const windowEndStr = new Date(test.window_end).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            return res.status(400).json({
                success: false,
                error: `Security Guard: Cannot release responses while the exam window is active or upcoming. Test ends at ${windowEndStr} IST.`
            });
        }

        const { error } = await supabase
            .from('tests')
            .update({ response_released_at: new Date().toISOString(), status: 'completed' })
            .eq('id', testId);

        if (error) throw error;
        res.status(200).json({ success: true, message: 'Responses released successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:testId/disable-challenges', async (req, res) => {
    try {
        const { testId } = req.params;
        const { error } = await supabase
            .from('tests')
            .update({ challenges_disabled_at: new Date().toISOString() })
            .eq('id', testId);

        if (error) throw error;
        res.status(200).json({ success: true, message: 'Challenges disabled successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:testId/publish-merit-list', async (req, res) => {
    try {
        const { testId } = req.params;
        
        // Generate the merit list first
        await generateMeritList(testId);

        // Then mark it as published
        const { error } = await supabase
            .from('tests')
            .update({ is_published: true })
            .eq('id', testId);

        if (error) throw error;
        res.status(200).json({ success: true, message: 'Merit list published successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
