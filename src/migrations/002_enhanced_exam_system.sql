-- Enhanced Exam System Database Schema
-- Supports calendar-based scheduling, images, and multiple question input methods

-- 1. Create scheduled_tests table
CREATE TABLE IF NOT EXISTS scheduled_tests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id VARCHAR(50) UNIQUE NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  test_type ENUM('IAT', 'NEST', 'ISI') NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 180,
  status ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
  description TEXT,
  total_questions INT DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exam_date (exam_date),
  INDEX idx_status (status),
  INDEX idx_test_id (test_id)
);

-- 2. Update questions table with enhanced fields
ALTER TABLE questions 
  ADD COLUMN IF NOT EXISTS section ENUM('Physics', 'Chemistry', 'Maths', 'Biology') NOT NULL DEFAULT 'Physics',
  ADD COLUMN IF NOT EXISTS question_image_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS has_latex BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marks_positive DECIMAL(5,2) DEFAULT 4.00,
  ADD COLUMN IF NOT EXISTS marks_negative DECIMAL(5,2) DEFAULT -1.00,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS input_method ENUM('pdf', 'manual', 'image') DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. Add indexes for better performance
ALTER TABLE questions
  ADD INDEX IF NOT EXISTS idx_section (section),
  ADD INDEX IF NOT EXISTS idx_test_date (test_id, question_number);

-- 4. Create question_images table (for questions with multiple images)
CREATE TABLE IF NOT EXISTS question_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_type ENUM('question', 'option', 'explanation') DEFAULT 'question',
  image_order INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_question_id (question_id)
);

-- 5. Create test_sections table (to track section-wise details)
CREATE TABLE IF NOT EXISTS test_sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id VARCHAR(50) NOT NULL,
  section_name ENUM('Physics', 'Chemistry', 'Maths', 'Biology') NOT NULL,
  total_questions INT NOT NULL DEFAULT 30,
  marks_per_question DECIMAL(5,2) DEFAULT 4.00,
  negative_marks DECIMAL(5,2) DEFAULT -1.00,
  section_order INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES scheduled_tests(test_id) ON DELETE CASCADE,
  UNIQUE KEY unique_test_section (test_id, section_name)
);

-- 6. Update student_attempts table with section-wise scores
ALTER TABLE student_attempts
  ADD COLUMN IF NOT EXISTS section_scores JSON COMMENT 'Stores section-wise scores: {Physics: 80, Chemistry: 70, ...}',
  ADD COLUMN IF NOT EXISTS best_three_sections JSON COMMENT 'For NEST: stores which 3 sections were counted',
  ADD COLUMN IF NOT EXISTS test_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS exam_date DATE;

-- 7. Create admin_logs table (track admin actions)
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) COMMENT 'test, question, student, etc.',
  entity_id VARCHAR(100),
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_email),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);

-- 8. Create pdf_uploads table (track uploaded PDFs)
CREATE TABLE IF NOT EXISTS pdf_uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL,
  pdf_filename VARCHAR(255) NOT NULL,
  pdf_url VARCHAR(500),
  questions_extracted INT DEFAULT 0,
  upload_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  INDEX idx_test_id (test_id),
  INDEX idx_status (upload_status)
);

-- Sample data for testing
INSERT INTO scheduled_tests (test_id, test_name, test_type, exam_date, start_time, duration_minutes, status, description) VALUES
('iat_jan_2026', 'IAT January 2026', 'IAT', '2026-01-15', '10:00:00', 180, 'scheduled', 'Indian Aptitude Test - January 2026'),
('nest_jan_2026', 'NEST January 2026', 'NEST', '2026-01-20', '10:00:00', 180, 'scheduled', 'NEST Exam - Best 3 out of 4 sections counted')
ON DUPLICATE KEY UPDATE test_name = test_name;

-- Sample test sections
INSERT INTO test_sections (test_id, section_name, total_questions, section_order) VALUES
('iat_jan_2026', 'Physics', 30, 1),
('iat_jan_2026', 'Chemistry', 30, 2),
('iat_jan_2026', 'Maths', 30, 3),
('iat_jan_2026', 'Biology', 30, 4),
('nest_jan_2026', 'Physics', 30, 1),
('nest_jan_2026', 'Chemistry', 30, 2),
('nest_jan_2026', 'Maths', 30, 3),
('nest_jan_2026', 'Biology', 30, 4)
ON DUPLICATE KEY UPDATE total_questions = total_questions;
