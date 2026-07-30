import { pool } from '../config/mysql.js';

export async function syncAnswer(req, res) {
  try {
    const { attemptId, questionId, answer } = req.body;

    if (!attemptId || !questionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attempt ID and Question ID required' 
      });
    }

    console.log('💾 Syncing answer:', { attemptId, questionId, answer });

    // Verify attempt exists and is still in progress
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

    // Check if time hasn't expired
    const now = new Date();
    const endTime = new Date(attempt.end_time);

    if (now > endTime && attempt.status !== 'completed') {
      // Auto-submit if time expired
      await pool.query(
        "UPDATE student_attempts SET status = 'completed', submitted_at = NOW() WHERE id = ?",
        [attemptId]
      );
      
      return res.status(400).json({ 
        success: false, 
        message: 'Time expired. Exam auto-submitted.',
        timeExpired: true
      });
    }

    // Check if answer already exists
    const [existing] = await pool.query(
      'SELECT id FROM answers WHERE attempt_id = ? AND question_id = ?',
      [attemptId, questionId]
    );

    if (existing.length > 0) {
      // Update existing answer
      await pool.query(
        'UPDATE answers SET selected_option = ?, answered_at = NOW() WHERE id = ?',
        [answer || null, existing[0].id]
      );
      console.log('✅ Answer updated');
    } else {
      // Insert new answer
      await pool.query(
        'INSERT INTO answers (attempt_id, question_id, selected_option, answered_at) VALUES (?, ?, ?, NOW())',
        [attemptId, questionId, answer || null]
      );
      console.log('✅ Answer saved');
    }

    res.json({ 
      success: true, 
      message: 'Answer synced successfully',
      data: { attemptId, questionId, answer }
    });

  } catch (error) {
    console.error('❌ Sync answer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync answer',
      error: error.message 
    });
  }
}
