create extension if not exists "uuid-ossp";

-- One anonymous assessment session per run
create table assessments (
  id uuid primary key default gen_random_uuid(),
  candidate_name text,
  primary_skill text,
  extracted_skills text[] default '{}',
  status text not null default 'created'
    check (status in ('created','generating','in_progress','processing','completed','failed')),
  error_message text,
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz default now()
);

-- Resume (parsed by GPT-4o)
create table resumes (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  file_url text not null,
  raw_text text,
  parsed_data jsonb,
  extracted_skills text[] default '{}',
  created_at timestamptz default now()
);

-- AI-generated coding question (one per assessment)
create table coding_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null unique,
  language text not null default 'javascript',
  title text not null,
  description text not null,
  starter_code text not null,
  visible_tests jsonb not null default '[]',
  hidden_tests jsonb not null default '[]',
  reference_solution text,
  created_at timestamptz default now()
);

-- AI-generated MCQ pool (multiple rows per assessment, across difficulties)
create table mcq_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  skill text not null,
  difficulty int not null check (difficulty between 1 and 5),
  question text not null,
  options jsonb not null,
  correct text not null check (correct in ('A','B','C','D')),
  explanation text,
  created_at timestamptz default now()
);

-- Candidate's code submission
create table code_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  language text not null default 'javascript',
  code text not null default '',
  test_results jsonb,
  ai_code_analysis jsonb,
  score numeric(5,2),
  created_at timestamptz default now()
);

-- Candidate's MCQ answers (served adaptively from the pool)
create table mcq_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  mcq_question_id uuid references mcq_questions(id) not null,
  selected_answer text,
  is_correct boolean,
  difficulty_level int not null,
  time_taken_ms int,
  sequence_number int not null,
  created_at timestamptz default now()
);

-- Keystroke / anomaly telemetry
create table keystroke_logs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  events jsonb not null default '[]',
  paste_count int default 0,
  tab_switch_count int default 0,
  anomaly_flags jsonb default '[]',
  created_at timestamptz default now()
);

-- Explanation video + Whisper transcript
create table explanation_videos (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  video_url text,
  transcript text,
  ai_explanation_analysis jsonb,
  score numeric(5,2),
  created_at timestamptz default now()
);

-- Final Skill Passport
create table skill_passports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null unique,
  code_score numeric(5,2),
  mcq_score numeric(5,2),
  explanation_score numeric(5,2),
  resume_score numeric(5,2),
  final_score numeric(5,2),
  base_confidence numeric(5,2) default 70,
  confidence_penalty numeric(5,2) default 0,
  final_confidence numeric(5,2),
  verified_skills text[] default '{}',
  skill_level_map jsonb default '{}',
  code_snippet text,
  video_url text,
  keystroke_timeline jsonb,
  code_analysis jsonb,
  explanation_analysis jsonb,
  resume_analysis jsonb,
  anomaly_flags jsonb default '[]',
  created_at timestamptz default now()
);
