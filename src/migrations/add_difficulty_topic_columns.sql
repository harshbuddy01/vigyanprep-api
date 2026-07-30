-- Add difficulty and topic columns to questions table
-- This enables the statistics endpoint to work properly

-- Add difficulty column (Easy, Medium, Hard)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'Medium' 
AFTER section;

-- Add topic column for more granular categorization
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS topic VARCHAR(100) DEFAULT 'General' 
AFTER difficulty;

-- Create index for better performance on statistics queries
CREATE INDEX IF NOT EXISTS idx_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_section_difficulty ON questions(section, difficulty);

-- Update existing rows to have default values
UPDATE questions SET difficulty = 'Medium' WHERE difficulty IS NULL;
UPDATE questions SET topic = 'General' WHERE topic IS NULL;
