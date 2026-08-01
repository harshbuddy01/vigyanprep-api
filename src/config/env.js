import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔄 Try multiple possible .env locations
const possiblePaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'api/.env'),
];

for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    dotenv.config({ path: testPath });
    break;
  }
}

// Support alias naming (RAZORPAY_KEY_ID vs RAZORPAY_API_KEY, RAZORPAY_KEY_SECRET vs RAZORPAY_API_SECRET)
if (!process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_KEY_ID) {
  process.env.RAZORPAY_API_KEY = process.env.RAZORPAY_KEY_ID;
}
if (!process.env.RAZORPAY_API_SECRET && process.env.RAZORPAY_KEY_SECRET) {
  process.env.RAZORPAY_API_SECRET = process.env.RAZORPAY_KEY_SECRET;
}

const razorpayKey = process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_KEY_ID;
const razorpaySecret = process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_KEY_SECRET;

console.log('🔵 Razorpay Configuration Check...');
console.log(`  RAZORPAY_API_KEY: ${razorpayKey ? '✅ SET' : '❌ NOT SET'}`);
console.log(`  RAZORPAY_API_SECRET: ${razorpaySecret ? '✅ SET' : '❌ NOT SET'}`);

export default {};