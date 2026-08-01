-- =============================================================================
-- MIGRATION 03: TESTS, ATTEMPTS, ANTI-CHEAT & RESULTS SCHEMA
-- Multi-tenant test instances, attempt tracking, autosave, and staged releases
-- =============================================================================

-- 1. TEST SERIES TABLE
CREATE TABLE IF NOT EXISTS test_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE, -- NULL = platform global series
    blueprint_id UUID REFERENCES exam_blueprints(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) DEFAULT 0,
    visibility VARCHAR(50) DEFAULT 'public' CHECK (visibility IN ('public', 'org_only', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TESTS TABLE (Test Instances)
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    series_id UUID REFERENCES test_series(id) ON DELETE SET NULL,
    blueprint_id UUID REFERENCES exam_blueprints(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) DEFAULT 'IAT',
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'frozen', 'live', 'closed', 'graded', 'published')),
    frozen_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tests_org_id ON tests(org_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);

-- 3. TEST QUESTIONS LINKING TABLE
CREATE TABLE IF NOT EXISTS test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    section VARCHAR(100) NOT NULL DEFAULT 'Physics',
    position INTEGER NOT NULL DEFAULT 1,
    marks_positive NUMERIC(5, 2) DEFAULT 4,
    marks_negative NUMERIC(5, 2) DEFAULT -1,
    UNIQUE(test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_tq_test_id ON test_questions(test_id);

-- 4. ATTEMPTS TABLE (Student Exam Attempts)
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    server_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'terminated', 'evaluated')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    submit_reason VARCHAR(50) CHECK (submit_reason IN ('manual', 'auto_time', 'auto_proctor', 'force_admin')),
    warning_count INTEGER DEFAULT 0,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_id, student_id) -- Single session per student per test
);

CREATE INDEX IF NOT EXISTS idx_attempts_test_student ON attempts(test_id, student_id);

-- 5. ATTEMPT ANSWERS TABLE (10s Autosave Sync)
CREATE TABLE IF NOT EXISTS attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    answer TEXT,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_version INTEGER DEFAULT 1,
    UNIQUE(attempt_id, question_id)
);

-- 6. ATTEMPT EVENTS TABLE (Anti-cheat Audit Trail)
CREATE TABLE IF NOT EXISTS attempt_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('tab_switch', 'fullscreen_exit', 'window_blur', 'dev_tools', 'network_reconnect')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. RESULTS TABLE (Staged Release & Ranks)
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    raw_score NUMERIC(7, 2) DEFAULT 0,
    section_scores JSONB DEFAULT '{}'::jsonb,
    percentage NUMERIC(5, 2) DEFAULT 0,
    rank_overall INTEGER,
    rank_org INTEGER,
    percentile NUMERIC(6, 3) DEFAULT 0,
    published_stages JSONB DEFAULT '{
        "stage_1_response_sheet": false,
        "stage_2_answer_key": false,
        "stage_3_marks": false,
        "stage_4_rank_list": false
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_results_org_id ON results(org_id);
CREATE INDEX IF NOT EXISTS idx_results_test_id ON results(test_id);
