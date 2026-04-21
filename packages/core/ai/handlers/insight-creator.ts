/**
 * Insight Creator
 * Helper functions to create AI insights and notifications in the database.
 * Used by event handlers to persist proactive intelligence results.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@jeniferai/core-database';

export interface InsightInput {
  orgId: string;
  executiveId?: string;
  userId?: string;
  insightType: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  reasoning?: string;
  suggestedActions?: Array<{ action: string; label: string; url?: string }>;
  relatedEntityId?: string;
  relatedEntityType?: string;
  validUntil?: string;
}

export interface NotificationInput {
  orgId: string;
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  category?: string;
  actionLabel?: string;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  expiresAt?: string;
}

/**
 * Create an AI insight and optionally a notification for the relevant user.
 */
export async function createInsight(
  supabase: SupabaseClient<Database>,
  input: InsightInput
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ai_insights')
    .insert({
      org_id: input.orgId,
      executive_id: input.executiveId || null,
      user_id: input.userId || null,
      insight_type: input.insightType,
      title: input.title,
      description: input.description,
      priority: input.priority,
      confidence_score: input.confidenceScore,
      reasoning: input.reasoning || null,
      suggested_actions: input.suggestedActions || null,
      related_entity_id: input.relatedEntityId || null,
      related_entity_type: input.relatedEntityType || null,
      valid_until: input.validUntil || null,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create AI insight:', error.message);
    return null;
  }

  return data?.id || null;
}

/**
 * Create a notification for a specific user.
 */
export async function createNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationInput
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert({
      org_id: input.orgId,
      user_id: input.userId,
      notification_type: input.notificationType,
      title: input.title,
      body: input.body,
      category: input.category || 'ai_insight',
      action_label: input.actionLabel || null,
      action_url: input.actionUrl || null,
      related_entity_id: input.relatedEntityId || null,
      related_entity_type: input.relatedEntityType || null,
      expires_at: input.expiresAt || null,
      is_read: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }

  return data?.id || null;
}

/**
 * Create an insight AND notify all EA users in the organization.
 * This is the most common pattern — create insight + broadcast notification.
 */
export async function createInsightWithNotification(
  supabase: SupabaseClient<Database>,
  insight: InsightInput,
  notification: Omit<NotificationInput, 'userId' | 'orgId'>
): Promise<{ insightId: string | null; notificationCount: number }> {
  const insightId = await createInsight(supabase, insight);

  if (!insightId) {
    return { insightId: null, notificationCount: 0 };
  }

  // Find all active users in this org (EA role members)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgMembers } = await (supabase as any)
    .from('org_members')
    .select('user_id')
    .eq('org_id', insight.orgId)
    .eq('is_active', true);

  if (!orgMembers || orgMembers.length === 0) {
    return { insightId, notificationCount: 0 };
  }

  // Create a notification for each org member
  let notificationCount = 0;
  for (const member of orgMembers as Array<{ user_id: string }>) {
    const result = await createNotification(supabase, {
      ...notification,
      orgId: insight.orgId,
      userId: member.user_id,
      relatedEntityId: notification.relatedEntityId || insightId,
      relatedEntityType: notification.relatedEntityType || 'ai_insight',
    });
    if (result) notificationCount++;
  }

  return { insightId, notificationCount };
}
