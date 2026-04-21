/**
 * Organization Entity Types
 */

export type SubscriptionTier = 'trial' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface OrganizationSettings {
  default_timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  week_starts_on: 0 | 1; // 0 = Sunday, 1 = Monday
  working_hours: {
    start: string; // HH:mm
    end: string;
  };
}

export interface AISettings {
  proactive_suggestions_enabled: boolean;
  learning_enabled: boolean;
  daily_brief_enabled: boolean;
  daily_brief_time: string; // HH:mm
  notification_channels: ('email' | 'slack' | 'in_app')[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: 'solo' | '2-10' | '11-50' | '51-200' | '201-500' | '500+';
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  settings: OrganizationSettings;
  ai_settings: AISettings;
  created_at: string;
  updated_at: string;
}

export interface OrganizationCreateInput {
  name: string;
  slug?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: Organization['size'];
}

export interface OrganizationUpdateInput {
  name?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: Organization['size'];
  settings?: Partial<OrganizationSettings>;
  ai_settings?: Partial<AISettings>;
}
