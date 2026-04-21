/**
 * User Entity Types
 */

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
  default_view: 'list' | 'board' | 'calendar';
}

export interface OnboardingData {
  company_completed: boolean;
  role_completed: boolean;
  executives_added: boolean;
  integrations_connected: boolean;
  completed_at?: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  job_title?: string;
  phone?: string;
  timezone: string;
  preferences: UserPreferences;
  onboarding_completed: boolean;
  onboarding_data: OnboardingData;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  email: string;
  full_name?: string;
  role?: UserRole;
  job_title?: string;
  phone?: string;
  timezone?: string;
}

export interface UserUpdateInput {
  full_name?: string;
  avatar_url?: string;
  job_title?: string;
  phone?: string;
  timezone?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserWithOrganization extends User {
  organization: {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
  };
}
