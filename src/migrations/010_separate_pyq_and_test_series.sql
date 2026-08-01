-- 010_separate_pyq_and_test_series.sql
-- Discriminator
ALTER TABLE tests ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'test_series';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tests_content_type_chk') THEN
        ALTER TABLE tests ADD CONSTRAINT tests_content_type_chk CHECK (content_type IN ('pyq', 'test_series'));
    END IF;
END $$;

-- 24-hour Allen window
ALTER TABLE tests ADD COLUMN IF NOT EXISTS window_start   timestamptz;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS window_end     timestamptz;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 180;

-- Preview quality gate
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_status  text DEFAULT 'pending';
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_at      timestamptz;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_by      uuid;

-- PYQ-specific
ALTER TABLE tests ADD COLUMN IF NOT EXISTS pyq_year        int;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_published    boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tests_content_type ON tests(content_type);
CREATE INDEX IF NOT EXISTS idx_tests_window       ON tests(window_start, window_end);
