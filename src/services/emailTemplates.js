// 🎨 Vigyan.prep Email Templates — Premium branded HTML emails

const BRAND_COLOR = '#d4a520';
const DARK_BG = '#0f0d08';
const CARD_BG = '#1a1610';
const TEXT_COLOR = '#e8dcc8';
const MUTED_COLOR = '#9a8c75';

function baseLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${DARK_BG};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${DARK_BG};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:${CARD_BG};border-radius:16px;border:1px solid rgba(212,165,32,0.2);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},#b8860b);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f0d08;letter-spacing:1px;">VIGYAN<span style="font-weight:400;font-style:italic;">.prep</span></h1>
              <p style="margin:4px 0 0;font-size:11px;color:#1a1610;text-transform:uppercase;letter-spacing:3px;">Gateway to Research Entrances</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(212,165,32,0.15);text-align:center;">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};">© ${new Date().getFullYear()} VIGYAN.prep — IISER IAT · NISER NEST · CMI · ISI</p>
              <p style="margin:6px 0 0;font-size:11px;color:${MUTED_COLOR};">
                <a href="https://vigyanprep.com" style="color:${BRAND_COLOR};text-decoration:none;">vigyanprep.com</a> · 
                <a href="mailto:support@vigyanprep.com" style="color:${BRAND_COLOR};text-decoration:none;">support@vigyanprep.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════
// 1. HALL TICKET / EXAM PASS EMAIL
// ═══════════════════════════════════════════════
export function hallTicketEmail({ studentName, examId, testTitle, examType, examDate, examTime, duration, examLink }) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_COLOR};">🎫 Your Exam Pass Has Been Issued</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${TEXT_COLOR};">Hello <strong>${studentName}</strong>, your exam hall ticket is ready.</p>
    
    <!-- Exam Pass Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e1a12,#2a2418);border:2px solid ${BRAND_COLOR};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:3px;">Exam Pass ID</p>
          <h2 style="margin:0 0 16px;font-size:22px;color:${BRAND_COLOR};font-family:'Courier New',monospace;letter-spacing:2px;">${examId}</h2>
          
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="text-align:left;color:${MUTED_COLOR};font-size:12px;text-transform:uppercase;">Exam</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;font-weight:600;">${testTitle}</td>
            </tr>
            <tr>
              <td style="text-align:left;color:${MUTED_COLOR};font-size:12px;text-transform:uppercase;">Category</td>
              <td style="text-align:right;color:${BRAND_COLOR};font-size:14px;font-weight:700;">${examType}</td>
            </tr>
            <tr>
              <td style="text-align:left;color:${MUTED_COLOR};font-size:12px;text-transform:uppercase;">Date</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;">${examDate}</td>
            </tr>
            <tr>
              <td style="text-align:left;color:${MUTED_COLOR};font-size:12px;text-transform:uppercase;">Time</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;">${examTime}</td>
            </tr>
            <tr>
              <td style="text-align:left;color:${MUTED_COLOR};font-size:12px;text-transform:uppercase;">Duration</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;">${duration} minutes</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center">
          <a href="${examLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,${BRAND_COLOR},#b8860b);color:#0f0d08;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
            🖥️ Enter Exam Portal
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:${MUTED_COLOR};text-align:center;">
      ⚠️ Keep this exam pass ID safe. You will need it to enter the examination.
    </p>`;
  
  return baseLayout(`Exam Pass — ${testTitle}`, content);
}

// ═══════════════════════════════════════════════
// 2. PRE-TEST REMINDER EMAIL (2 Hours Before)
// ═══════════════════════════════════════════════
export function reminderEmail({ studentName, testTitle, examType, examDate, examTime, examId, examLink }) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_COLOR};">⏰ Your Test Starts in 2 Hours!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${TEXT_COLOR};">Hello <strong>${studentName}</strong>, get ready for your upcoming examination.</p>
    
    <!-- Alert Box -->
    <table width="100%" cellpadding="16" cellspacing="0" style="background:rgba(212,165,32,0.08);border:1px solid rgba(212,165,32,0.25);border-radius:10px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:16px;color:${TEXT_COLOR};font-weight:600;">📋 ${testTitle}</p>
          <p style="margin:0;font-size:14px;color:${MUTED_COLOR};">
            <strong style="color:${BRAND_COLOR};">${examType}</strong> · ${examDate} · ${examTime} · Exam Pass: <code style="color:${BRAND_COLOR};font-size:13px;">${examId}</code>
          </p>
        </td>
      </tr>
    </table>

    <!-- Checklist -->
    <h3 style="margin:0 0 12px;font-size:15px;color:${TEXT_COLOR};">Pre-Exam Checklist:</h3>
    <table cellpadding="4" cellspacing="0">
      <tr><td style="color:${BRAND_COLOR};font-size:16px;">✅</td><td style="color:${TEXT_COLOR};font-size:14px;">Stable internet connection</td></tr>
      <tr><td style="color:${BRAND_COLOR};font-size:16px;">✅</td><td style="color:${TEXT_COLOR};font-size:14px;">Laptop/Desktop with screen ≥ 1024px width</td></tr>
      <tr><td style="color:${BRAND_COLOR};font-size:16px;">✅</td><td style="color:${TEXT_COLOR};font-size:14px;">Chrome or Firefox browser (latest version)</td></tr>
      <tr><td style="color:${BRAND_COLOR};font-size:16px;">✅</td><td style="color:${TEXT_COLOR};font-size:14px;">Close all other tabs and applications</td></tr>
      <tr><td style="color:${BRAND_COLOR};font-size:16px;">✅</td><td style="color:${TEXT_COLOR};font-size:14px;">Keep your Exam Pass ID ready</td></tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center">
          <a href="${examLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,${BRAND_COLOR},#b8860b);color:#0f0d08;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
            🚀 Enter Exam Portal Now
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:${MUTED_COLOR};text-align:center;">
      The exam window opens at ${examTime}. Please log in 10 minutes early to complete the system check.
    </p>`;
  
  return baseLayout(`Reminder: ${testTitle} starts soon!`, content);
}

// ═══════════════════════════════════════════════
// 3. PAYMENT CONFIRMATION EMAIL
// ═══════════════════════════════════════════════
export function paymentConfirmationEmail({ studentName, planName, examType, durationDays, amount, startsAt, expiresAt, paymentId }) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_COLOR};">🎉 Payment Successful!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${TEXT_COLOR};">Hello <strong>${studentName}</strong>, your subscription has been activated.</p>
    
    <!-- Receipt Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#141210;border:1px solid rgba(212,165,32,0.2);border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px dashed rgba(212,165,32,0.2);">
          <p style="margin:0 0 4px;font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:2px;">Subscription Plan</p>
          <p style="margin:0;font-size:18px;color:${TEXT_COLOR};font-weight:700;">${planName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;">
          <table width="100%" cellpadding="6" cellspacing="0">
            <tr>
              <td style="color:${MUTED_COLOR};font-size:13px;">Exam Category</td>
              <td style="text-align:right;color:${BRAND_COLOR};font-size:14px;font-weight:700;">${examType}</td>
            </tr>
            <tr>
              <td style="color:${MUTED_COLOR};font-size:13px;">Duration</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;">${durationDays} Days</td>
            </tr>
            <tr>
              <td style="color:${MUTED_COLOR};font-size:13px;">Amount Paid</td>
              <td style="text-align:right;color:#22c55e;font-size:16px;font-weight:700;">₹${amount}</td>
            </tr>
            <tr>
              <td style="color:${MUTED_COLOR};font-size:13px;">Active From</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;">${startsAt}</td>
            </tr>
            <tr>
              <td style="color:${MUTED_COLOR};font-size:13px;">Valid Until</td>
              <td style="text-align:right;color:${TEXT_COLOR};font-size:14px;">${expiresAt}</td>
            </tr>
            <tr>
              <td style="color:${MUTED_COLOR};font-size:13px;">Payment ID</td>
              <td style="text-align:right;color:${MUTED_COLOR};font-size:12px;font-family:monospace;">${paymentId}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Next Steps -->
    <h3 style="margin:24px 0 12px;font-size:15px;color:${TEXT_COLOR};">What's Next?</h3>
    <table cellpadding="4" cellspacing="0">
      <tr><td style="color:${BRAND_COLOR};">1.</td><td style="color:${TEXT_COLOR};font-size:14px;">Visit your <a href="https://test.vigyanprep.com/dashboard" style="color:${BRAND_COLOR};">Student Dashboard</a> to see upcoming tests</td></tr>
      <tr><td style="color:${BRAND_COLOR};">2.</td><td style="color:${TEXT_COLOR};font-size:14px;">You'll receive hall tickets via email before each test</td></tr>
      <tr><td style="color:${BRAND_COLOR};">3.</td><td style="color:${TEXT_COLOR};font-size:14px;">Get 2-hour reminders before every scheduled test</td></tr>
    </table>`;
  
  return baseLayout(`Payment Confirmed — ${planName}`, content);
}

// ═══════════════════════════════════════════════
// 4. RESULT PUBLICATION EMAIL
// ═══════════════════════════════════════════════
export function resultPublicationEmail({ studentName, testTitle, examType, score, totalMarks, rank, percentile, responseSheetLink }) {
  const scorePercent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const scoreColor = scorePercent >= 70 ? '#22c55e' : scorePercent >= 40 ? '#eab308' : '#ef4444';
  
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_COLOR};">📊 Your Results Are Published!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${TEXT_COLOR};">Hello <strong>${studentName}</strong>, results for <strong>${testTitle}</strong> are now available.</p>
    
    <!-- Score Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#141210;border:1px solid rgba(212,165,32,0.2);border-radius:12px;overflow:hidden;text-align:center;">
      <tr>
        <td style="padding:28px 24px;">
          <p style="margin:0 0 4px;font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:3px;">Your Score</p>
          <h1 style="margin:0;font-size:48px;color:${scoreColor};font-weight:800;">${score}<span style="font-size:20px;color:${MUTED_COLOR};">/${totalMarks}</span></h1>
          <p style="margin:8px 0 0;font-size:14px;color:${MUTED_COLOR};">${scorePercent}%</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="text-align:center;padding:12px;border-right:1px solid rgba(212,165,32,0.15);">
                <p style="margin:0;font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;">All India Rank</p>
                <p style="margin:4px 0 0;font-size:22px;color:${BRAND_COLOR};font-weight:700;">#${rank || 'N/A'}</p>
              </td>
              <td width="50%" style="text-align:center;padding:12px;">
                <p style="margin:0;font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;">Percentile</p>
                <p style="margin:4px 0 0;font-size:22px;color:${BRAND_COLOR};font-weight:700;">${percentile || 'N/A'}%</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center">
          <a href="${responseSheetLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,${BRAND_COLOR},#b8860b);color:#0f0d08;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
            📝 View Detailed Response Sheet
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:13px;color:${MUTED_COLOR};text-align:center;">
      You can challenge answer keys within 24 hours from the response sheet page.
    </p>`;
  
  return baseLayout(`Results Published — ${testTitle}`, content);
}

export default {
  hallTicketEmail,
  reminderEmail,
  paymentConfirmationEmail,
  resultPublicationEmail
};
