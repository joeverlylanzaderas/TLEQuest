//mobile/src/types/accounts.ts
export type UserRole = 'student' | 'teacher' | 'admin';

// What the app actually stores/uses after login — reconstructed
// from the flat login response, not returned as a nested object.
export interface User {
  id: number;
  username: string;
  role: UserRole;
}

// Matches CustomTokenObtainPairSerializer.validate() exactly —
// flat fields, no nested "user" key.
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

export interface UserProfile {
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

export interface FullUser {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  profile: UserProfile;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  occupation?: string;
  school?: string;
  grade_level?: string;
  section?: string;
  // Only included when the user picked a new photo this session.
  profile_picture?: { uri: string; name: string; type: string } | null;
}