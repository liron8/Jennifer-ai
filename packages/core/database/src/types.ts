/**
 * Database Types
 * Core database type definitions
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  size?: string;
  website?: string;
  logo_url?: string;
  subscription_tier: 'trial' | 'starter' | 'pro' | 'enterprise';
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
  role: 'admin' | 'user';
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

export interface UserExecutiveAssignment {
  id: string;
  user_id: string;
  executive_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  tier_required: 'core' | 'pro' | 'enterprise';
  rollout_percentage: number;
  org_whitelist: string[];
  org_blacklist: string[];
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  user_id: string;
  provider: 'google' | 'microsoft' | 'zoom' | 'slack';
  type: 'calendar' | 'email' | 'video' | 'chat';
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes: string[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
