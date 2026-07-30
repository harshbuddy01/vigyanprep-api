/**
 * AUTO-CLEANUP: Fix corrupted questions data
 * This runs automatically when server starts
 * Date: 2025-12-29
 * Purpose: Clean up old test questions with invalid data after column migrations
 */

import { pool } from '../config/mysql.js';

export async function fixCorruptedQuestions() {
    try {
        console.log('\n🧽 Cleaning up corrupted questions data...');
        
        // Step 1: Count total questions
        const [total] = await pool.query('SELECT COUNT(*) as count FROM questions');
        const totalCount = total[0]?.count || 0;
        console.log(`📊 Total questions in database: ${totalCount}`);
        
        if (totalCount === 0) {
            console.log('✅ No questions to cleanup');
            return;
        }
        
        // Step 2: Delete questions with invalid test_id
        const [deleted1] = await pool.query(
            `DELETE FROM questions 
             WHERE test_id IS NULL 
                OR test_id = '' 
                OR test_id = '0' 
                OR CAST(test_id AS CHAR) = '0'`
        );
        if (deleted1.affectedRows > 0) {
            console.log(`🗑️ Deleted ${deleted1.affectedRows} questions with invalid test_id`);
        }
        
        // Step 3: Fix numeric answers to letters (from old INT format)
        const [updated] = await pool.query(
            `UPDATE questions 
             SET correct_answer = CASE correct_answer
                 WHEN '0' THEN 'A'
                 WHEN '1' THEN 'B'
                 WHEN '2' THEN 'C'
                 WHEN '3' THEN 'D'
                 ELSE correct_answer
             END
             WHERE correct_answer IN ('0', '1', '2', '3')`
        );
        if (updated.affectedRows > 0) {
            console.log(`🔄 Converted ${updated.affectedRows} numeric answers to letters`);
        }
        
        // Step 4: Delete questions with NULL or empty correct_answer
        const [deleted2] = await pool.query(
            `DELETE FROM questions 
             WHERE correct_answer IS NULL 
                OR correct_answer = ''`
        );
        if (deleted2.affectedRows > 0) {
            console.log(`🗑️ Deleted ${deleted2.affectedRows} questions with empty answers`);
        }
        
        // Step 5: Fix questions with NULL or invalid options
        const [deleted3] = await pool.query(
            `DELETE FROM questions 
             WHERE options IS NULL 
                OR options = '' 
                OR options = '[]'`
        );
        if (deleted3.affectedRows > 0) {
            console.log(`🗑️ Deleted ${deleted3.affectedRows} questions with empty options`);
        }
        
        // Step 6: Count remaining questions
        const [remaining] = await pool.query('SELECT COUNT(*) as count FROM questions');
        const remainingCount = remaining[0]?.count || 0;
        
        console.log(`✅ Cleanup complete!`);
        console.log(`📊 Remaining questions: ${remainingCount}`);
        console.log(`🗑️ Cleaned up: ${totalCount - remainingCount} corrupted questions`);
        
        if (remainingCount === 0) {
            console.log('⚠️ No valid questions found. Database is empty.');
            console.log('💡 Please add new questions using the Add Questions form.');
        }
        
    } catch (error) {
        console.error('❌ Cleanup error:', error.message);
        console.error('💡 This is not critical - server will continue to run');
        console.error('💡 But you may see empty questions list until cleanup completes');
    }
}
