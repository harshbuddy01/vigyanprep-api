-- Migration: Create admin_notifications table
-- Created: 2025-12-28
-- Purpose: Store admin dashboard notifications

CREATE TABLE IF NOT EXISTS admin_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample notifications
INSERT INTO admin_notifications (title, message, type, is_read, created_at) VALUES
('Welcome to IIN Admin Dashboard', 'Dashboard v2.0 is now live with real-time notifications', 'success', 0, NOW()),
('System Status', 'All systems operational', 'info', 0, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('Database Connected', 'MySQL database connection successful', 'success', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR));
