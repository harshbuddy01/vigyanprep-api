-- Migration: Add PDF uploads table
-- Date: 2025-12-28
-- Description: Create table to store PDF upload records

CREATE TABLE IF NOT EXISTS pdf_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(200),
    year INT,
    notes TEXT,
    questions_extracted INT DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_exam_type (exam_type),
    INDEX idx_subject (subject),
    INDEX idx_upload_date (upload_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add source and has_formula columns to questions table if they don't exist
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS has_formula TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'Manual Entry',
ADD INDEX IF NOT EXISTS idx_has_formula (has_formula);
