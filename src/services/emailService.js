// 📧 Vigyan.prep Email Service (Powered by Brevo)
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Dedicated sender addresses — must match a verified Brevo sender domain
export const EMAIL_FROM = {
  PAYMENT:      { email: 'anandharsh437@gmail.com', name: 'Vigyan.prep Billing' },
  NOTIFICATION: { email: 'anandharsh437@gmail.com', name: 'Vigyan.prep' },
  SUPPORT:      { email: 'anandharsh437@gmail.com', name: 'Vigyan.prep Support' }
};

/**
 * Send an email via Brevo REST API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {object} options - Optional: { from, textBody, replyTo }
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail(to, subject, htmlBody, options = {}) {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY is not set in environment variables');
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }

  // Handle options.from as string ('email@x.com') or object ({email, name}) or EMAIL_FROM constant
  let sender = EMAIL_FROM.NOTIFICATION;
  if (options.from) {
    sender = typeof options.from === 'string'
      ? { email: options.from, name: 'Vigyan.prep' }
      : options.from;
  }
  let replyTo = EMAIL_FROM.SUPPORT;
  if (options.replyTo) {
    replyTo = typeof options.replyTo === 'string'
      ? { email: options.replyTo }
      : options.replyTo;
  }

  try {
    const payload = {
      sender,
      to: [{ email: to }],
      replyTo,
      subject,
      htmlContent: htmlBody,
      ...(options.textBody ? { textContent: options.textBody } : {})
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error response:', JSON.stringify(data));
      throw new Error(data.message || JSON.stringify(data) || 'Failed to send email via Brevo');
    }

    console.log(`📧 [${sender.email}] Email sent to ${to}: ${subject} (MessageId: ${data.messageId})`);
    return { success: true, messageId: data.messageId };
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
    await new Promise(r => setTimeout(r, 100));
  }
  return results;
}

export default { sendEmail, sendBulkEmail, EMAIL_FROM };

