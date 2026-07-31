import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Debug Helpers
const IS_DEBUG = String(process.env.DEBUG || '').toLowerCase() === 'true';
const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

if (IS_DEBUG && !IS_PROD) {
  console.log('\n' + '='.repeat(80));
  console.log('🔵 ENVIRONMENT CONFIGURATION STARTUP');
  console.log('='.repeat(80));
}

// 🔄 Try multiple possible .env locations
let envPath = null;
const possiblePaths = [
  path.join(__dirname, '../.env'),           // backend/.env
  path.join(__dirname, '../../.env'),        // root .env
  path.join(process.cwd(), '.env'),          // working directory .env
  path.join(process.cwd(), 'backend/.env'),  // working dir + backend/.env
];

// Always load .env file if it exists on disk
for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    envPath = testPath;
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
}

// 🔴 Verify environment variables
const requiredVars = {
  'MONGODB_URI': 'Database connection string',
  'RAZORPAY_API_KEY': 'Payment API key',
  'RAZORPAY_API_SECRET': 'Payment API secret',
  'NODE_ENV': 'Application environment',
  'EMAIL_USER': 'Email username',
  'EMAIL_PASSWORD': 'Email password',
  'EMAIL_HOST': 'Email host',
  'EMAIL_PORT': 'Email port',
  'API_URL': 'Backend API URL',
  'FRONTEND_URL': 'Frontend URL',
  'JWT_SECRET': 'JWT secret'
};

const missingVars = [];
const loadedVars = [];

Object.entries(requiredVars).forEach(([varName, description]) => {
  if (process.env[varName]) {
    loadedVars.push(varName);
  } else {
    missingVars.push(varName);
  }
});

if (IS_DEBUG) {
  console.log('\n' + '='.repeat(80));
  console.log('💫 ENVIRONMENT VARIABLE STATUS');
  console.log('='.repeat(80));

  Object.entries(requiredVars).forEach(([varName, description]) => {
    if (process.env[varName]) {
      console.log(`✅ ${varName.padEnd(25)} | SET`);
    } else {
      console.log(`❌ ${varName.padEnd(25)} | NOT SET`);
    }
  });

  console.log('\n' + '='.repeat(80));
}
if (missingVars.length > 0) {
  console.warn(`\n⚠️  ENVIRONMENT WARNING: Missing ${missingVars.length} variables (${missingVars.join(', ')})`);
}

if (IS_DEBUG) {
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Loaded: ${loadedVars.length}/${Object.keys(requiredVars).length} variables`);

  if (missingVars.length === 0) {
    console.log('\n✅ ALL ENVIRONMENT VARIABLES LOADED SUCCESSFULLY!');
    console.log('🚀 Application ready to start\n');
  }
  console.log('='.repeat(80));
}
console.log('');

export default {};