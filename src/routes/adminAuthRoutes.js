/**
 * Admin Authentication Routes
 * Created: 2026-01-26
 * Purpose: Handle admin login and session management
 * Routes: /api/admin/auth/*
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { generateAdminToken } from '../middlewares/adminAuth.js';
import { Admin } from '../models/Admin.js';

// Basic HTML escaping utility
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const router = express.Router();

// PHP Email Gateway Configuration
const gatewayUrl = process.env.EMAIL_GATEWAY_URL || 'https://vigyanprep.com/api/send-auth-email.php';
const gatewaySecret = process.env.EMAIL_GATEWAY_SECRET || 'b4f84ea5e4b6c310243e8d2dbcd17fcd567845ba012b1cc1694f54e17de9c924';

/**
 * 📧 Send email via secure PHP gateway on Hostinger
 * Bypasses explicit block on standard SMTP ports (465/587) by third-party hosting.
 */
async function sendGatewayEmail(payload) {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = JSON.stringify({ ...payload, timestamp });

        // Compute HMAC signature for gateway validation
        const signature = crypto
            .createHmac('sha256', gatewaySecret)
            .update(body)
            .digest('hex');

        console.log(`📡 Sending password reset email via gateway proxy to ${payload.to}...`);

        // Timeout handling for fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(gatewayUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'X-Vigyan-Timestamp': timestamp.toString(),
                'X-Vigyan-Signature': signature,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            },
            body
        });

        clearTimeout(timeoutId);

        const textResponse = await response.text();
        let result = {};
        try {
            result = JSON.parse(textResponse);
        } catch (e) {
            console.error("Failed to parse gateway JSON. Raw text:", textResponse);
            throw new Error("Gateway returned invalid JSON format.");
        }

        if (!response.ok || !result.success) {
            throw new Error(result.error || `Gateway returned ${response.status}`);
        }
        return { success: true, result };
    } catch (error) {
        console.error('❌ Forgot Password Gateway Failure:', error.message);
        return { success: false, error: error.message };
    }
}

console.log('🔐 Admin Auth routes loaded');

/**
 * POST /api/admin/auth/login
 * Admin login endpoint with DB Integration
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Admin login attempt:', { username, timestamp: new Date().toISOString() });

        // Validation
        if (!username || !password) {
            console.warn('❌ Login failed: Missing credentials');
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Fetch admin from database
        let dbAdmin = await Admin.findOne({ username });

        // DB Seeding Fallback Process for 1st Start:
        // If no admin exists in DB at all, pull from process.env and create it!
        if (!dbAdmin && username === process.env.ADMIN_USERNAME?.trim()) {
            console.log('🌱 First-time MongoDB auth integration! Migrating credentials from ENV to DB.');
            const legacyHash = process.env.ADMIN_PASSWORD_HASH?.trim();
            if (legacyHash) {
                dbAdmin = new Admin({
                    username,
                    passwordHash: legacyHash
                });
                await dbAdmin.save();
                console.log('✅ Admin credentials migrated to DB successfully.');
            }
        }

        if (!dbAdmin) {
            console.warn('❌ Login failed: Admin not found in DB:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, dbAdmin.passwordHash);

        if (!isPasswordValid) {
            console.warn('❌ Login failed: Invalid password for user:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Successful login
        dbAdmin.lastLoginAt = new Date();
        await dbAdmin.save();

        console.log('✅ Admin login successful:', username);

        // ✅ SECURITY FIX: Generate JWT token
        const adminToken = generateAdminToken(username);

        // Set HTTP-only cookie (cross-origin enabled)
        // ✅ SECURITY FIX: Moved to custom subdomain API to enable SameSite=Lax
        // This fully secures the authentication session from cross-domain attacks.
        res.cookie('admin_token', adminToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: adminToken, // Send token for Authorization header option
            data: {
                username: username,
                role: 'admin',
                loginTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

/**
 * POST /api/admin/auth/forgot-password
 * Email a newly generated random password to support@vigyanprep.com
 */
const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per hour
    message: { success: false, message: 'Too many password reset attempts from this IP, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
    try {
        const { username } = req.body;

        // Safety checks
        if (!username) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }

        // We require the gateway to securely proxy email delivery since direct SMTP is blocked
        if (!gatewayUrl || !gatewaySecret) {
            console.error('❌ Missing EMAIL_GATEWAY_URL or SECRET. Cannot process password reset via PHP proxy.');
            return res.status(500).json({ success: false, message: 'Email gateway proxy not configured on server' });
        }

        // Find admin in DB (or fallback to process.env creation)
        let dbAdmin = await Admin.findOne({ username });
        if (!dbAdmin && username === process.env.ADMIN_USERNAME?.trim()) {
            dbAdmin = new Admin({ username, passwordHash: process.env.ADMIN_PASSWORD_HASH?.trim() || 'DUMMY' });
        }

        if (!dbAdmin) {
            // Prevent user enumeration by showing generic success
            return res.status(200).json({ success: true, message: 'If the username exists, a new password will be sent to the support email.' });
        }

        // Generate 8-character random memorable password
        const newPassword = crypto.randomBytes(4).toString('hex'); // 8 characters

        // Hash and Save to DB
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        dbAdmin.passwordHash = newHash;
        await dbAdmin.save();

        console.log(`✅ Admin password reset in DB for ${username}. Sending email...`);

        // Sanitize username to prevent XSS in the email rendering
        const safeUsername = escapeHtml(username);

        // Send Email directly via NodeMailer
        const supportEmail = 'support@vigyanprep.com';
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Admin Password Reset</h2>
                <p>A password reset was requested for the Vigyan.prep Admin Portal.</p>
                <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Username:</strong> ${safeUsername}</p>
                    <p><strong>New Password:</strong> <code style="font-size: 18px; color: #d32f2f;">${newPassword}</code></p>
                </div>
                <p><em>Please log in immediately at <a href="https://vigyanprep.com/admin-login.html">vigyanprep.com/admin-login.html</a> and store this securely.</em></p>
            </div>
        `;

        const payload = {
            to: supportEmail,
            subject: '🔒 Vigyan.prep Admin - Password Reset',
            html: emailHtml
        };

        const delivery = await sendGatewayEmail(payload);

        if (!delivery.success) {
            // We rolled the password in DB but email failed!
            return res.status(500).json({
                success: false,
                message: 'Password was reset, but email failed to send. Check server logs.',
                internal_gateway_error: delivery.error || 'Unknown gateway proxy error'
            });
        }

        return res.status(200).json({
            success: true,
            message: `A new password has been generated and sent to ${supportEmail}`
        });

    } catch (error) {
        console.error('❌ Forgot Password Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during password reset' });
    }
});

/**
 * POST /api/admin/auth/validate-session
 * Validate if admin session is still active
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

        console.log('🔍 Session validation for:', username);

        // In a real app, check session in database/Redis
        // For now, just validate username exists
        if (username === ADMIN_CREDENTIALS.username) {
            return res.status(200).json({
                success: true,
                message: 'Session valid',
                data: {
                    username: username,
                    sessionActive: true
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid session'
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
 * Handle admin logout
 */
router.post('/logout', (req, res) => {
    try {
        const { username } = req.body;

        console.log('🚪 Admin logout:', username || 'unknown');

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

// ✅ SECURITY FIX: /generate-hash endpoint removed
// This was a critical security vulnerability - public password hash generator
// To generate a new password hash, use bcrypt locally:
// node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(h => console.log(h));"

// ✅ SECURITY FIX: /test endpoint removed
// This was a CRITICAL security vulnerability - exposed admin credentials publicly

export default router;