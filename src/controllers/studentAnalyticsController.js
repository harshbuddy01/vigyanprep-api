// studentAnalyticsController.js
// Student Performance Analytics — Trend Data Across Tests

import { supabase } from '../db/supabase.js';

/**
 * GET /api/student/analytics/performance
 * Returns student's score trend, section breakdown, and accuracy across all attempts
 */
export const getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch all submitted attempts with test info and results
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select(`
        id, test_id, submitted_at, created_at,
        tests:test_id(id, title, name, exam_type, window_start, total_marks, duration_minutes),
        results(rank_overall, percentile, raw_score, section_scores)
      `)
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    if (!attempts || attempts.length === 0) {
      return res.status(200).json({ success: true, trendData: [], summary: null });
    }

    // Build trend data per attempt
    const trendData = attempts.map((attempt, idx) => {
      const result = Array.isArray(attempt.results) ? attempt.results[0] : attempt.results;
      const test = Array.isArray(attempt.tests) ? attempt.tests[0] : attempt.tests;
      return {
        attemptId: attempt.id,
        testId: attempt.test_id,
        testTitle: test?.title || test?.name || `Test ${idx + 1}`,
        examType: test?.exam_type || 'IAT',
        date: attempt.submitted_at || attempt.created_at,
        score: result?.raw_score ?? null,
        totalMarks: test?.total_marks || 240,
        rank: result?.rank_overall ?? null,
        percentile: result?.percentile ?? null,
        sectionScores: result?.section_scores ?? null,
        resultReleased: result?.raw_score !== null && result?.raw_score !== undefined
      };
    });

    // Compute summary stats across all result-released tests
    const scoresWithData = trendData.filter(t => t.score !== null);
    const summary = scoresWithData.length > 0 ? {
      totalTests: attempts.length,
      testsWithResults: scoresWithData.length,
      bestScore: Math.max(...scoresWithData.map(t => t.score)),
      latestScore: scoresWithData[scoresWithData.length - 1]?.score,
      averageScore: Math.round(scoresWithData.reduce((s, t) => s + t.score, 0) / scoresWithData.length),
      bestRank: scoresWithData.filter(t => t.rank).length > 0
        ? Math.min(...scoresWithData.filter(t => t.rank).map(t => t.rank))
        : null,
      improvement: scoresWithData.length >= 2
        ? scoresWithData[scoresWithData.length - 1].score - scoresWithData[0].score
        : null
    } : {
      totalTests: attempts.length,
      testsWithResults: 0,
      message: 'Results pending for your submitted tests'
    };

    return res.status(200).json({ success: true, trendData, summary });
  } catch (err) {
    console.error('getStudentPerformance error:', err);
    return res.status(500).json({ error: 'Failed to fetch performance data', details: err.message });
  }
};
