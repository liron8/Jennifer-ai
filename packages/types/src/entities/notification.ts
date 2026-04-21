/**
 * Notification Entity Types
 */

export type NotificationType = 
  | 'meeting_reminder'
  | 'task_due'
  | 'task_assigned'
  | 'approval_pending'
  | 'approval_decided'
  | 'key_date_reminder'
  | 'ai_insight'
  | 'delegation_received'
  | 'delegation_completed'
  | 'system';

export type NotificationChannel = 'in_app' | 'email' | 'slack' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  url: string;
  type: 'primary' | 'secondary';
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  actions?: NotificationAction[];
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  read_at?: string;
  sent_channels: NotificationChannel[];
  created_at: string;
}

export interface NotificationCreateInput {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  actions?: NotificationAction[];
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface NotificationFilters {
  type?: NotificationType | NotificationType[];
  is_read?: boolean;
  priority?: NotificationPriority;
}

export interface NotificationPreferences {
  meeting_reminder: { enabled: boolean; channels: NotificationChannel[]; minutes_before: number[] };
  task_due: { enabled: boolean; channels: NotificationChannel[] };
  task_assigned: { enabled: boolean; channels: NotificationChannel[] };
  approval_pending: { enabled: boolean; channels: NotificationChannel[] };
  approval_decided: { enabled: boolean; channels: NotificationChannel[] };
  key_date_reminder: { enabled: boolean; channels: NotificationChannel[] };
  ai_insight: { enabled: boolean; channels: NotificationChannel[] };
  delegation_received: { enabled: boolean; channels: NotificationChannel[] };
}
