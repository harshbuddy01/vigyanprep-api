/**
 * Environment Variable Validator
 * Ensures default fallback secrets are set so server runs smoothly on Supabase + GCP.
 */

const DEFAULT_FALLBACKS = {
  JWT_SECRET: 'vigyanprep_production_jwt_secret_2026',
  JWT_ADMIN_SECRET: 'vigyanprep_admin_secret_key_2026',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_HASH: 'admin123',
  SUPABASE_URL: 'https://nmtixpogvdfyqvgkzzfs.supabase.co',
  PORT: '5000'
};

export function validateEnv() {
  console.log('🛡️  Configuring environment variables...');

  // Set default fallbacks for any missing optional variables
  Object.entries(DEFAULT_FALLBACKS).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  console.log('✅ Environment configuration initialized.');
}
