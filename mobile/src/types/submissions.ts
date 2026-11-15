// mobile/src/types/submissions.ts
export interface SubmissionCreatePayload {
  quest_assignment: number;
  image_url: string;
  classifier_result: string;
  confidence_score: number;
  generated_feedback: string;
}

export interface SubmissionReviewPayload {
  teacher_feedback: string;
  teacher_rating?: number | null;
}

export interface Submission {
  id: number;
  quest_assignment: number;
  quest_title: string;
  group: number;
  group_name: string;
  student: number;
  student_username: string;
  student_name?: string; // real name (first + last); falls back to the username
  image_url: string;
  classifier_result: string;
  confidence_score: number;
  generated_feedback: string;
  teacher_feedback: string;
  teacher_rating: number | null;
  is_reviewed: boolean;
  reviewed_by: number | null;
  reviewed_by_username: string | null;
  reviewed_by_name?: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}