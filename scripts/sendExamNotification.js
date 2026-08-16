import nodemailer from 'nodemailer';
import { supabase } from '../src/db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function sendExamNotifications(smtpConfig) {
  console.log('Fetching active enrolled students for IAT 01...');
  
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('student_email, student_name, bundle_includes, starts_at, expires_at')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return;
  }

  // Deduplicate emails
  const studentMap = new Map();
  for (const s of subscriptions || []) {
    if (s.student_email && s.student_email.includes('@')) {
      const email = s.student_email.toLowerCase().trim();
      if (!studentMap.has(email)) {
        studentMap.set(email, s);
      }
    }
  }

  const enrolledStudents = Array.from(studentMap.values());
  console.log(`Found ${enrolledStudents.length} enrolled student(s):`, enrolledStudents.map(s => s.student_email));

  if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
    console.log('\n--- EMAIL BROADCAST PREVIEW TEMPLATE ---');
    enrolledStudents.forEach(s => {
      console.log(`\nTo: ${s.student_name || 'Student'} <${s.student_email}>`);
      console.log(`Subject: 🎯 LIVE EXAM TODAY: IISER IAT 01 Mock Test (09:00 AM – 09:00 PM IST)`);
      console.log(`Body:`);
      console.log(`Dear ${s.student_name || 'Student'},

Your official Paid Test Series exam "IAT 01" goes live TODAY on VigyanPrep CBT Portal!

📅 Exam Date: Sunday, 16 August 2026
⏰ Live Window: 09:00 AM to 09:00 PM IST (12-Hour Proctored Window)
⏱️ Exam Duration: 180 Minutes (3 Hours)
📝 Total Questions: 60 (20 Physics, 20 Chemistry, 20 Mathematics)
🎯 Marking Scheme: +4 Correct, -1 Incorrect

🚀 How to Take the Exam:
1. Go to: https://test.vigyanprep.com
2. Log in with your registered email: ${s.student_email}
3. Click "Start CBT Exam" on the "IAT 01" card.
4. Read instructions, accept candidate declaration, and begin.

⚠️ Important Guidelines:
- You have EXACTLY 1 Live Attempt.
- Works smoothly on Laptops, Desktops, iPads, and Tablets.
- Results & All-India Rank (AIR) will be declared after the 09:00 PM window closes.

Best of luck!
Team VigyanPrep
https://vigyanprep.com`);
    });
    return enrolledStudents;
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host || 'smtp.gmail.com',
    port: smtpConfig.port || 465,
    secure: smtpConfig.secure !== false,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  for (const s of enrolledStudents) {
    const mailOptions = {
      from: `"VigyanPrep Live Exam Desk" <${smtpConfig.user}>`,
      to: s.student_email,
      subject: `🎯 LIVE EXAM TODAY: IISER IAT 01 Mock Test (09:00 AM – 09:00 PM IST)`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
            <h1 style="color: #000; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">VIGYANPREP CBT PORTAL</h1>
            <p style="color: #000; margin: 4px 0 0 0; font-size: 13px; font-weight: 700; opacity: 0.9;">Official All-India Mock Test Series</p>
          </div>
          
          <div style="padding: 28px;">
            <p style="font-size: 16px; margin-top: 0;">Dear <strong>${s.student_name || 'Student'}</strong>,</p>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
              Your enrolled Paid Test Series examination <strong>IAT 01 (IISER Aptitude Test)</strong> goes live <strong>TODAY</strong> on the official VigyanPrep CBT testing portal.
            </p>

            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
              <table style="width: 100%; font-size: 13px; color: #e2e8f0; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">📅 Exam Date:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #f59e0b;">Sunday, 16 August 2026</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">⏰ Proctored Window:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #10b981;">09:00 AM – 09:00 PM IST</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">⏱️ Duration:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right;">180 Minutes (3 Hours)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">📝 Questions:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right;">60 Questions (P:20, C:20, M:20)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">🎯 Marking Scheme:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right;">+4 (Correct) | -1 (Negative)</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="https://test.vigyanprep.com" style="display: inline-block; background: #f59e0b; color: #000; font-weight: 900; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                🚀 ENTER CBT TEST PORTAL →
              </a>
            </div>

            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #fde68a;">
              <strong>⚠️ Important Exam Instructions:</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5;">
                <li>You have <strong>1 Single Live Attempt</strong> during the 12-hour window.</li>
                <li>Make sure to click <strong>Save & Next</strong> on each question to record your answer.</li>
                <li>Scorecards, Answer Keys & All-India Ranks (AIR) will be released after 09:00 PM.</li>
              </ul>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center;">
              Need assistance? Reach out to support@vigyanprep.com
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email successfully sent to: ${s.student_email}`);
    } catch (sendErr) {
      console.error(`❌ Failed to send email to ${s.student_email}:`, sendErr.message);
    }
  }
}

// Run preview
sendExamNotifications();
