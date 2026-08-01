-- MIGRATION 05: V2 SUBSCRIPTIONS, HALL TICKETS, PREVIEW GATE & MEDIA ASSETS
-- Created: 2026-08-01

-- 1. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('IAT', 'NEST', 'CMI', 'ISI')),
    name VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL CHECK (duration_days > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(10,2) CHECK (discount_price >= 0),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STUDENT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HALL TICKETS WITH 16-HEX UNIQUE EXAM ID
CREATE TABLE IF NOT EXISTS public.hall_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unique_exam_id VARCHAR(50) NOT NULL UNIQUE, -- EXAM-{TEST_PREFIX}-{16_HEX_CHARS}
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_email BOOLEAN DEFAULT false,
    delivered_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_id, student_id)
);

-- 4. QUESTION REPORTS (CHALLENGES) WITH ANTI-SPAM CONSTRAINTS
CREATE TABLE IF NOT EXISTS public.question_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 20),
    proof_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'rejected')),
    resolution VARCHAR(30) CHECK (resolution IN ('answer_changed', 'dropped', 'rejected')),
    admin_note TEXT,
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_prefs (
    student_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    renewal_reminders BOOLEAN DEFAULT true,
    test_alerts BOOLEAN DEFAULT true,
    result_alerts BOOLEAN DEFAULT true,
    whatsapp_opt_in BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEDIA ASSETS (MIRRORED IMAGE COPIES)
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url TEXT NOT NULL,
    stored_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id),
    used_in JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PREVIEW RUNS (QUALITY GATE)
CREATE TABLE IF NOT EXISTS public.preview_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    total_questions INT NOT NULL,
    correct_count INT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add preview_status & pipeline status columns to tests table if not present
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS preview_status VARCHAR(20) DEFAULT 'none' CHECK (preview_status IN ('none', 'valid', 'invalidated'));
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft';

-- Enable RLS for all new tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_runs ENABLE ROW LEVEL SECURITY;
