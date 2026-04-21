/**
 * AI Event Handlers
 * Subscribes to domain events and triggers proactive intelligence.
 * This is the core of "proactive AI" — the system reacts to data changes
 * without the user asking.
 */

import { eventBus } from '@jeniferai/core-event-bus';
import { createAdminClient } from '@jeniferai/core-database';
import { detectMeetingConflicts } from '../modules/conflict-detector';
import { checkTravelTimeBetweenMeetings } from '../modules/traffic-predictor';
import { createInsight, createInsightWithNotification } from './insight-creator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

function getSupabase(): AnySupabase {
  return createAdminClient();
}

/**
 * Register all AI event handlers. Call once at app startup.
 */
export function registerAIEventHandlers(): void {
  // Meeting events
  eventBus.subscribe('meeting.created', handleMeetingCreated);
  eventBus.subscribe('meeting.updated', handleMeetingUpdated);

  // Task events
  eventBus.subscribe('task.created', handleTaskCreated);

  // Approval events
  eventBus.subscribe('approval.created', handleApprovalCreated);

  console.log('[AI Handlers] Registered event handlers for: meeting.created, meeting.updated, task.created, approval.created');
}

// ─── Meeting Created ─────────────────────────────────────────────

interface MeetingPayload {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  location_type?: string | null;
  executive_id?: string | null;
  org_id: string;
}

async function handleMeetingCreated(event: { payload: unknown; metadata: { orgId: string; userId: string } }): Promise<void> {
  const meeting = event.payload as MeetingPayload;
  const { orgId, userId } = event.metadata;
  const supabase = getSupabase();

  try {
    // 1. Check for scheduling conflicts with existing meetings
    await checkForConflicts(supabase, meeting, orgId, userId);

    // 2. Check travel time if this is an in-person meeting
    if (meeting.location_type === 'in_person' && meeting.location) {
      await checkTravelTime(supabase, meeting, orgId, userId);
    }
  } catch (err) {
    console.error('[AI Handler] meeting.created error:', err);
  }
}

async function handleMeetingUpdated(event: { payload: unknown; metadata: { orgId: string; userId: string } }): Promise<void> {
  // Re-run conflict detection when meeting time/location changes
  const meeting = event.payload as MeetingPayload;
  const { orgId, userId } = event.metadata;
  const supabase = getSupabase();

  try {
    await checkForConflicts(supabase, meeting, orgId, userId);

    if (meeting.location_type === 'in_person' && meeting.location) {
      await checkTravelTime(supabase, meeting, orgId, userId);
    }
  } catch (err) {
    console.error('[AI Handler] meeting.updated error:', err);
  }
}

async function checkForConflicts(
  supabase: AnySupabase,
  meeting: MeetingPayload,
  orgId: string,
  userId: string
): Promise<void> {
  // Fetch today's meetings to check against
  const meetingDate = new Date(meeting.start_time);
  const dayStart = new Date(meetingDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(meetingDate);
  dayEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from('meetings')
    .select('id, title, start_time, end_time, location, location_type')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString())
    .order('start_time', { ascending: true });

  if (meeting.executive_id) {
    query = query.eq('executive_id', meeting.executive_id);
  }

  const { data: dayMeetings } = await query;
  if (!dayMeetings || dayMeetings.length < 2) return;

  const conflicts = detectMeetingConflicts(dayMeetings as Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    location?: string | null;
    location_type?: string | null;
  }>);

  // Only create insights for conflicts involving the new meeting
  const relevantConflicts = conflicts.filter(
    (c) => c.meetings.some((m) => m.id === meeting.id)
  );

  for (const conflict of relevantConflicts) {
    await createInsightWithNotification(supabase, {
      orgId,
      executiveId: meeting.executive_id || undefined,
      userId,
      insightType: 'schedule_conflict',
      title: `Scheduling Conflict: ${meeting.title}`,
      description: conflict.description,
      priority: conflict.severity === 'high' ? 'high' : 'medium',
      confidenceScore: 0.95,
      reasoning: `Detected ${conflict.type} conflict involving "${meeting.title}"`,
      suggestedActions: conflict.suggestion
        ? [{ action: 'reschedule', label: conflict.suggestion }]
        : [],
      relatedEntityId: meeting.id,
      relatedEntityType: 'meeting',
      validUntil: meeting.end_time,
    }, {
      notificationType: 'schedule_conflict',
      title: `Schedule Conflict Detected`,
      body: conflict.description,
      category: 'ai_insight',
      actionLabel: 'View Meeting',
      actionUrl: `/dashboard/calendar?meeting=${meeting.id}`,
      relatedEntityId: meeting.id,
      relatedEntityType: 'meeting',
    });
  }
}

async function checkTravelTime(
  supabase: AnySupabase,
  meeting: MeetingPayload,
  orgId: string,
  userId: string
): Promise<void> {
  // Find adjacent in-person meetings on the same day
  const meetingDate = new Date(meeting.start_time);
  const dayStart = new Date(meetingDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(meetingDate);
  dayEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from('meetings')
    .select('id, title, start_time, end_time, location, location_type')
    .eq('org_id', orgId)
    .eq('location_type', 'in_person')
    .is('deleted_at', null)
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString())
    .order('start_time', { ascending: true });

  if (meeting.executive_id) {
    query = query.eq('executive_id', meeting.executive_id);
  }

  const { data: inPersonMeetings } = await query;
  if (!inPersonMeetings || inPersonMeetings.length < 2) return;

  const travelConflicts = await checkTravelTimeBetweenMeetings(
    inPersonMeetings as Array<{
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      location?: string | null;
      location_type?: string | null;
    }>
  );

  for (const tc of travelConflicts) {
    // Only alert if this new meeting is involved
    if (tc.meetingA.id !== meeting.id && tc.meetingB.id !== meeting.id) continue;

    await createInsightWithNotification(supabase, {
      orgId,
      executiveId: meeting.executive_id || undefined,
      userId,
      insightType: 'travel_conflict',
      title: `Travel Time Alert: ${tc.meetingA.title} → ${tc.meetingB.title}`,
      description: `Only ${tc.gapMinutes} min between meetings, but travel takes ~${tc.travelMinutes} min (${tc.trafficCondition} traffic). Deficit: ${tc.deficit} min.`,
      priority: tc.deficit > 15 ? 'high' : 'medium',
      confidenceScore: 0.8,
      reasoning: `Travel from "${tc.meetingA.location}" to "${tc.meetingB.location}" with ${tc.trafficCondition} traffic`,
      suggestedActions: [
        { action: 'reschedule', label: `Suggested departure: ${new Date(tc.suggestedDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` },
        { action: 'reschedule', label: `Consider making one meeting virtual` },
      ],
      relatedEntityId: meeting.id,
      relatedEntityType: 'meeting',
      validUntil: meeting.start_time,
    }, {
      notificationType: 'travel_alert',
      title: `Travel Time Warning`,
      body: `${tc.deficit} min shortfall between "${tc.meetingA.title}" and "${tc.meetingB.title}". Consider leaving early or making one virtual.`,
      category: 'ai_insight',
      actionLabel: 'View Calendar',
      actionUrl: `/dashboard/calendar?date=${meetingDate.toISOString().split('T')[0]}`,
      relatedEntityId: meeting.id,
      relatedEntityType: 'meeting',
    });
  }
}

// ─── Task Created ─────────────────────────────────────────────

interface TaskPayload {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  executive_id?: string | null;
  org_id: string;
}

async function handleTaskCreated(event: { payload: unknown; metadata: { orgId: string; userId: string } }): Promise<void> {
  const task = event.payload as TaskPayload;
  const { orgId, userId } = event.metadata;
  const supabase = getSupabase();

  try {
    await checkForDuplicateTasks(supabase, task, orgId, userId);
  } catch (err) {
    console.error('[AI Handler] task.created error:', err);
  }
}

async function checkForDuplicateTasks(
  supabase: AnySupabase,
  newTask: TaskPayload,
  orgId: string,
  userId: string
): Promise<void> {
  // Fetch active tasks to compare against
  let query = supabase
    .from('tasks')
    .select('id, title, status, priority, category')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .not('status', 'in', '("completed","cancelled")')
    .neq('id', newTask.id)
    .limit(100);

  if (newTask.executive_id) {
    query = query.eq('executive_id', newTask.executive_id);
  }

  const { data: existingTasks } = await query;
  if (!existingTasks || existingTasks.length === 0) return;

  // Simple word-overlap similarity check
  const newWords = new Set(newTask.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));

  for (const existing of existingTasks as Array<{ id: string; title: string; status: string; priority: string; category: string }>) {
    const existingWords = new Set(existing.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
    const intersection = [...newWords].filter((w) => existingWords.has(w));
    const union = new Set([...newWords, ...existingWords]);
    const similarity = union.size > 0 ? intersection.length / union.size : 0;

    if (similarity > 0.6) {
      await createInsight(supabase, {
        orgId,
        executiveId: newTask.executive_id || undefined,
        userId,
        insightType: 'duplicate_task',
        title: `Possible Duplicate Task`,
        description: `"${newTask.title}" looks similar to existing task "${existing.title}" (${existing.status}). Similarity: ${(similarity * 100).toFixed(0)}%.`,
        priority: 'low',
        confidenceScore: similarity,
        reasoning: `Word overlap: ${intersection.join(', ')}`,
        suggestedActions: [
          { action: 'view_task', label: `Review existing task`, url: `/dashboard/tasks?task=${existing.id}` },
          { action: 'merge', label: `Consider merging these tasks` },
        ],
        relatedEntityId: newTask.id,
        relatedEntityType: 'task',
      });
      break; // Only flag the best match
    }
  }
}

// ─── Approval Created ─────────────────────────────────────────────

interface ApprovalPayload {
  id: string;
  title: string;
  approval_type: string;
  amount?: number | null;
  currency?: string | null;
  urgency?: string | null;
  executive_id?: string | null;
  org_id: string;
}

async function handleApprovalCreated(event: { payload: unknown; metadata: { orgId: string; userId: string } }): Promise<void> {
  const approval = event.payload as ApprovalPayload;
  const { orgId, userId } = event.metadata;
  const supabase = getSupabase();

  try {
    await checkApprovalAnomaly(supabase, approval, orgId, userId);
  } catch (err) {
    console.error('[AI Handler] approval.created error:', err);
  }
}

async function checkApprovalAnomaly(
  supabase: AnySupabase,
  approval: ApprovalPayload,
  orgId: string,
  userId: string
): Promise<void> {
  if (!approval.amount) return; // No amount to compare

  // Fetch historical approved amounts for this type
  const { data: historical } = await supabase
    .from('approvals')
    .select('amount')
    .eq('org_id', orgId)
    .eq('approval_type', approval.approval_type)
    .eq('status', 'approved')
    .not('amount', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!historical || historical.length < 3) return; // Not enough history

  const amounts = (historical as Array<{ amount: number | null }>)
    .map((h) => h.amount)
    .filter((a): a is number => a !== null);

  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const max = Math.max(...amounts);

  // Flag if amount is more than 2x average or exceeds historical max by 50%
  const isAnomalous = approval.amount > avg * 2 || approval.amount > max * 1.5;

  if (!isAnomalous) return;

  const ratio = (approval.amount / avg).toFixed(1);
  const currency = approval.currency || 'USD';

  await createInsightWithNotification(supabase, {
    orgId,
    executiveId: approval.executive_id || undefined,
    userId,
    insightType: 'approval_anomaly',
    title: `Unusual Approval Amount: ${approval.title}`,
    description: `$${approval.amount.toLocaleString()} ${currency} is ${ratio}x the average ($${avg.toFixed(0)} ${currency}) for ${approval.approval_type} approvals. Historical max: $${max.toLocaleString()}.`,
    priority: approval.amount > avg * 3 ? 'high' : 'medium',
    confidenceScore: Math.min(0.95, 0.7 + (amounts.length / 100)),
    reasoning: `Based on ${amounts.length} historical ${approval.approval_type} approvals. Average: $${avg.toFixed(0)}, Max: $${max.toLocaleString()}, This: $${approval.amount.toLocaleString()}`,
    suggestedActions: [
      { action: 'review', label: `Review approval carefully`, url: `/dashboard/approvals?approval=${approval.id}` },
      { action: 'context', label: `Request additional context from submitter` },
    ],
    relatedEntityId: approval.id,
    relatedEntityType: 'approval',
  }, {
    notificationType: 'approval_anomaly',
    title: `Unusual Approval Amount`,
    body: `"${approval.title}" ($${approval.amount.toLocaleString()} ${currency}) is ${ratio}x the typical amount for ${approval.approval_type} requests.`,
    category: 'ai_insight',
    actionLabel: 'Review Approval',
    actionUrl: `/dashboard/approvals?approval=${approval.id}`,
    relatedEntityId: approval.id,
    relatedEntityType: 'approval',
  });
}
