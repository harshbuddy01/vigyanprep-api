-- Migration to update existing scheduled_tests table
-- This adds missing columns that the backend code expects

-- Add test_type column (will be ignored if exists due to error handling in runMigrations.js)
ALTER TABLE scheduled_tests 
ADD COLUMN test_type VARCHAR(50) DEFAULT 'NEST' COMMENT 'IAT, NEST, ISI';

-- Rename exam_time to start_time
ALTER TABLE scheduled_tests 
CHANGE COLUMN exam_time start_time TIME DEFAULT '10:00:00';

-- Rename duration to duration_minutes
ALTER TABLE scheduled_tests 
CHANGE COLUMN duration duration_minutes INT NOT NULL DEFAULT 180 COMMENT 'Duration in minutes';

-- Rename sections to subjects
ALTER TABLE scheduled_tests 
CHANGE COLUMN sections subjects VARCHAR(255) DEFAULT 'Physics, Chemistry, Mathematics' COMMENT 'Comma-separated subjects';

-- Add index on test_type
ALTER TABLE scheduled_tests 
ADD INDEX idx_test_type (test_type);

-- Make test_id UNIQUE
ALTER TABLE scheduled_tests 
ADD UNIQUE INDEX unique_test_id (test_id);