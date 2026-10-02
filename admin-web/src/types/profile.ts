export interface UserProfileData {
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

// Matches UserSerializer — what GET /accounts/me/ returns
export interface FullAdminProfile {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  profile: UserProfileData;
}

// Matches SelfProfileUpdateSerializer fields — what PATCH /accounts/me/ accepts
export interface UpdateProfilePayload {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  occupation?: string;
  school?: string;
  grade_level?: string;
  section?: string;
}