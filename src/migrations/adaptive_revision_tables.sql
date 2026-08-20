-- =============================================
-- ADAPTIVE CHAPTER REVISION ENGINE
-- Migration: adaptive_revision_tables.sql
-- Created: 2026-08-20
-- =============================================

-- 1. CHAPTER DEFINITIONS (Static reference data for all exam types)
CREATE TABLE IF NOT EXISTS adaptive_chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type       TEXT NOT NULL,                          -- 'iat', 'nest', 'isi', 'jee', 'neet'
    subject         TEXT NOT NULL,                          -- 'Physics', 'Chemistry', 'Mathematics', 'Biology'
    chapter_name    TEXT NOT NULL,                          -- 'Rotational Motion', 'Thermodynamics', etc.
    sub_topics      JSONB NOT NULL DEFAULT '[]'::jsonb,     -- ["Moment of Inertia", "Angular Momentum", ...]
    difficulty_range TEXT NOT NULL DEFAULT 'medium',        -- 'easy', 'medium', 'hard', 'olympiad'
    display_order   INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_type, subject, chapter_name)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_chapters_exam ON adaptive_chapters(exam_type);
CREATE INDEX IF NOT EXISTS idx_adaptive_chapters_subject ON adaptive_chapters(exam_type, subject);

-- 2. AI-GENERATED QUESTION BANK (Auto-cached questions)
CREATE TABLE IF NOT EXISTS adaptive_question_bank (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id          UUID REFERENCES adaptive_chapters(id) ON DELETE CASCADE,
    exam_type           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    chapter_name        TEXT NOT NULL,
    sub_topic           TEXT,                                   -- Specific sub-topic within chapter
    difficulty          TEXT NOT NULL DEFAULT 'medium',          -- 'easy', 'medium', 'hard', 'olympiad'
    question_text       TEXT NOT NULL,                           -- KaTeX LaTeX formatted question
    options             JSONB NOT NULL DEFAULT '[]'::jsonb,      -- ["$option_a$", "$option_b$", ...]
    correct_answer      TEXT NOT NULL,                           -- 'A', 'B', 'C', 'D' or numeric
    explanation         TEXT,                                    -- Step-by-step solution with KaTeX
    ai_model            TEXT,                                    -- 'deepseek/deepseek-chat', 'google/gemini-2.5-flash'
    generation_prompt   TEXT,                                    -- The prompt used to generate this question
    quality_score       DECIMAL(3,2) DEFAULT 1.00,              -- 0.00 to 1.00 (admin can rate)
    times_served        INT NOT NULL DEFAULT 0,                  -- How many times served to students
    times_correct       INT NOT NULL DEFAULT 0,                  -- How many students got it right
    is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,          -- Admin flag for review
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aqb_chapter ON adaptive_question_bank(chapter_id);
CREATE INDEX IF NOT EXISTS idx_aqb_exam_subject ON adaptive_question_bank(exam_type, subject, chapter_name);
CREATE INDEX IF NOT EXISTS idx_aqb_subtopic ON adaptive_question_bank(chapter_name, sub_topic);
CREATE INDEX IF NOT EXISTS idx_aqb_difficulty ON adaptive_question_bank(difficulty);

-- 3. ADAPTIVE REVISION ATTEMPTS (Each practice session by a student)
CREATE TABLE IF NOT EXISTS adaptive_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email       TEXT NOT NULL,
    exam_type           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    chapter_name        TEXT NOT NULL,
    chapter_id          UUID REFERENCES adaptive_chapters(id),
    question_count      INT NOT NULL,
    duration_seconds    INT NOT NULL DEFAULT 600,                -- Timer duration
    time_taken_seconds  INT DEFAULT 0,
    
    -- Results
    total_answered      INT DEFAULT 0,
    correct_count       INT DEFAULT 0,
    wrong_count         INT DEFAULT 0,
    skipped_count       INT DEFAULT 0,
    score               DECIMAL(10,2) DEFAULT 0,
    accuracy            DECIMAL(5,2) DEFAULT 0,                 -- percentage
    
    -- Question-wise breakdown
    questions_data      JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Full question objects served
    answers_data        JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Student's answers { questionId: 'A' }
    results_data        JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Per-question evaluation
    
    -- Weakness diagnosis
    weak_sub_topics     JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Sub-topics student got wrong
    strong_sub_topics   JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Sub-topics student got right
    is_remediation      BOOLEAN NOT NULL DEFAULT FALSE,         -- Was this a weakness-targeted retest?
    parent_attempt_id   UUID REFERENCES adaptive_attempts(id),  -- Link to the attempt this remediates
    
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aa_student ON adaptive_attempts(student_email);
CREATE INDEX IF NOT EXISTS idx_aa_chapter ON adaptive_attempts(student_email, chapter_name);
CREATE INDEX IF NOT EXISTS idx_aa_exam ON adaptive_attempts(student_email, exam_type);
CREATE INDEX IF NOT EXISTS idx_aa_date ON adaptive_attempts(created_at DESC);

-- 4. STUDENT CONCEPT MASTERY (Running mastery tracker per chapter/sub-topic)
CREATE TABLE IF NOT EXISTS student_concept_mastery (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email   TEXT NOT NULL,
    exam_type       TEXT NOT NULL,
    subject         TEXT NOT NULL,
    chapter_name    TEXT NOT NULL,
    sub_topic       TEXT NOT NULL,
    
    -- Mastery metrics
    total_attempts  INT NOT NULL DEFAULT 0,
    correct_count   INT NOT NULL DEFAULT 0,
    wrong_count     INT NOT NULL DEFAULT 0,
    mastery_pct     DECIMAL(5,2) NOT NULL DEFAULT 0,            -- 0 to 100
    streak          INT NOT NULL DEFAULT 0,                     -- Consecutive correct answers
    last_result     TEXT,                                        -- 'correct', 'wrong'
    
    -- Timestamps
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_tested_at  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_email, exam_type, chapter_name, sub_topic)
);

CREATE INDEX IF NOT EXISTS idx_scm_student ON student_concept_mastery(student_email);
CREATE INDEX IF NOT EXISTS idx_scm_chapter ON student_concept_mastery(student_email, exam_type, chapter_name);
CREATE INDEX IF NOT EXISTS idx_scm_weak ON student_concept_mastery(student_email, mastery_pct) WHERE mastery_pct < 60;

-- 5. BOOKMARKED QUESTIONS
CREATE TABLE IF NOT EXISTS bookmarked_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email   TEXT NOT NULL,
    question_id     TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    options         JSONB,
    correct_answer  TEXT,
    explanation     TEXT,
    sub_topic       TEXT,
    chapter_name    TEXT,
    subject         TEXT,
    exam_type       TEXT DEFAULT 'iat',
    difficulty      TEXT DEFAULT 'medium',
    source          TEXT DEFAULT 'adaptive',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_email, question_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_student ON bookmarked_questions(student_email);
CREATE INDEX IF NOT EXISTS idx_bookmarks_subject ON bookmarked_questions(student_email, subject);
CREATE INDEX IF NOT EXISTS idx_bookmarks_chapter ON bookmarked_questions(student_email, chapter_name);

-- 6. STORED PROCEDURES (RPCs)
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

-- 7. PERMISSIONS & GRANTS
GRANT ALL ON TABLE adaptive_chapters TO anon, authenticated, service_role;
GRANT ALL ON TABLE adaptive_question_bank TO anon, authenticated, service_role;
GRANT ALL ON TABLE adaptive_attempts TO anon, authenticated, service_role;
GRANT ALL ON TABLE student_concept_mastery TO anon, authenticated, service_role;
GRANT ALL ON TABLE bookmarked_questions TO anon, authenticated, service_role;

