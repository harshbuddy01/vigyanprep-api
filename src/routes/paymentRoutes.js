import express from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Razorpay payment gateway online' });
});

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

export default router;
