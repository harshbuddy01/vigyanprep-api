/**
 * Environment Variable Validator
 * Ensures all required secrets are present before server starts.
 * Fail-fast in production, warnings in development.
 */

const REQUIRED_SECRETS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_ADMIN_SECRET',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD_HASH',
    'EMAIL_GATEWAY_SECRET',
    'EMAIL_GATEWAY_URL',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'RAZORPAY_API_KEY',
    'RAZORPAY_API_SECRET',
    'GEMINI_API_KEY'
];

export function validateEnv() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDebug = String(process.env.DEBUG || '').toLowerCase() === 'true';
    const missing = [];

    if (isDebug) {
        console.log(`🛡️  Validating environment variables (${process.env.NODE_ENV || 'development'})...`);
    }

    REQUIRED_SECRETS.forEach(secret => {
        let isPresent = !!process.env[secret];
        
        // Special case for Gemini API Key casing variations
        if (secret === 'GEMINI_API_KEY') {
            isPresent = isPresent || !!process.env.Gemini_API_Key;
        }

        if (!isPresent) {
            missing.push(secret);
        }
    });

    if (missing.length > 0) {
        if (isProduction) {
            console.error('\n' + '!'.repeat(50));
            console.error('❌ CRITICAL ERROR: MISSING REQUIRED SECRETS');
            console.error('!'.repeat(50));
            console.error(`Missing variables: ${missing.join(', ')}`);
            console.error('The server cannot start in production without these secrets.');
            console.error('Please configure them in your environment (Railway/Hostinger).');
            console.error('!'.repeat(50) + '\n');
            process.exit(1);
        } else {
            console.warn('\n' + '?'.repeat(50));
            console.warn('⚠️  WARNING: MISSING SECRETS IN DEVELOPMENT');
            console.warn('?'.repeat(50));
            console.warn(`Missing variables: ${missing.join(', ')}`);
            console.warn('Some features may not work correctly without these variables.');
            console.warn('?'.repeat(50) + '\n');
        }
    } else if (isDebug) {
        console.log('✅ All required environment variables are present.');
    }
}
