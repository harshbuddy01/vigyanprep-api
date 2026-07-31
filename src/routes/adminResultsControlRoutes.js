import express from 'express';
import { supabase } from '../db/supabase.js';
import { generateMeritList } from '../services/meritListService.js';

const router = express.Router();

router.post('/:testId/release-responses', async (req, res) => {
    try {
        const { testId } = req.params;
        const { error } = await supabase
            .from('tests')
            .update({ response_released_at: new Date().toISOString() })
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
