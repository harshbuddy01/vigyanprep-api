import sgMail from '@sendgrid/mail';
import { config } from 'dotenv';

config();

/**
 * Email Configuration for Vigyan.prep Platform using SendGrid
 * PREMIUM MODERN EMAIL TEMPLATES
 * Sends roll numbers and notifications with stunning visual design
 */

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL || process.env.ADMIN_EMAIL || 'noreply@iin.edu';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized successfully');
} else {
  console.warn('⚠️  SENDGRID_API_KEY not found in environment variables');
  console.warn('⚠️  Emails will not be sent until API key is configured');
}

/**
 * Send Roll Number to User - PREMIUM DESIGN
 * @param {String} userEmail - User's email address
 * @param {String} rollNumber - Generated roll number
 * @param {String} userName - User's name (optional)
 * @param {String} testName - Test/Exam name (optional)
 */
export const sendRollNumberEmail = async (userEmail, rollNumber, userName = 'Student', testName = 'Vigyan.prep Platform') => {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid not configured, skipping email');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const msg = {
      to: userEmail,
      from: {
        email: SENDER_EMAIL,
        name: 'Vigyan.prep Platform'
      },
      subject: `🎉 Payment Successful - Your Roll Number Inside!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
              background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
              padding: 40px 20px;
              color: #f8fafc;
            }
            .email-container { 
              max-width: 650px; 
              margin: 0 auto; 
              background: #0f172a;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
              overflow: hidden;
            }
            
            /* HERO HEADER */
            .hero-header {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
              padding: 50px 40px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .hero-header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: pulse 4s ease-in-out infinite;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 16px;
              display: inline-block;
              animation: bounce 0.8s ease;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
            .hero-title {
              font-size: 36px;
              font-weight: 800;
              color: white;
              margin: 0 0 12px 0;
              text-shadow: 0 4px 12px rgba(0,0,0,0.3);
              letter-spacing: -0.5px;
              position: relative;
            }
            .hero-subtitle {
              font-size: 18px;
              color: rgba(255,255,255,0.95);
              margin: 0;
              font-weight: 500;
              position: relative;
            }
            
            /* CONTENT SECTION */
            .content-section {
              padding: 50px 40px;
            }
            .greeting {
              font-size: 24px;
              font-weight: 700;
              color: #f8fafc;
              margin-bottom: 16px;
            }
            .intro-text {
              color: #cbd5e1;
              font-size: 16px;
              line-height: 1.8;
              margin-bottom: 40px;
            }
            
            /* PREMIUM ROLL NUMBER CARD */
            .roll-number-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 20px;
              padding: 50px 30px;
              text-align: center;
              margin: 40px 0;
              box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3), 
                          0 0 0 1px rgba(255,255,255,0.1) inset;
              position: relative;
              overflow: hidden;
            }
            .roll-number-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
              animation: shimmer 3s infinite;
            }
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .roll-label {
              color: rgba(255,255,255,0.9);
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 3px;
              font-weight: 700;
              margin-bottom: 20px;
              position: relative;
            }
            .roll-number {
              font-size: 56px;
              font-weight: 900;
              color: white;
              letter-spacing: 8px;
              margin: 20px 0;
              text-shadow: 0 4px 20px rgba(0,0,0,0.3);
              font-family: 'Courier New', monospace;
              position: relative;
              background: linear-gradient(to right, #ffffff, #e0e7ff);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .roll-warning {
              display: inline-block;
              background: rgba(255,255,255,0.15);
              backdrop-filter: blur(10px);
              color: white;
              padding: 12px 24px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 600;
              margin-top: 20px;
              border: 1px solid rgba(255,255,255,0.2);
              position: relative;
            }
            
            /* INFO BOXES */
            .info-box {
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              border-left: 4px solid #3b82f6;
              padding: 30px;
              margin: 30px 0;
              border-radius: 16px;
              backdrop-filter: blur(10px);
            }
            .info-box h3 {
              color: #f8fafc;
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
            }
            .info-box ul {
              margin: 0;
              padding-left: 20px;
            }
            .info-box li {
              color: #cbd5e1;
              line-height: 2;
              margin-bottom: 12px;
              font-size: 15px;
            }
            .info-box strong {
              color: #f8fafc;
              font-weight: 600;
            }
            
            /* PREMIUM BUTTON */
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white !important;
              padding: 18px 40px;
              border-radius: 14px;
              text-decoration: none;
              margin: 30px 0;
              font-weight: 700;
              font-size: 17px;
              box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
              transition: all 0.3s ease;
              text-align: center;
              border: none;
              letter-spacing: 0.5px;
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 40px rgba(16, 185, 129, 0.6);
            }
            
            /* FOOTER */
            .footer {
              background: rgba(0,0,0,0.3);
              padding: 40px 40px;
              text-align: center;
              border-top: 1px solid rgba(255,255,255,0.1);
            }
            .footer-brand {
              font-size: 20px;
              font-weight: 800;
              color: #f8fafc;
              margin-bottom: 12px;
            }
            .footer-brand span {
              color: #3b82f6;
            }
            .footer-text {
              color: #94a3b8;
              font-size: 13px;
              line-height: 1.8;
              margin: 8px 0;
            }
            .footer-link {
              color: #3b82f6;
              text-decoration: none;
              font-weight: 600;
            }
            .footer-link:hover {
              color: #60a5fa;
            }
            
            /* MOBILE RESPONSIVE */
            @media only screen and (max-width: 600px) {
              body { padding: 20px 10px; }
              .hero-header { padding: 40px 20px; }
              .hero-title { font-size: 28px; }
              .content-section { padding: 30px 20px; }
              .roll-number { font-size: 42px; letter-spacing: 4px; }
              .info-box { padding: 20px; }
              .footer { padding: 30px 20px; }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            
            <!-- HERO HEADER -->
            <div class="hero-header">
              <div class="success-icon">✅</div>
              <h1 class="hero-title">Payment Successful!</h1>
              <p class="hero-subtitle">Welcome to ${testName}</p>
            </div>
            
            <!-- MAIN CONTENT -->
            <div class="content-section">
              <div class="greeting">Hello! 👋</div>
              <p class="intro-text">
                Congratulations! Your payment has been processed successfully, and you're all set to begin your examination journey with Vigyan.prep.
              </p>
              
              <!-- PREMIUM ROLL NUMBER CARD -->
              <div class="roll-number-card">
                <p class="roll-label">Your Roll Number</p>
                <div class="roll-number">${rollNumber}</div>
                <div class="roll-warning">
                  ⚠️ Save this securely - Required for all exams
                </div>
              </div>
              
              <!-- INFO BOX -->
              <div class="info-box">
                <h3>📄 Important Guidelines</h3>
                <ul>
                  <li><strong>Secure Storage:</strong> Keep this roll number safe - you'll need it for every examination</li>
                  <li><strong>Platform Access:</strong> Use this to access your personalized dashboard</li>
                  <li><strong>Registration Proof:</strong> This email confirms your successful enrollment</li>
                  <li><strong>Privacy:</strong> Never share your roll number with unauthorized individuals</li>
                  <li><strong>Reference:</strong> Bookmark this email for quick access anytime</li>
                </ul>
              </div>
              
              <!-- CTA BUTTON -->
              <div style="text-align: center;">
                <a href="${process.env.PLATFORM_URL || 'https://iin-theta.vercel.app'}/testfirstpage.html" class="cta-button">
                  🚀 Access Your Tests
                </a>
              </div>
              
              <p style="color: #94a3b8; margin-top: 40px; text-align: center; font-size: 14px;">
                Need assistance? Contact us at 
                <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@iin.edu'}" class="footer-link">
                  ${process.env.SUPPORT_EMAIL || 'support@iin.edu'}
                </a>
              </p>
            </div>
            
            <!-- FOOTER -->
            <div class="footer">
              <div class="footer-brand">Vigyan.prep<span>.edu</span></div>
              <p class="footer-text">Strategic Vanguard in Excellence</p>
              <p class="footer-text" style="margin-top: 16px;">
                This is an automated notification. Please do not reply to this email.
              </p>
              <p class="footer-text">
                © ${new Date().getFullYear()} Vigyan.prep Platform. All rights reserved.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
      text: `
🎉 PAYMENT SUCCESSFUL!

Hello!

Your payment has been processed successfully.

YOUR ROLL NUMBER: ${rollNumber}

⚠️ IMPORTANT: Save this roll number securely - you will need it for all examinations.

Access your tests: ${process.env.PLATFORM_URL || 'https://iin-theta.vercel.app'}/testfirstpage.html

Need help? Contact: ${process.env.SUPPORT_EMAIL || 'support@iin.edu'}

---
Vigyan.prep Platform - Strategic Vanguard in Excellence
© ${new Date().getFullYear()} Vigyan.prep. All rights reserved.
      `,
    };

    await sgMail.send(msg);
    console.log('✅ Premium roll number email sent to:', userEmail, '| Roll Number:', rollNumber);
    return { success: true, rollNumber };

  } catch (error) {
    console.error('❌ Roll number email failed:', error.message);
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
};

/**
 * Send Feedback Notification Email to Admin
 * @param {Object} feedbackData - Feedback details
 */
export const sendFeedbackEmail = async (feedbackData) => {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid not configured, skipping email');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const { email, rollNumber, testId, ratings, comment, feedbackId } = feedbackData;

    const msg = {
      to: process.env.ADMIN_EMAIL || SENDER_EMAIL,
      from: {
        email: SENDER_EMAIL,
        name: 'Vigyan.prep Feedback System'
      },
      subject: `🆕 New Feedback - ${testId.toUpperCase()} | Roll: ${rollNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; }
            .content { padding: 30px 25px; }
            .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 14px; background: #f8fafc; border-radius: 8px; }
            .info-label { font-weight: 700; color: #334155; font-size: 14px; }
            .info-value { color: #64748b; font-size: 14px; }
            .section-title { color: #1e293b; margin: 30px 0 16px 0; font-size: 18px; font-weight: 600; }
            .ratings { margin: 20px 0; }
            .rating-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
            .rating-item:last-child { border-bottom: none; }
            .rating-category { color: #334155; font-weight: 500; font-size: 14px; }
            .stars { color: #fbbf24; font-size: 18px; letter-spacing: 2px; }
            .comment-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .comment-text { margin: 0; color: #334155; line-height: 1.7; font-size: 15px; }
            .footer { text-align: center; padding: 24px 20px; background: #f8fafc; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
            .btn { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 New Feedback Received</h1>
              <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Vigyan.prep Admin Panel</p>
            </div>
            
            <div class="content">
              <h2 class="section-title">👤 User Information</h2>
              
              <div class="info-row">
                <span class="info-label">Email Address</span>
                <span class="info-value">${email}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Roll Number</span>
                <span class="info-value"><strong>${rollNumber}</strong></span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Test Series</span>
                <span class="info-value">${testId.toUpperCase()}</span>
              </div>
              
              <h2 class="section-title">⭐ Performance Ratings</h2>
              <div class="ratings">
                <div class="rating-item">
                  <span class="rating-category">Login Experience</span>
                  <span class="stars">${'★'.repeat(ratings.login)}${'☆'.repeat(5 - ratings.login)}</span>
                </div>
                <div class="rating-item">
                  <span class="rating-category">Interface Design</span>
                  <span class="stars">${'★'.repeat(ratings.interface)}${'☆'.repeat(5 - ratings.interface)}</span>
                </div>
                <div class="rating-item">
                  <span class="rating-category">Question Quality</span>
                  <span class="stars">${'★'.repeat(ratings.quality)}${'☆'.repeat(5 - ratings.quality)}</span>
                </div>
                <div class="rating-item">
                  <span class="rating-category">Server Performance</span>
                  <span class="stars">${'★'.repeat(ratings.server)}${'☆'.repeat(5 - ratings.server)}</span>
                </div>
              </div>
              
              <h2 class="section-title">💬 User Comments</h2>
              <div class="comment-box">
                <p class="comment-text">${comment || 'No comments provided.'}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.ADMIN_PANEL_URL || 'https://iin-theta.vercel.app'}/admin.html" class="btn">
                  📊 View in Admin Panel
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Vigyan.prep Platform</strong> - Feedback Management System</p>
              <p style="margin: 8px 0 0;">Automated notification • Do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log('✅ Feedback email sent to admin');
    return { success: true };

  } catch (error) {
    console.error('❌ Feedback email failed:', error.message);
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
};

/**
 * Send Confirmation Email to User
 * @param {String} userEmail - User's email address
 */
export const sendUserConfirmation = async (userEmail) => {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid not configured, skipping email');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const msg = {
      to: userEmail,
      from: {
        email: SENDER_EMAIL,
        name: 'Vigyan.prep Platform'
      },
      subject: '✅ Thank You for Your Feedback - Vigyan.prep',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 35px 20px; text-align: center; }
            .content { padding: 35px 25px; text-align: center; color: #334155; }
            .icon { font-size: 56px; margin-bottom: 20px; }
            .footer { padding: 24px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Thank You!</h1>
            </div>
            <div class="content">
              <div class="icon">✅</div>
              <h2 style="color: #1e293b; margin-bottom: 16px;">Feedback Received Successfully</h2>
              <p style="line-height: 1.7; font-size: 15px;">
                Thank you for taking the time to share your valuable feedback with us. 
                Your insights help us continuously improve the Vigyan.prep platform experience.
              </p>
              <p style="line-height: 1.7; margin-top: 24px; font-size: 15px;">
                Our team will carefully review your feedback and implement improvements 
                based on your suggestions.
              </p>
            </div>
            <div class="footer">
              <p><strong>Vigyan.prep</strong> - Strategic Vanguard</p>
              <p style="margin: 8px 0 0;">Building excellence in education</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log('✅ Confirmation email sent to user:', userEmail);
    return { success: true };

  } catch (error) {
    console.error('❌ User confirmation email failed:', error.message);
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
};

export default sgMail;