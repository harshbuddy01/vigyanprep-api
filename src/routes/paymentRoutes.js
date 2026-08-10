import express from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Razorpay payment gateway online' });
});

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

import crypto from 'crypto';
import { supabase } from '../db/supabase.js';

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSignature = req.headers['x-razorpay-signature'];
    
    if (webhookSecret && receivedSignature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');
      
      if (expectedSignature !== receivedSignature) {
        console.error('❌ Webhook signature mismatch');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }
    
    const event = JSON.parse(req.body.toString());
    console.log('📩 Razorpay webhook event:', event.event);
    
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      
      // Update subscription status if not already done
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('razorpay_order_id', orderId)
        .single();
      
      if (!existing) {
        console.log(`📩 Webhook: Processing payment for order ${orderId}`);
        // Insert transaction record
        await supabase.from('transactions').insert({
          razorpay_order_id: orderId,
          razorpay_payment_id: payment.id,
          amount: payment.amount / 100,
          status: 'captured',
          email: payment.email,
          created_at: new Date().toISOString()
        });
      }
    }
    
    // Always respond 200 to acknowledge receipt
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(200).json({ status: 'ok' }); // Still 200 to prevent retries
  }
});

export default router;
