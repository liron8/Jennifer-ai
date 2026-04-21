/**
 * Integration Entity Types
 */

export type IntegrationProvider = 'google' | 'microsoft' | 'slack' | 'zoom';
export type IntegrationType = 'calendar' | 'email' | 'messaging' | 'video';
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'revoked';

export interface IntegrationSettings {
  default_calendar_id?: string;
  sync_enabled?: boolean;
  notification_channel?: string;
  webhook_url?: string;
}

export interface Integration {
  id: string;
  org_id: string;
  user_id: string;
  provider: IntegrationProvider;
  integration_type: IntegrationType;
  status: IntegrationStatus;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes: string[];
  provider_user_id?: string;
  provider_email?: string;
  settings: IntegrationSettings;
  last_synced_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationPublic {
  id: string;
  provider: IntegrationProvider;
  integration_type: IntegrationType;
  status: IntegrationStatus;
  provider_email?: string;
  last_synced_at?: string;
  created_at: string;
}

export interface CalendarSyncToken {
  id: string;
  integration_id: string;
  calendar_id: string;
  calendar_name: string;
  sync_token?: string;
  is_enabled: boolean;
  is_primary: boolean;
  color?: string;
  last_synced_at?: string;
}

export interface IntegrationFilters {
  provider?: IntegrationProvider;
  integration_type?: IntegrationType;
  status?: IntegrationStatus;
}

export interface OAuthState {
  provider: IntegrationProvider;
  redirect_url: string;
  user_id: string;
  org_id: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}
