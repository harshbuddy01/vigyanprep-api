/**
 * AUTO-MIGRATION: Fix test_id and correct_answer columns from INT to VARCHAR
 * This runs automatically when server starts
 * Date: 2025-12-28
 * Updated: Handle foreign key constraints + fix correct_answer column
 */

import { pool } from '../config/mysql.js';

export async function fixTestIdColumn() {
    try {
        console.log('\n🔧 Checking if questions table columns need migration...');
        
        // ============ FIX test_id COLUMN ============
        
        // Check current column type for test_id
        const [testIdColumns] = await pool.query(`
            SELECT COLUMN_TYPE, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'questions' 
                AND COLUMN_NAME = 'test_id'
                AND TABLE_SCHEMA = DATABASE()
        `);
        
        if (testIdColumns.length > 0) {
            const testIdType = testIdColumns[0].DATA_TYPE;
            console.log(`📊 Current test_id type: ${testIdType}`);
            
            // If it's not varchar, fix it
            if (testIdType !== 'varchar' && testIdType !== 'text') {
                console.log('🔨 Migrating test_id from INT to VARCHAR(50)...');
                
                // Step 1: Check for foreign key constraints
                const [foreignKeys] = await pool.query(`
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_NAME = 'questions' 
                        AND COLUMN_NAME = 'test_id' 
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                        AND TABLE_SCHEMA = DATABASE()
                `);
                
                // Step 2: Drop foreign key if it exists
                if (foreignKeys.length > 0) {
                    for (const fk of foreignKeys) {
                        const constraintName = fk.CONSTRAINT_NAME;
                        console.log(`🔓 Dropping foreign key: ${constraintName}`);
                        await pool.query(`ALTER TABLE questions DROP FOREIGN KEY ${constraintName}`);
                    }
                }
                
                // Step 3: Change column type
                await pool.query(`
                    ALTER TABLE questions 
                    MODIFY COLUMN test_id VARCHAR(50) NOT NULL
                `);
                
                console.log('✅ test_id migration successful! Now VARCHAR(50)');
                
                // Step 4: Add index for better performance (if not exists)
                try {
                    await pool.query(`
                        ALTER TABLE questions 
                        ADD INDEX idx_test_id (test_id)
                    `);
                    console.log('✅ Added index on test_id');
                } catch (indexError) {
                    if (indexError.code === 'ER_DUP_KEYNAME') {
                        console.log('ℹ️ test_id index already exists (OK)');
                    }
                }
                
                console.log('ℹ️ Foreign key removed for flexibility (text-based test IDs)');
            } else {
                console.log('✅ test_id column is already VARCHAR - no migration needed');
            }
        }
        
        // ============ FIX correct_answer COLUMN ============
        
        // Check current column type for correct_answer
        const [answerColumns] = await pool.query(`
            SELECT COLUMN_TYPE, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'questions' 
                AND COLUMN_NAME = 'correct_answer'
                AND TABLE_SCHEMA = DATABASE()
        `);
        
        if (answerColumns.length > 0) {
            const answerType = answerColumns[0].DATA_TYPE;
            console.log(`📊 Current correct_answer type: ${answerType}`);
            
            // If it's not varchar, fix it
            if (answerType !== 'varchar' && answerType !== 'text' && answerType !== 'char') {
                console.log('🔨 Migrating correct_answer from INT to VARCHAR(10)...');
                
                // Change column type (allow NULL temporarily for flexibility)
                await pool.query(`
                    ALTER TABLE questions 
                    MODIFY COLUMN correct_answer VARCHAR(10) NULL
                `);
                
                console.log('✅ correct_answer migration successful! Now VARCHAR(10)');
                console.log('✅ You can now use answer values like: A, B, C, D, or text answers');
            } else {
                console.log('✅ correct_answer column is already VARCHAR - no migration needed');
            }
        }
        
        console.log('\n✅ All column migrations completed successfully!');
        console.log('✅ You can now use:');
        console.log('   - test_id: NEST_2026_01, IAT_2026_01, ISI_2026_01');
        console.log('   - correct_answer: A, B, C, D');
        console.log('');
        
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        console.error('💡 This is not critical - server will continue to run');
        console.error('💡 But you won\'t be able to use text-based IDs until this is fixed');
        console.error('💡 Manual fix: Run these SQL commands in Railway MySQL:');
        console.error('   ALTER TABLE questions DROP FOREIGN KEY questions_ibfk_1;');
        console.error('   ALTER TABLE questions MODIFY COLUMN test_id VARCHAR(50) NOT NULL;');
        console.error('   ALTER TABLE questions MODIFY COLUMN correct_answer VARCHAR(10) NULL;');
    }
}
