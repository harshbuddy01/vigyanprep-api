-- Cleanup corrupted question data after column type migrations
-- Date: 2025-12-28
-- Purpose: Fix any questions that have invalid data after INT->VARCHAR migrations

-- Step 1: Check for questions with NULL or invalid test_id
SELECT 
    id, 
    test_id, 
    question_text,
    correct_answer
FROM questions 
WHERE test_id IS NULL 
   OR test_id = '' 
   OR test_id = '0'
LIMIT 10;

-- Step 2: Delete questions with invalid test_id (optional - uncomment if needed)
-- DELETE FROM questions WHERE test_id IS NULL OR test_id = '' OR test_id = '0';

-- Step 3: Check for questions with NULL or empty correct_answer
SELECT 
    id, 
    test_id,
    question_text,
    correct_answer
FROM questions 
WHERE correct_answer IS NULL 
   OR correct_answer = ''
LIMIT 10;

-- Step 4: Fix questions with numeric correct_answer (from old INT format)
-- Convert 0->A, 1->B, 2->C, 3->D (if applicable)
UPDATE questions 
SET correct_answer = CASE correct_answer
    WHEN '0' THEN 'A'
    WHEN '1' THEN 'B'
    WHEN '2' THEN 'C'
    WHEN '3' THEN 'D'
    ELSE correct_answer
END
WHERE correct_answer IN ('0', '1', '2', '3');

-- Step 5: Check for questions with invalid JSON in options field
SELECT 
    id,
    test_id,
    question_text,
    options
FROM questions
WHERE options IS NULL 
   OR options = ''
   OR options = '[]'
LIMIT 10;

-- Step 6: Verify final state
SELECT 
    COUNT(*) as total_questions,
    COUNT(DISTINCT test_id) as unique_tests,
    COUNT(CASE WHEN correct_answer IS NULL THEN 1 END) as null_answers,
    COUNT(CASE WHEN options IS NULL OR options = '' THEN 1 END) as null_options
FROM questions;

SELECT 'Cleanup check complete! Review results above.' as message;
