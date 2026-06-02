const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString,
  ssl: String(process.env.PG_SSL || '').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : undefined
});

const tables = `
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  school TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English'
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  UNIQUE (subject, grade, topic_name, language)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  quiz_url TEXT,
  qr_code TEXT,
  deadline TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  delivery_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_papers (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  grade TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  difficulty_level TEXT NOT NULL DEFAULT 'mixed',
  question_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL DEFAULT 'generated',
  file_url TEXT,
  extracted_text TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_key JSONB NOT NULL DEFAULT '[]'::jsonb,
  marking_scheme JSONB NOT NULL DEFAULT '[]'::jsonb,
  concept_mapping JSONB NOT NULL DEFAULT '[]'::jsonb,
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  question_paper_id UUID REFERENCES question_papers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  grade TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  status TEXT NOT NULL DEFAULT 'draft',
  total_marks NUMERIC NOT NULL DEFAULT 0,
  processing_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_sheets (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'queued',
  processing_stage TEXT NOT NULL DEFAULT 'uploaded',
  ocr_text TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  processing_log JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS student_analyses (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  answer_sheet_id UUID NOT NULL REFERENCES answer_sheets(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  total_score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  requires_teacher_review BOOLEAN NOT NULL DEFAULT false,
  question_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_weak_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low',
  recommended_intervention TEXT,
  generated_remediation JSONB NOT NULL DEFAULT '[]'::jsonb,
  override_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ai_generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_analyses (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  class_average NUMERIC NOT NULL DEFAULT 0,
  topic_averages JSONB NOT NULL DEFAULT '[]'::jsonb,
  hardest_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  weakest_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  misconception_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  intervention_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_students JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_trends JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intervention_groups (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weak_topic TEXT NOT NULL,
  concept TEXT,
  students JSONB NOT NULL DEFAULT '[]'::jsonb,
  intervention_type TEXT NOT NULL DEFAULT 'reteaching',
  reteaching_plan TEXT,
  peer_learning_suggestion TEXT,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'planned',
  override_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_history (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  intervention_group_id UUID REFERENCES intervention_groups(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'worksheet',
  language TEXT NOT NULL DEFAULT 'English',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_feedback_logs (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  task TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const migrations = `
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low';
ALTER TABLE students ADD COLUMN IF NOT EXISTS confidence_level TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE students ADD COLUMN IF NOT EXISTS learning_profile JSONB NOT NULL DEFAULT '{"strongTopics":[],"weakTopics":[],"recurringMistakes":[]}'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS progress_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
ALTER TABLE answer_sheets ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
ALTER TABLE student_analyses ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
UPDATE answer_sheets
SET classroom_id = assessments.classroom_id
FROM assessments
WHERE answer_sheets.assessment_id = assessments.id
  AND answer_sheets.classroom_id IS NULL;
UPDATE student_analyses
SET classroom_id = assessments.classroom_id
FROM assessments
WHERE student_analyses.assessment_id = assessments.id
  AND student_analyses.classroom_id IS NULL;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_phone_key;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS form_status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS grouped_students JSONB NOT NULL DEFAULT '{"advanced":[],"average":[],"needsSupport":[]}'::jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS class_insight JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS quiz_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_delivery_mode_check;
ALTER TABLE messages ADD CONSTRAINT messages_delivery_mode_check CHECK (delivery_mode IN ('greenapi', 'twilio', 'mock', 'system'));
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('question', 'feedback', 'reply', 'acknowledgement'));
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('sent', 'saved', 'delivered', 'failed', 'received', 'pending'));
`;

const indexes = `
CREATE INDEX IF NOT EXISTS students_teacher_idx ON students (teacher_id);
CREATE INDEX IF NOT EXISTS students_classroom_idx ON students (classroom_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_teacher_phone_idx ON students (teacher_id, phone);
CREATE INDEX IF NOT EXISTS classrooms_teacher_idx ON classrooms (teacher_id);
CREATE INDEX IF NOT EXISTS sessions_teacher_date_idx ON sessions (teacher_id, date DESC);
CREATE INDEX IF NOT EXISTS sessions_form_status_idx ON sessions (form_status);
CREATE INDEX IF NOT EXISTS messages_student_created_idx ON messages (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_session_created_idx ON messages (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS teachers_phone_idx ON teachers (phone);
CREATE INDEX IF NOT EXISTS password_reset_codes_phone_idx ON password_reset_codes (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_codes_teacher_idx ON password_reset_codes (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS question_papers_teacher_idx ON question_papers (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assessments_teacher_created_idx ON assessments (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assessments_classroom_idx ON assessments (classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS answer_sheets_assessment_idx ON answer_sheets (assessment_id);
CREATE INDEX IF NOT EXISTS answer_sheets_classroom_idx ON answer_sheets (classroom_id);
CREATE INDEX IF NOT EXISTS answer_sheets_student_idx ON answer_sheets (student_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS answer_sheets_status_idx ON answer_sheets (processing_status);
CREATE UNIQUE INDEX IF NOT EXISTS answer_sheets_assessment_student_idx ON answer_sheets (assessment_id, student_id);
CREATE INDEX IF NOT EXISTS student_analyses_assessment_idx ON student_analyses (assessment_id);
CREATE INDEX IF NOT EXISTS student_analyses_classroom_idx ON student_analyses (classroom_id);
CREATE INDEX IF NOT EXISTS student_analyses_student_idx ON student_analyses (student_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS student_analyses_sheet_idx ON student_analyses (answer_sheet_id);
CREATE UNIQUE INDEX IF NOT EXISTS classroom_analyses_assessment_idx ON classroom_analyses (assessment_id);
CREATE INDEX IF NOT EXISTS intervention_groups_assessment_idx ON intervention_groups (assessment_id);
CREATE INDEX IF NOT EXISTS remediation_history_student_idx ON remediation_history (student_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS ai_feedback_logs_assessment_idx ON ai_feedback_logs (assessment_id, created_at DESC);
`;

const connectDB = async () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing. Add your PostgreSQL connection string to Replit Secrets (key: DATABASE_URL).');
  }

  try {
    console.log('[database] Connecting to PostgreSQL...');
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      await client.query(tables);
      await client.query(migrations);
      await client.query(indexes);
      console.log('[database] PostgreSQL connected and schema is ready.');
    } finally {
      client.release();
    }
    return pool;
  } catch (error) {
    console.error('[database] PostgreSQL connection failed:', error.message);
    throw error;
  }
};

const query = (text, params) => pool.query(text, params);
const closeDB = () => pool.end();

module.exports = connectDB;
module.exports.query = query;
module.exports.closeDB = closeDB;
module.exports.pool = pool;
