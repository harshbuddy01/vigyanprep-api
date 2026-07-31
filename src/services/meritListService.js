import { supabase } from '../db/supabase.js';

export async function generateMeritList(testId) {
    try {
        // Fetch all completed, evaluated attempts
        const { data: attempts, error: fetchError } = await supabase
            .from('test_attempts')
            .select('*, students(name, email)')
            .eq('test_id', testId)
            .eq('status', 'completed')
            .order('score', { ascending: false });

        if (fetchError) throw fetchError;

        const meritListEntries = attempts.map((attempt, index) => ({
            test_id: testId,
            student_id: attempt.student_id,
            attempt_id: attempt.id,
            score: attempt.score,
            air_rank: index + 1,
            created_at: new Date().toISOString()
        }));

        if (meritListEntries.length > 0) {
            // Delete old merit list for this test if it exists
            await supabase.from('merit_lists').delete().eq('test_id', testId);

            // Insert new merit list
            const { error: insertError } = await supabase
                .from('merit_lists')
                .insert(meritListEntries);

            if (insertError) throw insertError;
        }

        console.log(`Merit list generated for test ${testId} with ${meritListEntries.length} entries.`);
        return true;
    } catch (error) {
        console.error('Generate Merit List Error:', error);
        throw error;
    }
}
