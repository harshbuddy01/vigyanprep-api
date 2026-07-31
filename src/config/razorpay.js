import Razorpay from 'razorpay';

console.log('🔵 Razorpay Configuration Loading...');
console.log('  RAZORPAY_API_KEY:', process.env.RAZORPAY_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('  RAZORPAY_API_SECRET:', process.env.RAZORPAY_API_SECRET ? '✅ SET' : '❌ NOT SET');

let instance = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.warn('⚠️ Razorpay not initialized - Missing API credentials');
    console.warn('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables');
  }
} catch (error) {
  console.error('❌ Razorpay initialization error:', error.message);
  console.warn('⚠️ Razorpay disabled - payment functionality may not work');
  instance = null;
}

export default instance;
