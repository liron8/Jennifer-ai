/**
 * Audit Log Entity Types
 */

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject'
  | 'delegate'
  | 'complete'
  | 'sync'
  | 'export'
  | 'invite'
  | 'settings_change';

export type AuditResource = 
  | 'user'
  | 'organization'
  | 'executive'
  | 'meeting'
  | 'task'
  | 'approval'
  | 'key_date'
  | 'contact'
  | 'concierge'
  | 'delegation'
  | 'integration'
  | 'settings';

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string;
  action: AuditAction;
  resource: AuditResource;
  resource_id?: string;
  description: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: AuditAction | AuditAction[];
  resource?: AuditResource | AuditResource[];
  resource_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface AuditLogWithUser extends AuditLog {
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}
