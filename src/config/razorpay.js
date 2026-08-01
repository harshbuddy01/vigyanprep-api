import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_API_SECRET || '';

console.log('🔵 Razorpay Configuration Loading...');
console.log('  RAZORPAY_KEY_ID / API_KEY:', keyId ? '✅ SET' : '❌ NOT SET');
console.log('  RAZORPAY_KEY_SECRET / API_SECRET:', keySecret ? '✅ SET' : '❌ NOT SET');

let instance = null;

try {
  if (keyId && keySecret) {
    instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.warn('⚠️ Razorpay credentials missing in environment');
  }
} catch (error) {
  console.error('❌ Razorpay initialization error:', error.message);
  instance = null;
}

export default instance;
