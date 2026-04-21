/**
 * Audit Log Utility
 * Records audit events for tracking user activity
 */

import { createClient } from '@/lib/supabase/server';

interface AuditLogEntry {
  orgId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records an audit log entry (fire-and-forget)
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('audit_log').insert({
      org_id: entry.orgId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType || null,
      entity_id: entry.entityId || null,
      old_values: entry.oldValues || null,
      new_values: entry.newValues || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch (err) {
    console.error('[Audit] Failed to record audit log:', err);
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return undefined;
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}
