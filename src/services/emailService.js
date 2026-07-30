import axios from "axios";
import { getEnrollmentEmailHtml } from "../utils/emailTemplates.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables immediately
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "../.env");
dotenv.config({ path: envPath });

/**
 * 📧 SEND ENROLLMENT EMAIL VIA PHP RELAY (BYPASS BRIDGE)
 * Uses HTTPS protocol (Port 443) which is never blocked by Railway.
 */
export async function sendPaymentEmail(email, name, rollNumber, testName, attempts = 3) {
  const html = getEnrollmentEmailHtml(name, rollNumber, testName);
  const gatewayUrl = process.env.EMAIL_GATEWAY_URL;
  const gatewaySecret = process.env.EMAIL_GATEWAY_SECRET;

  if (!gatewayUrl || !gatewaySecret) {
    console.error("❌ Email Gateway configuration missing in .env!");
    return false;
  }

  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`📡 SECURE RELAY attempt ${i + 1} for ${email}...`);
      
      const payload = JSON.stringify({
        to: email,
        subject: `Your Vigyan Prep Roll Number - ${testName.toUpperCase()}`,
        html: html
      });
      const timestamp = Date.now().toString();
      
      // Generate HMAC signature to match PHP side logic
      const crypto = await import('crypto');
      const signature = crypto.createHmac('sha256', gatewaySecret)
                             .update(payload + timestamp)
                             .digest('hex');

      const response = await axios.post(gatewayUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Vigyan-Timestamp': timestamp,
          'X-Vigyan-Signature': signature
        },
        timeout: 15000
      });

      if (response.data && response.data.success) {
        console.log(`✅ Email sent successfully via Relay!`);
        return true;
      } else {
        throw new Error(response.data.error || "Gateway reported failure");
      }
    } catch (err) {
      console.error(`⚠️ Relay attempt ${i + 1} failed:`, err.message);
      
      if (i < attempts - 1) {
        const delay = 2000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error(`❌ Final email relay failure for ${email} after ${attempts} attempts`);
  return false;
}

export default { sendPaymentEmail };
