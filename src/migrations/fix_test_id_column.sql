-- Migration: Fix test_id column to accept string values like 'NEST_2025_01'
-- Date: 2025-12-28
-- Description: Changes test_id from INT to VARCHAR(50) in questions table

-- Step 1: Check current structure
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'questions' 
    AND TABLE_SCHEMA = DATABASE();

-- Step 2: Modify the column type
ALTER TABLE questions 
MODIFY COLUMN test_id VARCHAR(50) NOT NULL;

-- Step 3: Add index for better performance (optional)
ALTER TABLE questions 
ADD INDEX idx_test_id (test_id);

-- Step 4: Verify the change
DESCRIBE questions;

-- Expected result:
-- Field: test_id
-- Type: varchar(50)
-- Null: NO
-- Key: MUL
-- Default: NULL
-- Extra: 

SELECT 'Migration completed successfully!' as status;
