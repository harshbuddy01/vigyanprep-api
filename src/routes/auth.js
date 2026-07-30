/**
 * Authentication Routes
 * Created: 2026-01-26
 * Purpose: Handle admin login and authentication
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For password hashing (install: npm install bcryptjs)

// Temporary in-memory admin credentials
// TODO: Move to database in production
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    // Default password: 'admin123' (hashed)
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$10$X8h1jBqPqEQxV.6lY7bQz.Yz7e8TwKWVxJvqDkR5YJ0gLZXg1K1LS'
};

/**
 * POST /api/admin/auth/login
 * Admin login endpoint
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Login attempt:', { username, timestamp: new Date().toISOString() });

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check username
        if (username !== ADMIN_CREDENTIALS.username) {
            console.warn('❌ Invalid username:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash);

        if (!isPasswordValid) {
            console.warn('❌ Invalid password for user:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Successful login
        console.log('✅ Login successful:', username);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                username: username,
                role: 'admin',
                loginTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

/**
 * POST /api/admin/auth/validate-session
 * Validate if session is still active
 */
router.post('/validate-session', (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username required'
            });
        }

        // In a real app, check session in database/Redis
        return res.status(200).json({
            success: true,
            message: 'Session valid',
            data: {
                username: username,
                sessionActive: true
            }
        });

    } catch (error) {
        console.error('❌ Session validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/admin/auth/logout
 * Handle logout
 */
router.post('/logout', (req, res) => {
    try {
        const { username } = req.body;

        console.log('🚪 Logout:', username);

        // In a real app, clear session from database/Redis

        return res.status(200).json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * Utility: Generate password hash
 * Usage: Call this endpoint to generate hash for new password
 * Example: POST /api/admin/auth/generate-hash with { password: 'newpassword' }
 */
router.post('/generate-hash', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password required'
            });
        }

        const hash = await bcrypt.hash(password, 10);

        return res.status(200).json({
            success: true,
            hash: hash,
            message: 'Add this hash to your .env file as ADMIN_PASSWORD_HASH'
        });

    } catch (error) {
        console.error('❌ Hash generation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;