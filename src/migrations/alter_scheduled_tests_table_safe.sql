-- Safe Migration to Update Scheduled Tests Table
-- This migration handles existing columns gracefully and prevents errors on re-run
-- Created: 2025-12-28
-- Purpose: Add missing columns that backend code expects

-- ==================================================
-- STEP 1: Add new columns (safe - won't fail if exists)
-- ==================================================

-- Add test_type column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS test_type VARCHAR(50) DEFAULT 'NEST' 
COMMENT 'Exam type: IAT, NEST, ISI';

-- Add start_time column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '10:00:00' 
COMMENT 'Test start time';

-- Add duration_minutes column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 180 
COMMENT 'Test duration in minutes';

-- Add subjects column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS subjects VARCHAR(255) DEFAULT 'Physics, Chemistry, Mathematics' 
COMMENT 'Comma-separated list of subjects';

-- Add description column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS description TEXT 
COMMENT 'Test description or instructions';

-- Add total_questions column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0 
COMMENT 'Total number of questions in test';

-- Add total_marks column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS total_marks INT DEFAULT 100 
COMMENT 'Maximum marks for the test';

-- Add status column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled' 
COMMENT 'Test status: scheduled, active, completed, cancelled';

-- ==================================================
-- STEP 2: Migrate data from old columns to new ones
-- ==================================================

-- Copy exam_time to start_time if exam_time exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND COLUMN_NAME = 'exam_time';

SET @sql = IF(@col_exists > 0,
  'UPDATE scheduled_tests SET start_time = exam_time WHERE exam_time IS NOT NULL',
  'SELECT "Column exam_time does not exist, skipping data migration" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Copy duration to duration_minutes if duration exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND COLUMN_NAME = 'duration';

SET @sql = IF(@col_exists > 0,
  'UPDATE scheduled_tests SET duration_minutes = duration WHERE duration IS NOT NULL',
  'SELECT "Column duration does not exist, skipping data migration" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Copy sections to subjects if sections exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND COLUMN_NAME = 'sections';

SET @sql = IF(@col_exists > 0,
  'UPDATE scheduled_tests SET subjects = sections WHERE sections IS NOT NULL',
  'SELECT "Column sections does not exist, skipping data migration" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================================================
-- STEP 3: Drop old columns (safe - won't fail if they don't exist)
-- ==================================================

-- Drop exam_time if it exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND COLUMN_NAME = 'exam_time';

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE scheduled_tests DROP COLUMN exam_time',
  'SELECT "Column exam_time already dropped" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop duration if it exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND COLUMN_NAME = 'duration';

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE scheduled_tests DROP COLUMN duration',
  'SELECT "Column duration already dropped" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop sections if it exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND COLUMN_NAME = 'sections';

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE scheduled_tests DROP COLUMN sections',
  'SELECT "Column sections already dropped" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================================================
-- STEP 4: Add indexes (safe - checks if they exist first)
-- ==================================================

-- Add index on test_type if it doesn't exist
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND INDEX_NAME = 'idx_test_type';

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_test_type ON scheduled_tests (test_type)',
  'SELECT "Index idx_test_type already exists" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on status if it doesn't exist
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND INDEX_NAME = 'idx_status';

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_status ON scheduled_tests (status)',
  'SELECT "Index idx_status already exists" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on exam_date if it doesn't exist
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND INDEX_NAME = 'idx_exam_date';

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_exam_date ON scheduled_tests (exam_date)',
  'SELECT "Index idx_exam_date already exists" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique index on test_id if it doesn't exist
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'scheduled_tests' 
  AND INDEX_NAME = 'unique_test_id';

SET @sql = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX unique_test_id ON scheduled_tests (test_id)',
  'SELECT "Index unique_test_id already exists" AS Info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================================================
-- STEP 5: Verify migration success
-- ==================================================

SELECT 
    'Migration completed successfully!' AS Status,
    COUNT(*) AS TotalTests
FROM scheduled_tests;

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scheduled_tests'
ORDER BY ORDINAL_POSITION;

SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scheduled_tests'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;