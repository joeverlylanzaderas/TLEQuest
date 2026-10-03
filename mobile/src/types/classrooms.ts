// mobile/src/types/classrooms.ts
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
  updated_at: string;
}

export interface ClassmateStudent {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  section: string;
  profile_picture: string | null;
}

export interface ClassEnrollment {
  id: number;
  student: ClassmateStudent;
  class_obj: number;
  enrolled_at: string;
}

// StudentMini kept for reference — still matches StudentMiniSerializer
// exactly, just no longer used by GroupMember/Group.leader below, now
// that the backend was upgraded to return full profile data for both.
export interface StudentMini {
  id: number;
  username: string;
}

export interface GroupMember {
  id: number;
  student: ClassmateStudent;   // was StudentMini — backend now returns full profile data
  member_role: string;
  joined_at: string;
}

export interface Group {
  id: number;
  class_obj: number;
  group_number: number;
  group_name: string | null;
  leader: ClassmateStudent | null;   // was StudentMini — same upgrade, leader's name/photo now available too
  members: GroupMember[];
  created_at: string;
}

export interface ClassCreatePayload {
  class_name: string;
  subject: string;
  section: string;
  school_year: string;
}

export interface ClassUpdatePayload {
  class_name?: string;
  subject?: string;
  section?: string;
  school_year?: string;
}

export interface GroupCreatePayload {
  group_number: number;
  group_name?: string;
  leader?: number | null;
}

export type GroupUpdatePayload = Partial<Omit<GroupCreatePayload, 'group_number'>> & {
  group_number?: number;
};

export interface GroupMemberCreatePayload {
  student: number;
  member_role?: string;
}