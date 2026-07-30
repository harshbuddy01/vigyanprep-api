import { pool } from '../config/mysql.js';

export async function getResult(req, res) {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attempt ID required' 
      });
    }

    console.log('📋 Fetching result for attempt:', attemptId);

    // Get attempt with test details (student_attempts already has email)
    const [attempts] = await pool.query(
      `SELECT sa.*, t.title, t.total_marks, t.test_id, t.duration_minutes
       FROM student_attempts sa
       JOIN tests t ON sa.test_id = t.test_id
       WHERE sa.id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Result not found' 
      });
    }

    const attempt = attempts[0];
    console.log('✅ Attempt found for:', attempt.email);

    // Get roll number from purchases table
    const [purchases] = await pool.query(
      'SELECT roll_number FROM purchases WHERE email = ? AND test_id = ? LIMIT 1',
      [attempt.email, attempt.test_id]
    );

    const rollNumber = purchases.length > 0 ? purchases[0].roll_number : 'N/A';

    // Get all answers with question details
    const [answers] = await pool.query(
      `SELECT 
         q.question_number,
         q.question_text,
         q.option_a,
         q.option_b,
         q.option_c,
         q.option_d,
         q.correct_answer,
         a.selected_option,
         q.marks,
         CASE 
           WHEN a.selected_option IS NOT NULL AND UPPER(a.selected_option) = UPPER(q.correct_answer) 
           THEN 1 
           ELSE 0 
         END as is_correct
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.attempt_id = ?
       ORDER BY q.question_number`,
      [attemptId]
    );

    console.log('📊 Loaded', answers.length, 'answers');

    res.json({
      success: true,
      data: {
        student: {
          email: attempt.email,
          rollNumber: rollNumber
        },
        test: {
          testId: attempt.test_id,
          title: attempt.title,
          totalMarks: attempt.total_marks,
          duration: attempt.duration_minutes
        },
        result: {
          score: attempt.score || 0,
          correctAnswers: attempt.correct_answers || 0,
          totalQuestions: answers.length,
          percentage: attempt.total_marks > 0 
            ? ((attempt.score / attempt.total_marks) * 100).toFixed(2) 
            : '0.00',
          status: attempt.status,
          startTime: attempt.start_time,
          submittedAt: attempt.submitted_at
        },
        answers: answers.map(a => ({
          questionNumber: a.question_number,
          questionText: a.question_text,
          options: {
            A: a.option_a,
            B: a.option_b,
            C: a.option_c,
            D: a.option_d
          },
          selectedOption: a.selected_option,
          correctAnswer: a.correct_answer,
          isCorrect: a.is_correct === 1,
          marks: a.marks
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get result error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get result',
      error: error.message 
    });
  }
}
