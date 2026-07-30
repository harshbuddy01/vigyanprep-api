-- =============================================
-- VIGYAN PREP PRODUCTION POSTGRESQL SCHEMA
-- =============================================

-- 1. ENUM TYPES
CREATE TYPE test_type_enum AS ENUM ('iat', 'nest', 'isi');
CREATE TYPE test_status_enum AS ENUM ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE question_section_enum AS ENUM ('Physics', 'Chemistry', 'Mathematics', 'Biology', 'General');
CREATE TYPE question_type_enum AS ENUM ('MCQ', 'MSQ', 'Numerical', 'TrueFalse', 'Descriptive');
CREATE TYPE question_status_enum AS ENUM ('draft', 'approved', 'archived');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE email_type_enum AS ENUM ('enrollment', 'score_report', 'PAYMENT_CONFIRMATION', 'other');
CREATE TYPE email_status_enum AS ENUM ('sent', 'failed');
CREATE TYPE feedback_status_enum AS ENUM ('pending', 'reviewed', 'resolved');

-- 2. CORE USERS & ADMINS
CREATE TABLE IF NOT EXISTS students (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    roll_number   TEXT UNIQUE,
    full_name     TEXT,
    course        TEXT DEFAULT 'IAT',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_active ON students(last_login_at) WHERE last_login_at > NOW() - INTERVAL '90 days';
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number) WHERE roll_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS admins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE DEFAULT 'admin',
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TEST MANAGEMENT
CREATE TABLE IF NOT EXISTS scheduled_tests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name        TEXT NOT NULL,
    test_type        test_type_enum NOT NULL,
    exam_date        TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 180 CHECK (duration_minutes > 0 AND duration_minutes <= 600),
    total_questions  INT NOT NULL DEFAULT 60 CHECK (total_questions > 0),
    status           test_status_enum NOT NULL DEFAULT 'draft',
    subjects         JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_marks      INT NOT NULL DEFAULT 0 CHECK (total_marks >= 0),
    is_finalized     BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_at     TIMESTAMPTZ,
    description      TEXT,
    instructions     TEXT,
    passing_score    INT DEFAULT 40 CHECK (passing_score >= 0),
    negative_marking BOOLEAN NOT NULL DEFAULT TRUE,
    created_by       UUID REFERENCES admins(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_status ON scheduled_tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_date ON scheduled_tests(exam_date);
CREATE INDEX IF NOT EXISTS idx_tests_type_status ON scheduled_tests(test_type, status);

CREATE TABLE IF NOT EXISTS test_series (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id     TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL CHECK (price >= 1 AND price <= 99999),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_series_active ON test_series(is_active) WHERE is_active = TRUE;

-- 4. QUESTION BANK
CREATE TABLE IF NOT EXISTS questions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id               TEXT,
    section               question_section_enum NOT NULL,
    question_type         question_type_enum NOT NULL,
    status                question_status_enum NOT NULL DEFAULT 'draft',
    question_number       INT DEFAULT 0,
    question_text         TEXT,
    image_url             TEXT,
    options               JSONB,
    correct_option_index  INT,
    correct_answer        JSONB,
    correct_numeric_answer DECIMAL,
    numeric_tolerance     DECIMAL DEFAULT 0,
    model_answer          TEXT,
    marks_positive        DECIMAL(5,2) NOT NULL DEFAULT 4,
    marks_negative        DECIMAL(5,2) NOT NULL DEFAULT -1,
    approved_at           TIMESTAMPTZ,
    archived_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_section_status ON questions(section, status);

CREATE TABLE IF NOT EXISTS test_questions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id        UUID NOT NULL REFERENCES scheduled_tests(id) ON DELETE CASCADE,
    question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    subject        question_section_enum,
    question_order INT,
    marks          DECIMAL(5,2) NOT NULL DEFAULT 4,
    negative_marks DECIMAL(5,2) NOT NULL DEFAULT 1,
    added_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by       UUID REFERENCES admins(id),
    UNIQUE(test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);

-- 5. PAYMENTS & PURCHASES
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                TEXT NOT NULL,
    razorpay_order_id    TEXT NOT NULL,
    razorpay_payment_id  TEXT UNIQUE,
    razorpay_signature   TEXT,
    test_id              TEXT NOT NULL,
    amount               DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status               payment_status_enum NOT NULL DEFAULT 'pending',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_email ON payment_transactions(email);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payment_transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_date_status ON payment_transactions(created_at, status);

CREATE TABLE IF NOT EXISTS purchased_tests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL,
    test_id      TEXT NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email, test_id)
);

CREATE INDEX IF NOT EXISTS idx_purchased_email ON purchased_tests(email);

CREATE TABLE IF NOT EXISTS price_history (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id    TEXT NOT NULL,
    old_price  DECIMAL(10,2) NOT NULL,
    new_price  DECIMAL(10,2) NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    reason     TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_history_test ON price_history(test_id, changed_at DESC);

-- 6. STUDENT ATTEMPTS & RESULTS
CREATE TABLE IF NOT EXISTS student_attempts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 TEXT NOT NULL,
    roll_number           TEXT,
    test_id               TEXT NOT NULL,
    test_name             TEXT,
    total_questions       INT,
    attempted_questions   INT DEFAULT 0,
    correct_answers       INT DEFAULT 0,
    wrong_answers         INT DEFAULT 0,
    unanswered            INT DEFAULT 0,
    score                 DECIMAL(10,2),
    percentage            DECIMAL(5,2),
    time_taken_seconds    INT DEFAULT 0,
    answers               JSONB,
    question_wise_results JSONB,
    started_at            TIMESTAMPTZ,
    submitted_at          TIMESTAMPTZ DEFAULT NOW(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_email ON student_attempts(email);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON student_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON student_attempts(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_email_submitted ON student_attempts(email, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_test_score ON student_attempts(test_id, score DESC);

-- 7. SUPPORTING TABLES
CREATE TABLE IF NOT EXISTS email_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    type        email_type_enum,
    test_id     TEXT,
    roll_number TEXT,
    payment_id  TEXT,
    attempts    INT DEFAULT 0,
    status      email_status_enum,
    error       TEXT,
    message_id  TEXT,
    sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_email ON email_logs(email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

CREATE TABLE IF NOT EXISTS feedback (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT NOT NULL,
    roll_number    TEXT NOT NULL,
    test_id        test_type_enum,
    ratings        JSONB NOT NULL,
    comment        TEXT CHECK (char_length(comment) <= 1000),
    submitted_at   TIMESTAMPTZ DEFAULT NOW(),
    status         feedback_status_enum DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS doubts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email     TEXT NOT NULL,
    question_text     TEXT NOT NULL,
    answer            TEXT NOT NULL,
    handwriting_style TEXT CHECK (handwriting_style IN ('neat', 'cursive', 'casual')),
    is_complex        BOOLEAN DEFAULT FALSE,
    images_used       TEXT[] DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event      TEXT CHECK (event IN ('initiated', 'failed', 'success')) NOT NULL,
    email      TEXT,
    test_id    TEXT,
    error      TEXT,
    user_agent TEXT,
    timestamp  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdf_uploads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name           TEXT,
    file_path           TEXT,
    exam_type           TEXT,
    subject             TEXT,
    topic               TEXT,
    year                TEXT,
    notes               TEXT,
    questions_extracted  INT DEFAULT 0,
    upload_date         TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUTO-UPDATE TRIGGERS
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tests_updated ON scheduled_tests;
CREATE TRIGGER trg_tests_updated 
    BEFORE UPDATE ON scheduled_tests 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_payments_updated ON payment_transactions;
CREATE TRIGGER trg_payments_updated 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_test_series_updated ON test_series;
CREATE TRIGGER trg_test_series_updated 
    BEFORE UPDATE ON test_series 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 9. ROW LEVEL SECURITY
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchased_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
