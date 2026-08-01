-- =============================================================================
-- MIGRATION 02: CONTENT & EXAM BLUEPRINTS SCHEMA
-- Central Question Bank, Exam Formats (IAT, NEST, CMI), and PYQ Archives
-- =============================================================================

-- 1. QUESTION BANK TABLE
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Mathematics', 'Biology', 'General')),
    topic VARCHAR(255) DEFAULT 'General',
    difficulty VARCHAR(50) DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Expert')),
    question_type VARCHAR(50) NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'MSQ', 'Numerical', 'Descriptive')),
    body TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    solution_explanation TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    source_paper VARCHAR(255),
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('draft', 'review_pending', 'approved', 'archived')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qb_subject ON question_bank(subject);
CREATE INDEX IF NOT EXISTS idx_qb_status ON question_bank(status);

-- 2. EXAM BLUEPRINTS TABLE
CREATE TABLE IF NOT EXISTS exam_blueprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g., 'IISER IAT 2026', 'NISER NEST 2026', 'CMI B.Math 2026'
    exam_code VARCHAR(50) NOT NULL, -- 'IAT', 'NEST', 'CMI', 'ISI'
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    sections_config JSONB NOT NULL DEFAULT '[
        {"name": "Physics", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"},
        {"name": "Chemistry", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"},
        {"name": "Mathematics", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"},
        {"name": "Biology", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"}
    ]'::jsonb,
    marking_rules JSONB DEFAULT '{
        "msq_partial_credit": true,
        "negative_marking_enabled": true
    }'::jsonb,
    requires_manual_grading BOOLEAN DEFAULT FALSE,
    cutoff_rules JSONB DEFAULT '{"overall_percentage": 40}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Blueprints
INSERT INTO exam_blueprints (id, name, exam_code, duration_minutes, sections_config, requires_manual_grading)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'IISER IAT Official Blueprint',
    'IAT',
    180,
    '[
        {"name": "Physics", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"},
        {"name": "Chemistry", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"},
        {"name": "Mathematics", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"},
        {"name": "Biology", "question_count": 15, "marks_positive": 4, "marks_negative": -1, "type": "MCQ"}
    ]'::jsonb,
    FALSE
),
(
    '22222222-2222-2222-2222-222222222222',
    'NISER NEST Official Blueprint',
    'NEST',
    210,
    '[
        {"name": "Physics", "question_count": 17, "marks_positive": 3, "marks_negative": -1, "type": "MCQ"},
        {"name": "Chemistry", "question_count": 17, "marks_positive": 3, "marks_negative": -1, "type": "MCQ"},
        {"name": "Mathematics", "question_count": 17, "marks_positive": 3, "marks_negative": -1, "type": "MCQ"},
        {"name": "Biology", "question_count": 17, "marks_positive": 3, "marks_negative": -1, "type": "MCQ"}
    ]'::jsonb,
    FALSE
),
(
    '33333333-3333-3333-3333-333333333333',
    'CMI B.Math Subjective Blueprint',
    'CMI',
    180,
    '[
        {"name": "Part A — Objective", "question_count": 10, "marks_positive": 4, "marks_negative": 0, "type": "MCQ"},
        {"name": "Part B — Subjective Proofs", "question_count": 6, "marks_positive": 15, "marks_negative": 0, "type": "Descriptive"}
    ]'::jsonb,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 3. PYQ PAPERS TABLE
CREATE TABLE IF NOT EXISTS pyq_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_type VARCHAR(50) NOT NULL,
    year VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    pdf_url TEXT,
    parse_status VARCHAR(50) DEFAULT 'uploaded' CHECK (parse_status IN ('uploaded', 'parsing', 'review_ready', 'published', 'failed')),
    total_questions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
