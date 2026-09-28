/**
 * Authentication Routes for Admin Login
 * Created: 2026-01-26
 * Purpose: Handle admin login and authentication
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../db/supabase.js';
import { generateAuthToken } from '../middlewares/auth.js';

const router = express.Router();

// Temporary in-memory admin credentials
// TODO: Move to database in production
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    // Default password: 'admin123' (hashed)
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$10$X8h1jBqPqEQxV.6lY7bQz.Yz7e8TwKWVxJvqDkR5YJ0gLZXg1K1LS'
};

console.log('🔐 Auth routes loaded - Admin username:', ADMIN_CREDENTIALS.username);

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
 * POST /api/auth/student-login and /api/student-login
 * Direct Student Login via VIP Pass-Code or Student Credentials
 * Allows students who received an email with a pass code (e.g. VP-832569) to log in instantly.
 */
router.post(['/auth/student-login', '/student-login'], async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPassword = String(password).trim().toUpperCase();

        // 1. Look up student in students table
        const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        // 2. Look up active subscriptions for this student
        const { data: activeSubs } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('student_email', cleanEmail)
            .eq('status', 'active');

        const now = new Date();
        const matchingSub = (activeSubs || []).find(s => {
            if (new Date(s.expires_at) <= now) return false;
            const rawPass = String(s.razorpay_payment_id || '').trim().toUpperCase();
            return (
                rawPass === cleanPassword ||
                rawPass === `PASS: ${cleanPassword}` ||
                rawPass === `PASS:${cleanPassword}` ||
                rawPass.includes(cleanPassword)
            );
        });

        if (!matchingSub) {
            console.warn(`[StudentLogin] Failed pass login attempt for ${cleanEmail} with code ${cleanPassword}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid login credentials. Please check your email or pass code.'
            });
        }

        // 3. User authenticated via active VIP pass code!
        const studentId = student?.id || matchingSub.student_id || crypto.randomUUID();
        const studentName = student?.full_name || matchingSub.student_name || cleanEmail.split('@')[0];

        // Ensure student record exists
        if (!student) {
            await supabase.from('students').upsert({
                id: studentId,
                email: cleanEmail,
                full_name: studentName,
                course: matchingSub.bundle_includes?.join(', ') || 'IAT'
            }, { onConflict: 'email' });
        }

        const token = generateAuthToken({
            id: studentId,
            email: cleanEmail,
            role: 'student',
            name: studentName
        });

        console.log(`[StudentLogin] ✅ Verified VIP pass login for ${cleanEmail} (${studentName}) with code ${cleanPassword}`);

        // Set shared cross-subdomain cookies for test.vigyanprep.com
        try {
            res.cookie('student_token', token, {
                domain: '.vigyanprep.com',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
                sameSite: 'lax',
                secure: true
            });
            res.cookie('student_name', encodeURIComponent(studentName), {
                domain: '.vigyanprep.com',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
                sameSite: 'lax',
                secure: true
            });
            res.cookie('student_email', encodeURIComponent(cleanEmail), {
                domain: '.vigyanprep.com',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
                sameSite: 'lax',
                secure: true
            });
        } catch (cookieErr) {
            console.warn('[StudentLogin] Cookie set warning:', cookieErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Login successful via VIP Pass',
            token,
            user: {
                id: studentId,
                email: cleanEmail,
                full_name: studentName
            }
        });

    } catch (err) {
        console.error('[StudentLogin] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error during student login'
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
 * ❌ SECURITY FIX (Issue #45): /generate-hash endpoint REMOVED
 * 
 * This was a CRITICAL security vulnerability - it allowed ANYONE to generate
 * bcrypt password hashes without authentication, aiding password cracking attacks.
 * 
 * To generate a password hash for admin credentials, use CLI tools:
 * - Method 1: npx bcryptjs hash "your-password"
 * - Method 2: Node REPL:
 *     > const bcrypt = require('bcryptjs');
 *     > bcrypt.hashSync('your-password', 10);
 * 
 * Then add the hash to .env as: ADMIN_PASSWORD_HASH=<generated_hash>
 */

export default router;