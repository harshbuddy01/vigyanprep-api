import { supabase } from '../db/supabase.js';
import { evaluateNEST, evaluateIAT, evaluateCMI } from './evaluator.js';

export async function recalculateAllScores(testId, examType) {
    try {
        // Fetch all attempts for this test
        const { data: attempts, error: fetchError } = await supabase
            .from('test_attempts')
            .select('*')
            .eq('test_id', testId)
            .eq('status', 'completed');

        if (fetchError) throw fetchError;

        // Fetch questions for this test to re-evaluate
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testId);

        if (qError) throw qError;

        for (const attempt of attempts) {
            const answers = attempt.answers_json || {};
            let evaluation;

            if (examType === 'NEST') {
                evaluation = evaluateNEST(answers, questions);
            } else if (examType === 'IAT') {
                evaluation = evaluateIAT(answers, questions);
            } else if (examType === 'CMI') {
                evaluation = evaluateCMI(answers, questions);
            } else {
                continue; // Unknown exam type
            }

            // Update scores in Supabase
            const updatePayload = {
                score: evaluation.total,
                subject_scores: evaluation.subjectScores,
                breakdown: evaluation.breakdown,
                updated_at: new Date().toISOString()
            };

            if (evaluation.droppedSubject) updatePayload.dropped_subject = evaluation.droppedSubject;
            if (evaluation.partBStatus) updatePayload.part_b_status = evaluation.partBStatus;

            await supabase
                .from('test_attempts')
                .update(updatePayload)
                .eq('id', attempt.id);
        }

        console.log(`Successfully recalculated scores for test ${testId}`);
        return true;
    } catch (error) {
        console.error('Recalculate Scores Error:', error);
        throw error;
    }
}
