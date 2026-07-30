-- MANUAL FIX: Create scheduled_tests table
-- Run this directly in Railway MySQL console if migrations didn't execute

CREATE TABLE IF NOT EXISTS scheduled_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    test_id VARCHAR(50) NOT NULL COMMENT 'iat, nest, or isi',
    exam_date DATE NOT NULL,
    exam_time TIME DEFAULT '10:00:00',
    duration INT NOT NULL DEFAULT 180 COMMENT 'Duration in minutes',
    total_marks INT NOT NULL DEFAULT 100,
    total_questions INT DEFAULT 0,
    sections VARCHAR(255) DEFAULT 'Physics,Chemistry,Mathematics' COMMENT 'Comma-separated sections',
    description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' COMMENT 'scheduled, ongoing, completed, cancelled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_test_id (test_id),
    INDEX idx_exam_date (exam_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table was created
SHOW TABLES LIKE 'scheduled_tests';

-- Show table structure
DESCRIBE scheduled_tests;