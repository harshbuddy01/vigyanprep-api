-- ============================================================
-- Migration: Add bundle_includes support for multi-series plans
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Add bundle_includes column to plans table
--    Stores an array of exam types included in a bundle plan (e.g. '{"IAT","NEST","CMI"}')
--    NULL for regular single-exam plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS bundle_includes TEXT[] DEFAULT NULL;

-- 2. Add bundle_includes column to subscriptions table
--    Copied from the plan at purchase time so access checks work even if plan changes later
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS bundle_includes TEXT[] DEFAULT NULL;

-- 3. Index for fast lookup of subscriptions by bundle exam types
CREATE INDEX IF NOT EXISTS idx_subscriptions_bundle
  ON subscriptions USING GIN (bundle_includes)
  WHERE bundle_includes IS NOT NULL;

-- 4. Index for plans by exam_type (useful for BUNDLE filtering)
CREATE INDEX IF NOT EXISTS idx_plans_exam_type
  ON plans (exam_type)
  WHERE active = TRUE;

-- ============================================================
-- Verification queries (run after migration to confirm success)
-- ============================================================

-- Check plans table has the new column:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'bundle_includes';

-- Check subscriptions table has the new column:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'bundle_includes';

-- ============================================================
-- Example: Create a sample IAT+NEST bundle plan (optional)
-- ============================================================
-- INSERT INTO plans (exam_type, name, duration_days, price, discount_price, active, bundle_includes)
-- VALUES ('BUNDLE', 'IAT + NEST All-Access Pass', 365, 2999, 1999, TRUE, '{"IAT","NEST"}');
