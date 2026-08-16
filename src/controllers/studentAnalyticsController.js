// backend/controllers/studentAnalyticsController.js
// 📊 COMPREHENSIVE PRODUCTION-GRADE STUDENT CBT PERFORMANCE & ANALYTICS ENGINE
// Segregates Paid Test Series from Free Practice PYQ papers

import { supabase } from '../db/supabase.js';

/**
 * Helper to build empty analytics block
 */
function createEmptyAnalytics() {
  return {
    summary: {
      totalTests: 0,
      totalQuestionsAttempted: 0,
      averageScore: 0,
      bestScore: 0,
      accuracy: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      negativeMarks: 0,
      bestRank: null
    },
    subjectMastery: {
      Physics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
      Chemistry: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
      Mathematics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
      Biology: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 }
    },
    trendData: []
  };
}

/**
 * GET /api/student/analytics/performance
 * Returns student's live analytics segregated into:
 * 1. Test Series Analytics (Paid live mock tests)
 * 2. PYQ Analytics (Past year practice papers)
 * 3. Default Summary (Points to Test Series for primary KPIs)
 */
export const getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.user?.id || req.query?.student_id;
    if (!studentId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Fetch all submitted attempts by this candidate
    const { data: attempts, error: attErr } = await supabase
      .from('attempts')
      .select('id, test_id, started_at, submitted_at, created_at, status, warning_count')
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (attErr) throw attErr;

    if (!attempts || attempts.length === 0) {
      const empty = createEmptyAnalytics();
      return res.status(200).json({
        success: true,
        summary: empty.summary,
        subjectMastery: empty.subjectMastery,
        trendData: empty.trendData,
        testSeriesAnalytics: empty,
        pyqAnalytics: empty
      });
    }

    const attemptIds = attempts.map(a => a.id);
    const testIds = [...new Set(attempts.map(a => a.test_id))];

    // 2. Fetch test details for all these tests
    const { data: testsData } = await supabase
      .from('tests')
      .select('id, title, exam_type, content_type, pyq_year, duration_minutes, response_released_at, status')
      .in('id', testIds);

    const testsById = {};
    (testsData || []).forEach(t => {
      testsById[t.id] = t;
    });

    // 3. Fetch all student answers across these attempts
    const { data: allAnswers } = await supabase
      .from('attempt_answers')
      .select('attempt_id, question_id, answer')
      .in('attempt_id', attemptIds);

    const answersByAttempt = {};
    (allAnswers || []).forEach(a => {
      if (!answersByAttempt[a.attempt_id]) answersByAttempt[a.attempt_id] = {};
      answersByAttempt[a.attempt_id][a.question_id] = a.answer;
    });

    // 4. Fetch questions with answer keys
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('id, test_id, section, correct_answer, marks_positive, marks_negative, question_number')
      .in('test_id', testIds);

    const questionsByTest = {};
    (allQuestions || []).forEach(q => {
      if (!questionsByTest[q.test_id]) questionsByTest[q.test_id] = [];
      questionsByTest[q.test_id].push(q);
    });

    // 5. Fetch stored rank list results if available
    const { data: storedResults } = await supabase
      .from('results')
      .select('attempt_id, rank_overall, percentile, raw_score, section_scores')
      .in('attempt_id', attemptIds);

    const resultsByAttempt = {};
    (storedResults || []).forEach(r => {
      resultsByAttempt[r.attempt_id] = r;
    });

    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

    // Containers for segregated analytics
    const testSeriesAttempts = [];
    const pyqAttempts = [];

    // Evaluate each attempt
    attempts.forEach((attempt, idx) => {
      const test = testsById[attempt.test_id];
      const testQuestions = questionsByTest[attempt.test_id] || [];
      const studentAnsMap = answersByAttempt[attempt.id] || {};
      const storedRes = resultsByAttempt[attempt.id];

      const activeTitle = (test?.title || '').toUpperCase();
      const isExplicitPyq = Boolean(
        test?.content_type === 'pyq' ||
        Boolean(test?.pyq_year) ||
        (activeTitle.includes('PYQ') && !activeTitle.includes('TEST SERIES') && !activeTitle.includes('MOCK')) ||
        (activeTitle.includes('PREVIOUS YEAR') && !activeTitle.includes('TEST SERIES') && !activeTitle.includes('MOCK')) ||
        (activeTitle.includes('OFFICIAL PAPER') && !activeTitle.includes('TEST SERIES') && !activeTitle.includes('MOCK') && !activeTitle.startsWith('IAT 0') && !activeTitle.startsWith('NEST 0'))
      );

      const isPyq = isExplicitPyq;
      const isResultReleased = isPyq || test?.status === 'completed' || Boolean(test?.response_released_at && new Date(test.response_released_at) <= new Date()) || Boolean(storedRes);

      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;
      let totalCalculatedScore = 0;
      const attemptSectionScores = {
        Physics: { correct: 0, incorrect: 0, attempted: 0, score: 0 },
        Chemistry: { correct: 0, incorrect: 0, attempted: 0, score: 0 },
        Mathematics: { correct: 0, incorrect: 0, attempted: 0, score: 0 },
        Biology: { correct: 0, incorrect: 0, attempted: 0, score: 0 }
      };

      const attemptedInThisTest = Object.keys(studentAnsMap).filter(k => !!studentAnsMap[k]).length;

      testQuestions.forEach(q => {
        const studentAns = (studentAnsMap[q.id] || '').trim().toUpperCase();
        const correctKey = (q.correct_answer || '').trim().toUpperCase();
        const sec = q.section && subjects.includes(q.section) ? q.section : 'Physics';
        const mp = q.marks_positive || 4;
        const mn = Math.abs(q.marks_negative || 1);

        if (!studentAns) {
          unattemptedCount++;
        } else {
          attemptSectionScores[sec].attempted++;
          if (isResultReleased && correctKey) {
            if (studentAns === correctKey) {
              correctCount++;
              totalCalculatedScore += mp;
              attemptSectionScores[sec].correct++;
              attemptSectionScores[sec].score += mp;
            } else {
              incorrectCount++;
              totalCalculatedScore -= mn;
              attemptSectionScores[sec].incorrect++;
              attemptSectionScores[sec].score -= mn;
            }
          }
        }
      });

      const totalMarks = test?.total_marks || (testQuestions.length > 0 ? testQuestions.length * 4 : 240);
      const finalScore = storedRes?.raw_score ?? totalCalculatedScore;
      const percentage = totalMarks > 0 ? Math.max(0, Math.round((finalScore / totalMarks) * 100)) : 0;
      const testAccuracy = (correctCount + incorrectCount) > 0 ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) : 0;

      const attemptResultItem = {
        attemptId: attempt.id,
        testId: attempt.test_id,
        testTitle: test?.title || test?.name || `Paper ${idx + 1}`,
        examType: test?.exam_type || 'IAT',
        category: isPyq ? 'pyq' : 'test_series',
        date: attempt.submitted_at || attempt.created_at,
        isResultReleased,
        score: isResultReleased ? finalScore : null,
        totalMarks,
        percentage: isResultReleased ? percentage : null,
        accuracy: isResultReleased ? testAccuracy : null,
        rank: storedRes?.rank_overall ?? (isResultReleased && !isPyq ? 1 : null),
        percentile: storedRes?.percentile ?? (isResultReleased && !isPyq ? 100 : null),
        questionsAttempted: attemptedInThisTest,
        totalQuestions: testQuestions.length || 60,
        correctCount,
        incorrectCount,
        unattemptedCount,
        sectionScores: attemptSectionScores
      };

      if (isPyq) {
        pyqAttempts.push(attemptResultItem);
      } else {
        testSeriesAttempts.push(attemptResultItem);
      }
    });

    /**
     * Helper to compute block metrics from an array of processed attempts
     */
    function computeMetrics(items) {
      const subjectMastery = {
        Physics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
        Chemistry: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
        Mathematics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
        Biology: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 }
      };

      let totalQuestionsAttempted = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;
      const scorePercentages = [];
      const ranks = [];

      items.forEach(item => {
        totalQuestionsAttempted += item.questionsAttempted;
        if (item.isResultReleased) {
          totalCorrect += item.correctCount;
          totalIncorrect += item.incorrectCount;
          if (item.percentage !== null) scorePercentages.push(item.percentage);
          if (item.rank) ranks.push(item.rank);

          subjects.forEach(sec => {
            const secData = item.sectionScores[sec];
            if (secData) {
              subjectMastery[sec].correct += secData.correct;
              subjectMastery[sec].incorrect += secData.incorrect;
              subjectMastery[sec].attempted += secData.attempted;
              subjectMastery[sec].score += secData.score;
            }
          });
        }
      });

      subjects.forEach(sec => {
        const sm = subjectMastery[sec];
        const totalEvaluated = sm.correct + sm.incorrect;
        sm.accuracy = totalEvaluated > 0 ? Math.round((sm.correct / totalEvaluated) * 100) : 0;
      });

      const evaluatedCount = totalCorrect + totalIncorrect;
      const accuracy = evaluatedCount > 0 ? Math.round((totalCorrect / evaluatedCount) * 100) : 0;
      const averageScore = scorePercentages.length > 0 ? Math.round(scorePercentages.reduce((a, b) => a + b, 0) / scorePercentages.length) : 0;
      const bestScore = scorePercentages.length > 0 ? Math.max(...scorePercentages) : 0;
      const bestRank = ranks.length > 0 ? Math.min(...ranks) : (scorePercentages.length > 0 && items.some(i => i.category === 'test_series') ? 1 : null);

      return {
        summary: {
          totalTests: items.length,
          totalQuestionsAttempted,
          averageScore,
          bestScore,
          accuracy,
          totalCorrect,
          totalIncorrect,
          negativeMarks: -totalIncorrect,
          bestRank
        },
        subjectMastery,
        trendData: items
      };
    }

    const testSeriesAnalytics = computeMetrics(testSeriesAttempts);
    const pyqAnalytics = computeMetrics(pyqAttempts);

    // Primary summary defaults to Paid Test Series (or fallback to PYQ if candidate only did PYQs)
    const primaryAnalytics = testSeriesAttempts.length > 0 ? testSeriesAnalytics : (pyqAttempts.length > 0 ? pyqAnalytics : testSeriesAnalytics);

    return res.status(200).json({
      success: true,
      summary: primaryAnalytics.summary,
      subjectMastery: primaryAnalytics.subjectMastery,
      trendData: primaryAnalytics.trendData,
      testSeriesAnalytics,
      pyqAnalytics
    });
  } catch (err) {
    console.error('getStudentPerformance error:', err);
    return res.status(500).json({ error: 'Failed to compute student performance analytics', details: err.message });
  }
};
