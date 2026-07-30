import { pool } from '../config/mysql.js';

export async function startExam(req, res) {
  try {
    const { email, testId } = req.body;

    // Validate inputs
    if (!email || !testId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and Test ID required' 
      });
    }

    console.log('📝 Starting exam for:', email, testId);

    // Check if user has purchased this test
    const [purchases] = await pool.query(
      'SELECT * FROM purchases WHERE email = ? AND test_id = ?',
      [email.toLowerCase(), testId.toLowerCase()]
    );

    if (purchases.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found. Please purchase this test first.' 
      });
    }

    const purchase = purchases[0];
    console.log('✅ Purchase verified:', purchase);

    // Get test details
    const [tests] = await pool.query(
      'SELECT * FROM tests WHERE test_id = ?',
      [testId.toLowerCase()]
    );

    if (tests.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test not found' 
      });
    }

    const test = tests[0];
    console.log('✅ Test found:', test.title);

    // Check if already attempted
    const [attempts] = await pool.query(
      'SELECT * FROM student_attempts WHERE email = ? AND test_id = ?',
      [email.toLowerCase(), testId.toLowerCase()]
    );

    if (attempts.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already attempted this test',
        attempt: attempts[0]
      });
    }

    // Create new attempt
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + test.duration_minutes * 60000);

    const [result] = await pool.query(
      `INSERT INTO student_attempts 
       (email, test_id, start_time, end_time, status) 
       VALUES (?, ?, ?, ?, 'in_progress')`,
      [email.toLowerCase(), testId.toLowerCase(), startTime, endTime]
    );

    const attemptId = result.insertId;
    console.log('✅ Attempt created with ID:', attemptId);

    // Get questions for this test
    const [questions] = await pool.query(
      'SELECT * FROM questions WHERE test_id = ? ORDER BY question_number',
      [testId.toLowerCase()]
    );

    console.log('✅ Loaded', questions.length, 'questions');

    res.json({
      success: true,
      data: {
        attemptId,
        student: {
          email: purchase.email,
          rollNumber: purchase.roll_number
        },
        test: {
          testId: test.test_id,
          title: test.title,
          duration: test.duration_minutes,
          totalMarks: test.total_marks,
          totalQuestions: questions.length
        },
        timing: {
          startTime,
          endTime,
          duration: test.duration_minutes
        },
        questions: questions.map(q => ({
          id: q.id,
          questionNumber: q.question_number,
          questionText: q.question_text,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          marks: q.marks
        }))
      }
    });

  } catch (error) {
    console.error('❌ Start exam error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start exam',
      error: error.message 
    });
  }
}
