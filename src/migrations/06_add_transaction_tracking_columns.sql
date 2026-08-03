-- =============================================
-- MIGRATION 06: Add denormalized columns for transaction tracking
-- Run this in the Supabase SQL Editor
-- Safe: Only adds columns, doesn't modify existing data
-- =============================================

-- Add extra tracking columns to existing subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Also add student details columns to payments table for admin transaction view
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS duration_days INT;

-- Create indexes for efficient subscription lookups
CREATE INDEX IF NOT EXISTS idx_subs_email ON public.subscriptions(student_email);
CREATE INDEX IF NOT EXISTS idx_payments_student_email ON public.payments(student_email);
