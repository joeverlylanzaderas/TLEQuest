// admin-web/src/types/classes.ts
export interface ClassSummary {
  id: number;
  teacher: { id: number; username: string };
  class_name: string;
  subject: string;
  section: string;
  school_year: string;
  invite_code: string;
  is_active: boolean;
  student_count: number;
  created_at: string;
}

export interface ClassStudent {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  section: string;
}

export interface ClassEnrollment {
  id: number;
  student: ClassStudent;
  enrolled_at: string;
}

export interface ClassGroup {
  id: number;
  group_number: number;
  group_name: string | null;
  leader: ClassStudent | null;
  members: { id: number; student: ClassStudent }[];
}

export interface ClassUpdatePayload {
  class_name?: string;
  subject?: string;
  section?: string;
  school_year?: string;
}