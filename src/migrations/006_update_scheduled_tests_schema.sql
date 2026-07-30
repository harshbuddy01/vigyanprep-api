-- Migration 006: Update scheduled_tests table schema
-- Adds missing columns for frontend compatibility
-- Run Date: 2025-12-28

-- Add test_type column if it doesn't exist
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS test_type VARCHAR(50) DEFAULT 'NEST' 
COMMENT 'IAT, NEST, ISI, or custom type'
AFTER test_id;

-- Add start_time column (alternative to exam_time)
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '10:00:00'
COMMENT 'Test start time'
AFTER exam_date;

-- Add duration_minutes column (alternative to duration)
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 180
COMMENT 'Test duration in minutes'
AFTER start_time;

-- Add subjects column (alternative to sections)
ALTER TABLE scheduled_tests 
ADD COLUMN IF NOT EXISTS subjects VARCHAR(255) DEFAULT 'Physics, Chemistry, Mathematics'
COMMENT 'Comma-separated subject names'
AFTER total_questions;

-- Update existing rows to populate new columns from old ones
UPDATE scheduled_tests 
SET 
    test_type = COALESCE(test_type, UPPER(test_id)),
    start_time = COALESCE(start_time, exam_time),
    duration_minutes = COALESCE(duration_minutes, duration),
    subjects = COALESCE(subjects, sections)
WHERE test_type IS NULL OR start_time IS NULL OR duration_minutes IS NULL OR subjects IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_type ON scheduled_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_start_time ON scheduled_tests(start_time);

-- Show updated table structure
DESCRIBE scheduled_tests;

SELECT 'Migration 006 completed successfully' AS status;