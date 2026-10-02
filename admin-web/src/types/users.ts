export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  id: number;
  profile_picture: string | null;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string | null;
  occupation: string;
  school: string;
  grade_level: string;
  section: string;
  created_at: string;
  updated_at: string;
}

// Matches UserSerializer exactly — used for list + detail reads
export interface ManagedUser {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  profile: UserProfile | null;
}

// Matches AdminUserCreateSerializer — POST body
export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
}

// Matches AdminUserUpdateSerializer — PATCH body
export interface UpdateUserPayload {
  username?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface BulkUploadResult {
  created_count: number;
  error_count: number;
  created: { username: string; password: string; role: string }[];
  errors: { row: number; username: string; errors: Record<string, string[]> }[];
}

export interface AdminResetPasswordResult {
  username: string;
  new_password: string;
  detail: string;
}