-- Bookmarked Questions Table
-- Allows students to save questions for future review

CREATE TABLE IF NOT EXISTS bookmarked_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  sub_topic TEXT,
  chapter_name TEXT,
  subject TEXT,
  exam_type TEXT DEFAULT 'iat',
  difficulty TEXT DEFAULT 'medium',
  source TEXT DEFAULT 'adaptive',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_email, question_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_student ON bookmarked_questions(student_email);
CREATE INDEX IF NOT EXISTS idx_bookmarks_subject ON bookmarked_questions(student_email, subject);
CREATE INDEX IF NOT EXISTS idx_bookmarks_chapter ON bookmarked_questions(student_email, chapter_name);
