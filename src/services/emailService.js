// 📧 Vigyan.prep AWS SES Email Service
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-southeast-2';

// Dedicated sender addresses
export const EMAIL_FROM = {
  PAYMENT:      'payment@vigyanprep.com',
  NOTIFICATION: 'noreply@vigyanprep.com',
  SUPPORT:      'support@vigyanprep.com'
};

const BRAND_NAME = 'VIGYAN.prep';

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
 * @param {object} options - Optional: { from, textBody, replyTo }
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail(to, subject, htmlBody, options = {}) {
  if (!sesClient) {
    console.warn('⚠️ SES client not available, skipping email to:', to);
    return { success: false, error: 'SES client not initialized' };
  }

  const fromEmail = options.from || EMAIL_FROM.NOTIFICATION;
  const replyTo = options.replyTo || EMAIL_FROM.SUPPORT;

  try {
    const params = {
      Source: `${BRAND_NAME} <${fromEmail}>`,
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: [replyTo],
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlBody, Charset: 'UTF-8' },
          ...(options.textBody ? { Text: { Data: options.textBody, Charset: 'UTF-8' } } : {})
        }
      }
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`📧 [${fromEmail}] Email sent to ${to}: ${subject} (MessageId: ${result.MessageId})`);
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
 * @param {object} options - Optional: { from, replyTo }
 */
export async function sendBulkEmail(recipients, subject, htmlBody, options = {}) {
  const results = [];
  for (const email of recipients) {
    const result = await sendEmail(email, subject, htmlBody, options);
    results.push({ email, ...result });
    // Small delay to avoid SES rate limits
    await new Promise(r => setTimeout(r, 100));
  }
  return results;
}

export default { sendEmail, sendBulkEmail, EMAIL_FROM };
