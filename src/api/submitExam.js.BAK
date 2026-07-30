import { pool } from '../config/mysql.js';

export async function submitExam(req, res) {
  try {
    const { attemptId } = req.body;

    if (!attemptId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attempt ID required' 
      });
    }

    console.log('📝 Submitting exam for attempt:', attemptId);

    // Get attempt details
    const [attempts] = await pool.query(
      'SELECT * FROM student_attempts WHERE id = ?',
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attempt not found' 
      });
    }

    const attempt = attempts[0];

    if (attempt.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Exam already submitted',
        data: {
          score: attempt.score,
          correctAnswers: attempt.correct_answers
        }
      });
    }

    console.log('✅ Attempt found, calculating score...');

    // Get all answers with correct answers from questions
    const [answers] = await pool.query(
      `SELECT a.selected_option, q.correct_answer, q.marks
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.attempt_id = ?`,
      [attemptId]
    );

    console.log('📊 Total answers received:', answers.length);

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;
    let totalQuestions = answers.length;

    answers.forEach(ans => {
      if (ans.selected_option && ans.selected_option.toUpperCase() === ans.correct_answer.toUpperCase()) {
        totalScore += parseFloat(ans.marks) || 0;
        correctAnswers++;
      }
    });

    console.log('🎯 Score calculated:', {
      totalScore,
      correctAnswers,
      totalQuestions,
      percentage: ((correctAnswers / totalQuestions) * 100).toFixed(2)
    });

    // Update attempt with results
    await pool.query(
      `UPDATE student_attempts 
       SET status = 'completed', 
           submitted_at = NOW(), 
           score = ?, 
           correct_answers = ?
       WHERE id = ?`,
      [totalScore, correctAnswers, attemptId]
    );

    console.log('✅ Exam submitted successfully!');

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        attemptId,
        score: totalScore,
        correctAnswers,
        totalQuestions,
        percentage: totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('❌ Submit exam error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit exam',
      error: error.message 
    });
  }
}
