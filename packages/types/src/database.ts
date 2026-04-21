/**
 * Database Types
 * Core database entity types
 */

export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'enterprise';
export type UserRole = 'admin' | 'user';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  size?: string;
  website?: string;
  logo_url?: string;
  subscription_tier: SubscriptionTier;
  trial_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  job_title?: string;
  phone?: string;
  timezone: string;
  onboarding_completed: boolean;
  onboarding_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutiveProfile {
  id: string;
  org_id: string;
  full_name: string;
  title?: string;
  email?: string;
  phones: Array<{ type: string; number: string }>;
  main_office_location?: string;
  home_address?: string;
  timezone?: string;
  avatar_url?: string;
  scheduling_preferences: Record<string, unknown>;
  dietary_preferences: Record<string, unknown>;
  travel_preferences: Record<string, unknown>;
  dining_preferences: Record<string, unknown>;
  health_info: Record<string, unknown>;
  fleet_info: Array<Record<string, unknown>>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  user_id: string;
  provider: 'google' | 'microsoft' | 'zoom' | 'slack';
  type: 'calendar' | 'email' | 'video' | 'chat';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
