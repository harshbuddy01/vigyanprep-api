-- Fix questions table schema - Add missing columns
-- This migration adds columns that might be missing from older table versions
-- MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so we use prepared statements

-- Add marks_positive column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'questions';
SET @columnname = 'marks_positive';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN marks_positive DECIMAL(4,2) DEFAULT 4.00'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add marks_negative column if it doesn't exist
SET @columnname = 'marks_negative';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN marks_negative DECIMAL(4,2) DEFAULT -1.00'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add has_math column if it doesn't exist (for PDF extraction)
SET @columnname = 'has_math';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN has_math BOOLEAN DEFAULT FALSE'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add exam_type column if it doesn't exist (for PDF metadata)
SET @columnname = 'exam_type';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN exam_type VARCHAR(50) DEFAULT NULL'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add year column if it doesn't exist (for PDF metadata)
SET @columnname = 'year';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN year VARCHAR(10) DEFAULT NULL'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add has_latex column if it doesn't exist (legacy name for has_math)
SET @columnname = 'has_latex';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN has_latex BOOLEAN DEFAULT FALSE'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add subject column if it doesn't exist (metadata)
SET @columnname = 'subject';
SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE (TABLE_SCHEMA = @dbname)
         AND (TABLE_NAME = @tablename)
         AND (COLUMN_NAME = @columnname)) > 0,
        'SELECT 1',
        'ALTER TABLE questions ADD COLUMN subject VARCHAR(100) DEFAULT NULL'
    )
);
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing rows to have default values for marks
UPDATE questions 
SET marks_positive = 4.00 
WHERE marks_positive IS NULL OR marks_positive = 0;

UPDATE questions 
SET marks_negative = -1.00 
WHERE marks_negative IS NULL OR marks_negative = 0;

SELECT 'Questions table schema fixed successfully - all required columns added' as message;