/**
 * Environment Variable Validator
 */

const REQUIRED_VARS = ['JWT_SECRET', 'JWT_ADMIN_SECRET', 'SUPABASE_URL', 'SUPABASE_KEY'];

export function validateEnv() {
  console.log('🛡️  Configuring environment variables...');

  REQUIRED_VARS.forEach(key => {
    if (!process.env[key]) {
      throw new Error(`FATAL: Missing required environment variable: ${key}. Server cannot start.`);
    }
  });

  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }

  console.log('✅ All required environment variables present.');
}
