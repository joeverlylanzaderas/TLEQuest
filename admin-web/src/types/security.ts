export interface SecurityQuestion {
  id: number;
  question_text: string;
}

export interface SecurityAnswerInput {
  question_id: number;
  answer: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  security_answers?: SecurityAnswerInput[];
}