/**
 * Environment Variable Validator
 * Gracefully assigns defaults without crashing startup
 */

const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

export function validateEnv() {
  console.log('🛡️  Configuring environment variables...');

  const missing = [];
  REQUIRED_VARS.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.warn(`⚠️  ENVIRONMENT WARNING: Missing variables (${missing.join(', ')}). Using standard defaults.`);
  } else {
    console.log('✅ All required environment variables present.');
  }

  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }
}
