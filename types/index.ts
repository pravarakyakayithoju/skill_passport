export interface Assessment {
  id: string;
  candidate_name?: string;
  primary_skill?: string;
  extracted_skills: string[];
  status: 'created' | 'generating' | 'in_progress' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  started_at?: string;
  submitted_at?: string;
  created_at: string;
}

export interface Resume {
  id: string;
  assessment_id: string;
  file_url: string;
  raw_text?: string;
  parsed_data: {
    full_name: string;
    skills: string[];
    experience_level: 'junior' | 'mid' | 'senior';
    primary_skill: string;
    summary: string;
  };
  extracted_skills: string[];
  created_at: string;
}

export interface CodingQuestion {
  id: string;
  assessment_id: string;
  language: string;
  title: string;
  description: string;
  starter_code: string;
  visible_tests: Array<{ input: string; expected: string }>;
  hidden_tests: Array<{ input: string; expected: string }>;
  reference_solution?: string;
  created_at: string;
}

export interface MCQQuestion {
  id: string;
  assessment_id: string;
  skill: string;
  difficulty: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  created_at: string;
}

export interface MCQResponse {
  id: string;
  assessment_id: string;
  mcq_question_id: string;
  selected_answer: string | null;
  is_correct?: boolean;
  difficulty_level: number;
  time_taken_ms?: number;
  sequence_number: number;
  created_at: string;
}

export interface KeystrokeLog {
  id: string;
  assessment_id: string;
  events: any[];
  paste_count: number;
  tab_switch_count: number;
  anomaly_flags: string[];
  created_at: string;
}

export interface ExplanationVideo {
  id: string;
  assessment_id: string;
  video_url?: string;
  transcript?: string;
  ai_explanation_analysis?: any;
  score?: number;
  created_at: string;
}

export interface SkillPassport {
  id: string;
  assessment_id: string;
  code_score: number;
  mcq_score: number;
  explanation_score: number;
  resume_score: number;
  final_score: number;
  base_confidence: number;
  confidence_penalty: number;
  final_confidence: number;
  verified_skills: string[];
  skill_level_map: Record<string, string>;
  code_snippet?: string;
  video_url?: string;
  keystroke_timeline?: any;
  code_analysis?: {
    score: number;
    complexity: string;
    readability: string;
    issues: string[];
  };
  explanation_analysis?: {
    score: number;
    coherent: boolean;
    contradictions: string[];
  };
  resume_analysis?: {
    score: number;
    matched_skills: string[];
    missing_skills: string[];
    summary: string;
  };
  anomaly_flags: string[];
  created_at: string;
}
