// 📧 Vigyan.prep AWS SES Email Service
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-southeast-2';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'support@vigyanprep.com';
const FROM_NAME = process.env.SES_FROM_NAME || 'VIGYAN.prep';

let sesClient = null;

try {
  // AWS SDK auto-discovers credentials from env vars, IAM roles, or shared config
  sesClient = new SESClient({ region: AWS_REGION });
  console.log(`✅ AWS SES client initialized (region: ${AWS_REGION})`);
} catch (err) {
  console.warn('⚠️ AWS SES client initialization failed:', err.message);
}

/**
 * Send an email via AWS SES
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text fallback
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail(to, subject, htmlBody, textBody = '') {
  if (!sesClient) {
    console.warn('⚠️ SES client not available, skipping email to:', to);
    return { success: false, error: 'SES client not initialized' };
  }

  try {
    const params = {
      Source: `${FROM_NAME} <${FROM_EMAIL}>`,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlBody, Charset: 'UTF-8' },
          ...(textBody ? { Text: { Data: textBody, Charset: 'UTF-8' } } : {})
        }
      }
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`📧 Email sent to ${to}: ${subject} (MessageId: ${result.MessageId})`);
    return { success: true, messageId: result.MessageId };
  } catch (err) {
    console.error(`❌ Email send failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send email to multiple recipients (batch)
 * @param {string[]} recipients - Array of email addresses
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 */
export async function sendBulkEmail(recipients, subject, htmlBody) {
  const results = [];
  for (const email of recipients) {
    const result = await sendEmail(email, subject, htmlBody);
    results.push({ email, ...result });
    // Small delay to avoid SES rate limits
    await new Promise(r => setTimeout(r, 100));
  }
  return results;
}

export default { sendEmail, sendBulkEmail };
