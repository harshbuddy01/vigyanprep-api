-- Migration: Add tables for PDF uploads and extracted questions
-- Run this SQL in your MySQL database

-- Table for storing PDF upload records
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    exam_type VARCHAR(50),
    subject VARCHAR(100),
    topic VARCHAR(200),
    year VARCHAR(10),
    notes TEXT,
    questions_extracted INT DEFAULT 0,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_exam_type (exam_type),
    INDEX idx_subject (subject),
    INDEX idx_upload_date (upload_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing questions (if not exists)
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text TEXT NOT NULL,
    subject VARCHAR(100),
    exam_type VARCHAR(50),
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    topic VARCHAR(200),
    year VARCHAR(10),
    options JSON,
    correct_answer VARCHAR(10),
    marks INT DEFAULT 1,
    has_math BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subject (subject),
    INDEX idx_exam_type (exam_type),
    INDEX idx_difficulty (difficulty),
    INDEX idx_topic (topic),
    FULLTEXT idx_question_text (question_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add column to questions table if it doesn't exist (for existing databases)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS has_math BOOLEAN DEFAULT FALSE AFTER marks;

-- Sample data insert (optional - for testing)
-- INSERT INTO pdf_uploads (file_name, exam_type, subject, topic, year, notes, questions_extracted)
-- VALUES ('sample_iat_physics_2024.pdf', 'IAT', 'Physics', 'Mechanics', '2024', 'Sample test paper', 25);
