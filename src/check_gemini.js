import './config/env.js';
console.log('--- Environment Diagnostic ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY start:', process.env.GEMINI_API_KEY.substring(0, 4), '...');
}
console.log('------------------------------');
process.exit(0);
