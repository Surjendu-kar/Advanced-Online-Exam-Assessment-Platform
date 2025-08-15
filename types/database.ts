// Database types for Advanced Online Exam Platform
// Generated from Supabase schema

export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  role: "admin" | "teacher" | "student";
  created_by?: string;
  institution?: string;
  first_name?: string;
  last_name?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  exam_code?: string;
  created_by: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_marks: number;
  is_published: boolean;
  access_type: "invitation" | "code" | "open";
  max_attempts: number;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  require_webcam: boolean;
  max_violations: number;
  created_at: string;
  updated_at: string;
}

export interface StudentInvitation {
  id: string;
  teacher_id: string;
  student_email: string;
  invitation_token: string;
  exam_id?: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  created_at: string;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  status: "not_started" | "in_progress" | "completed" | "terminated";
  total_score: number;
  violations_count: number;
  created_at: string;
}

export interface ProctoringLog {
  id: string;
  session_id: string;
  violation_type:
    | "tab_switch"
    | "webcam_lost"
    | "suspicious_activity"
    | "multiple_faces"
    | "no_face_detected";
  details?: Record<string, any>;
  timestamp: string;
}

export interface MCQQuestion {
  id: string;
  exam_id: string;
  user_id?: string;
  question_text: string;
  options: string[];
  correct_option?: number;
  selected_option?: number;
  is_correct?: boolean;
  marks?: number;
  marks_obtained?: number;
  created_at: string;
}

export interface SAQQuestion {
  id: string;
  exam_id: string;
  user_id?: string;
  question_text: string;
  correct_answer?: string;
  answer_text?: string;
  answer_guidelines?: string;
  marking_criteria?: string;
  marks?: number;
  marks_obtained?: number;
  grader_comments?: string;
  created_at: string;
}

export interface CodingQuestion {
  id: string;
  exam_id: string;
  user_id?: string;
  question_text: string;
  starter_code?: string;
  expected_output?: string;
  submitted_code?: string;
  output?: string;
  marks?: number;
  marks_obtained?: number;
  language?: string;
  created_at: string;
}

// Utility types for API responses
export interface AuthUser extends User {
  profile?: UserProfile;
}

export interface ExamWithQuestions extends Exam {
  mcq?: MCQQuestion[];
  saq?: SAQQuestion[];
  coding?: CodingQuestion[];
}

export interface SessionWithLogs extends ExamSession {
  proctoring_logs?: ProctoringLog[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count?: number;
  page?: number;
  limit?: number;
}
