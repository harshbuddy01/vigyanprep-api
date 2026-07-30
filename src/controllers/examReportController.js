import nodemailer from "nodemailer";
import { getScoreReportEmailHtml } from "../utils/emailTemplates.js";

// Create Nodemailer transporter with Hostinger SMTP
// 🚀 SMTP Optimization: Disable local Nodemailer if secure Email Gateway is active
const isGatewayActive = !!process.env.EMAIL_GATEWAY_URL;
let transporter = null;

if (!isGatewayActive) {
    const emailPort = parseInt(process.env.EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
        port: emailPort,
        secure: emailPort === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });

    // Verify transporter on load
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email transporter (examReport) verification failed:', error.message);
            } else {
                console.log('✅ Email server ready for score reports');
            }
        });
    }
} else {
    if (String(process.env.DEBUG || '').toLowerCase() === 'true') {
        console.log('🛡️ Email Gateway detected: Skipping local SMTP transporter verification');
    }
}

/**
 * Send NISER Exam Score Report via Email
 * POST /api/exam/send-report
 */
export const sendScoreReport = async (req, res) => {
    console.log('📧 ========== SCORE REPORT EMAIL REQUEST ==========');

    try {
        const { name, email, examYear, sectionScores, meritScore, totalScore, totalCorrect, totalWrong, totalQuestions } = req.body;

        // Validate required fields
        if (!name || !email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid name and email required' });
        }

        if (!sectionScores || typeof sectionScores !== 'object') {
            return res.status(400).json({ success: false, message: 'Section scores required' });
        }

        console.log(`📧 Sending score report to: ${email}`);
        console.log(`   Name: ${name}`);
        console.log(`   Exam Year: ${examYear}`);
        console.log(`   Merit Score: ${meritScore}`);

        // Branded HTML Email Template
        const emailHtml = getScoreReportEmailHtml({
            name, email, examYear, sectionScores, meritScore, totalScore, totalCorrect, totalWrong, totalQuestions
        });

        // Send email
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            const mailOptions = {
                from: `"Vigyan.prep Exams" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `🎯 Your NISER ${examYear} Score Report - Merit: ${meritScore}/180`,
                html: emailHtml,
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ Score report sent successfully to ${email}`);

            res.status(200).json({
                success: true,
                message: 'Score report sent successfully',
                email: email
            });
        } else {
            console.warn('⚠️ Email credentials not configured');
            res.status(200).json({
                success: true,
                message: 'Score calculated (email disabled)',
                warning: 'Email service not configured'
            });
        }

    } catch (error) {
        console.error('❌ Error sending score report:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send score report',
            error: error.message
        });
    }
};
