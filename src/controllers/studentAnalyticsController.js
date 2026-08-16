// backend/controllers/studentAnalyticsController.js
// 📊 COMPREHENSIVE PRODUCTION-GRADE STUDENT CBT PERFORMANCE & ANALYTICS ENGINE

import { supabase } from '../db/supabase.js';

/**
 * GET /api/student/analytics/performance
 * Returns student's live analytics, subject mastery, score trends, and KPI summaries
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
      return res.status(200).json({
        success: true,
        summary: {
          totalTests: 0,
          totalQuestionsAttempted: 0,
          averageScore: 0,
          bestScore: 0,
          accuracy: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
          bestRank: null
        },
        subjectMastery: {
          Physics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
          Chemistry: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
          Mathematics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
          Biology: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 }
        },
        trendData: []
      });
    }

    const attemptIds = attempts.map(a => a.id);
    const testIds = [...new Set(attempts.map(a => a.test_id))];

    // 1.5 Fetch test details for all these tests
    const { data: testsData } = await supabase
      .from('tests')
      .select('id, title, exam_type, content_type, pyq_year, duration_minutes, response_released_at, status')
      .in('id', testIds);

    const testsById = {};
    (testsData || []).forEach(t => {
      testsById[t.id] = t;
    });

    // 2. Fetch all student answers across these attempts
    const { data: allAnswers } = await supabase
      .from('attempt_answers')
      .select('attempt_id, question_id, answer')
      .in('attempt_id', attemptIds);

    // Group answers by attempt_id
    const answersByAttempt = {};
    (allAnswers || []).forEach(a => {
      if (!answersByAttempt[a.attempt_id]) answersByAttempt[a.attempt_id] = {};
      answersByAttempt[a.attempt_id][a.question_id] = a.answer;
    });

    // 3. Fetch questions with answer keys for evaluation
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('id, test_id, section, correct_answer, marks_positive, marks_negative, question_number')
      .in('test_id', testIds);

    const questionsByTest = {};
    (allQuestions || []).forEach(q => {
      if (!questionsByTest[q.test_id]) questionsByTest[q.test_id] = [];
      questionsByTest[q.test_id].push(q);
    });

    // 4. Fetch stored rank list results if available
    const { data: storedResults } = await supabase
      .from('results')
      .select('attempt_id, rank_overall, percentile, raw_score, section_scores')
      .in('attempt_id', attemptIds);

    const resultsByAttempt = {};
    (storedResults || []).forEach(r => {
      resultsByAttempt[r.attempt_id] = r;
    });

    // 5. Evaluate each attempt
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const subjectMastery = {
      Physics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
      Chemistry: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
      Mathematics: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 },
      Biology: { correct: 0, incorrect: 0, attempted: 0, score: 0, accuracy: 0 }
    };

    let globalCorrect = 0;
    let globalIncorrect = 0;
    let globalQuestionsAttempted = 0;
    const testScorePercentages = [];
    const ranksRecorded = [];

    const trendData = attempts.map((attempt, idx) => {
      const test = testsById[attempt.test_id];
      const testQuestions = questionsByTest[attempt.test_id] || [];
      const studentAnsMap = answersByAttempt[attempt.id] || {};
      const storedRes = resultsByAttempt[attempt.id];

      const isPyq = test?.content_type === 'pyq';
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
      globalQuestionsAttempted += attemptedInThisTest;

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
              subjectMastery[sec].correct++;
              subjectMastery[sec].score += mp;
            } else {
              incorrectCount++;
              totalCalculatedScore -= mn;
              attemptSectionScores[sec].incorrect++;
              attemptSectionScores[sec].score -= mn;
              subjectMastery[sec].incorrect++;
              subjectMastery[sec].score -= mn;
            }
            subjectMastery[sec].attempted++;
          }
        }
      });

      if (isResultReleased) {
        globalCorrect += correctCount;
        globalIncorrect += incorrectCount;
      }

      const totalMarks = test?.total_marks || (testQuestions.length > 0 ? testQuestions.length * 4 : 240);
      const finalScore = storedRes?.raw_score ?? totalCalculatedScore;
      const percentage = totalMarks > 0 ? Math.max(0, Math.round((finalScore / totalMarks) * 100)) : 0;
      const testAccuracy = (correctCount + incorrectCount) > 0 ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) : 0;

      if (isResultReleased) {
        testScorePercentages.push(percentage);
        if (storedRes?.rank_overall) ranksRecorded.push(storedRes.rank_overall);
      }

      return {
        attemptId: attempt.id,
        testId: attempt.test_id,
        testTitle: test?.title || test?.name || `Test ${idx + 1}`,
        examType: test?.exam_type || 'IAT',
        date: attempt.submitted_at || attempt.created_at,
        isResultReleased,
        score: isResultReleased ? finalScore : null,
        totalMarks,
        percentage: isResultReleased ? percentage : null,
        accuracy: isResultReleased ? testAccuracy : null,
        rank: storedRes?.rank_overall ?? (isResultReleased ? 1 : null),
        percentile: storedRes?.percentile ?? (isResultReleased ? 100 : null),
        questionsAttempted: attemptedInThisTest,
        totalQuestions: testQuestions.length || 60,
        sectionScores: attemptSectionScores
      };
    });

    // 6. Compute Subject Mastery Percentages
    subjects.forEach(sec => {
      const sm = subjectMastery[sec];
      const totalEvaluated = sm.correct + sm.incorrect;
      sm.accuracy = totalEvaluated > 0 ? Math.round((sm.correct / totalEvaluated) * 100) : 0;
    });

    // 7. Global Summary KPIs
    const totalAttemptedEvaluated = globalCorrect + globalIncorrect;
    const globalAccuracy = totalAttemptedEvaluated > 0 ? Math.round((globalCorrect / totalAttemptedEvaluated) * 100) : 0;
    const averageScore = testScorePercentages.length > 0 ? Math.round(testScorePercentages.reduce((a, b) => a + b, 0) / testScorePercentages.length) : 0;
    const bestScore = testScorePercentages.length > 0 ? Math.max(...testScorePercentages) : 0;
    const bestRank = ranksRecorded.length > 0 ? Math.min(...ranksRecorded) : (testScorePercentages.length > 0 ? 1 : null);

    const summary = {
      totalTests: attempts.length,
      totalQuestionsAttempted: globalQuestionsAttempted,
      averageScore,
      bestScore,
      accuracy: globalAccuracy,
      totalCorrect: globalCorrect,
      totalIncorrect: globalIncorrect,
      bestRank
    };

    return res.status(200).json({
      success: true,
      summary,
      subjectMastery,
      trendData
    });
  } catch (err) {
    console.error('getStudentPerformance error:', err);
    return res.status(500).json({ error: 'Failed to compute student performance analytics', details: err.message });
  }
};
