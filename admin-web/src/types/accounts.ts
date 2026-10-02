export type UserRole = 'student' | 'teacher' | 'admin';

// What we store client-side after login — reconstructed from the
// flat login response, same as mobile's AuthContext does.
export interface AdminUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user_id: number;
  username: string;
  role: UserRole;
}

export interface LoginPayload {
  username: string;
  password: string;
}