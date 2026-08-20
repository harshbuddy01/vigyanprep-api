-- ============================================================================
-- VIGYANPREP SMART ADAPTIVE REVISION ENGINE — SAFE MIGRATION
-- Works seamlessly whether tables are fresh or already partially exist
-- ============================================================================

-- 1. CHAPTER DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS adaptive_chapters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    chapter_name        TEXT NOT NULL,
    sub_topics          JSONB NOT NULL DEFAULT '[]'::jsonb,
    difficulty_range    TEXT NOT NULL DEFAULT 'medium',
    display_order       INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. QUESTION BANK TABLE
CREATE TABLE IF NOT EXISTS adaptive_question_bank (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    chapter_name        TEXT NOT NULL,
    sub_topic           TEXT,
    difficulty          TEXT NOT NULL DEFAULT 'medium',
    question_text       TEXT NOT NULL,
    options             JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer      TEXT NOT NULL,
    explanation         TEXT,
    ai_model            TEXT,
    generation_prompt   TEXT,
    quality_score       DECIMAL(3,2) DEFAULT 1.00,
    times_served        INT NOT NULL DEFAULT 0,
    times_correct       INT NOT NULL DEFAULT 0,
    is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Column Additions (in case table already existed from earlier schema)
ALTER TABLE adaptive_question_bank ADD COLUMN IF NOT EXISTS sub_topic TEXT;
ALTER TABLE adaptive_question_bank ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE adaptive_question_bank ADD COLUMN IF NOT EXISTS times_served INT DEFAULT 0;
ALTER TABLE adaptive_question_bank ADD COLUMN IF NOT EXISTS times_correct INT DEFAULT 0;
ALTER TABLE adaptive_question_bank ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

-- 3. ADAPTIVE ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS adaptive_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email       TEXT NOT NULL,
    exam_type           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    chapter_name        TEXT NOT NULL,
    question_count      INT NOT NULL,
    duration_seconds    INT NOT NULL DEFAULT 600,
    time_taken_seconds  INT DEFAULT 0,
    total_answered      INT DEFAULT 0,
    correct_count       INT DEFAULT 0,
    wrong_count         INT DEFAULT 0,
    skipped_count       INT DEFAULT 0,
    score               DECIMAL(10,2) DEFAULT 0,
    accuracy            DECIMAL(5,2) DEFAULT 0,
    questions_data      JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    results_data        JSONB NOT NULL DEFAULT '[]'::jsonb,
    weak_sub_topics     JSONB NOT NULL DEFAULT '[]'::jsonb,
    strong_sub_topics   JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_remediation      BOOLEAN NOT NULL DEFAULT FALSE,
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Column Additions for attempts
ALTER TABLE adaptive_attempts ADD COLUMN IF NOT EXISTS weak_sub_topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE adaptive_attempts ADD COLUMN IF NOT EXISTS strong_sub_topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE adaptive_attempts ADD COLUMN IF NOT EXISTS is_remediation BOOLEAN DEFAULT FALSE;

-- 4. STUDENT CONCEPT MASTERY TABLE
CREATE TABLE IF NOT EXISTS student_concept_mastery (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email       TEXT NOT NULL,
    exam_type           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    chapter_name        TEXT NOT NULL,
    sub_topic           TEXT NOT NULL,
    total_attempts      INT NOT NULL DEFAULT 0,
    correct_count       INT NOT NULL DEFAULT 0,
    wrong_count         INT NOT NULL DEFAULT 0,
    mastery_pct         DECIMAL(5,2) NOT NULL DEFAULT 0,
    streak              INT NOT NULL DEFAULT 0,
    last_result         TEXT,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_tested_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BOOKMARKED QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS bookmarked_questions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email       TEXT NOT NULL,
    question_id         TEXT NOT NULL,
    question_text       TEXT NOT NULL,
    options             JSONB,
    correct_answer      TEXT,
    explanation         TEXT,
    sub_topic           TEXT,
    chapter_name        TEXT,
    subject             TEXT,
    exam_type           TEXT DEFAULT 'iat',
    difficulty          TEXT DEFAULT 'medium',
    source              TEXT DEFAULT 'adaptive',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_aqb_exam_subject ON adaptive_question_bank(exam_type, subject, chapter_name);
CREATE INDEX IF NOT EXISTS idx_aqb_subtopic ON adaptive_question_bank(chapter_name, sub_topic);
CREATE INDEX IF NOT EXISTS idx_aa_student ON adaptive_attempts(student_email);
CREATE INDEX IF NOT EXISTS idx_aa_chapter ON adaptive_attempts(student_email, chapter_name);
CREATE INDEX IF NOT EXISTS idx_aa_date ON adaptive_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scm_student ON student_concept_mastery(student_email);
CREATE INDEX IF NOT EXISTS idx_scm_chapter ON student_concept_mastery(student_email, exam_type, chapter_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_student ON bookmarked_questions(student_email);
CREATE INDEX IF NOT EXISTS idx_bookmarks_subject ON bookmarked_questions(student_email, subject);

-- 7. UNIQUE CONSTRAINTS (Handled safely)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_concept_mastery') THEN
        ALTER TABLE student_concept_mastery ADD CONSTRAINT uq_student_concept_mastery UNIQUE (student_email, exam_type, chapter_name, sub_topic);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bookmarked_questions') THEN
        ALTER TABLE bookmarked_questions ADD CONSTRAINT uq_bookmarked_questions UNIQUE (student_email, question_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 8. STORED PROCEDURES (RPCs)
CREATE OR REPLACE FUNCTION increment_times_served(question_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE adaptive_question_bank
    SET times_served = times_served + 1
    WHERE id = ANY(question_ids);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_question_stats(q_id UUID, is_correct BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE adaptive_question_bank
    SET times_served = times_served + 1,
        times_correct = times_correct + (CASE WHEN is_correct THEN 1 ELSE 0 END)
    WHERE id = q_id;
END;
$$ LANGUAGE plpgsql;

-- 9. PERMISSIONS & GRANTS
GRANT ALL ON TABLE adaptive_chapters TO anon, authenticated, service_role;
GRANT ALL ON TABLE adaptive_question_bank TO anon, authenticated, service_role;
GRANT ALL ON TABLE adaptive_attempts TO anon, authenticated, service_role;
GRANT ALL ON TABLE student_concept_mastery TO anon, authenticated, service_role;
GRANT ALL ON TABLE bookmarked_questions TO anon, authenticated, service_role;
