/**
 * Auth Types
 * Authentication and authorization types
 */

import type { UserRole, SubscriptionTier } from './database';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  org_id: string;
  onboarding_completed: boolean;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | '*';
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
