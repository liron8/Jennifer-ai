/**
 * Context Builder
 * Builds rich context for AI interactions by querying real data from Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@jeniferai/core-database';
import type { AIContext, AIPattern } from '@jeniferai/types';

export interface ContextBuilderOptions {
  userId: string;
  orgId: string;
  executiveId?: string;
  timezone: string;
  supabase: SupabaseClient<Database>;
  includePatterns?: boolean;
  includeTemporal?: boolean;
}

export async function buildContext(options: ContextBuilderOptions): Promise<AIContext> {
  const {
    supabase,
    userId,
    orgId,
    executiveId,
    timezone,
    includePatterns = true,
    includeTemporal = true,
  } = options;

  // Fetch all context data in parallel for speed
  const [userData, orgData, executiveData, temporalData, patterns] = await Promise.all([
    fetchUser(supabase, userId),
    fetchOrganization(supabase, orgId),
    executiveId ? fetchExecutive(supabase, executiveId) : Promise.resolve(undefined),
    includeTemporal
      ? fetchTemporalContext(supabase, orgId, executiveId, timezone)
      : Promise.resolve(null),
    includePatterns
      ? fetchPatterns(supabase, orgId, executiveId)
      : Promise.resolve([]),
  ]);

  return {
    user: userData,
    organization: orgData,
    executive: executiveData,
    temporal: temporalData || {
      current_time: new Date().toISOString(),
      timezone,
      todays_meetings: [],
      upcoming_tasks: [],
      pending_approvals: [],
      upcoming_key_dates: [],
    },
    patterns: patterns.length > 0 ? patterns : undefined,
  };
}

async function fetchUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AIContext['user']> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, timezone')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { id: userId, full_name: 'User', timezone: 'UTC' };
  }

  return {
    id: data.id,
    full_name: data.full_name ?? undefined,
    timezone: data.timezone || 'UTC',
  };
}

async function fetchOrganization(
  supabase: SupabaseClient<Database>,
  orgId: string
): Promise<AIContext['organization']> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, ai_settings')
    .eq('id', orgId)
    .single();

  if (error || !data) {
    return { id: orgId, name: 'Organization', ai_settings: {} };
  }

  return {
    id: data.id,
    name: data.name,
    ai_settings: (data.ai_settings as Record<string, unknown>) || {},
  };
}

async function fetchExecutive(
  supabase: SupabaseClient<Database>,
  executiveId: string
): Promise<AIContext['executive'] | undefined> {
  const { data, error } = await supabase
    .from('executive_profiles')
    .select('id, full_name, title, scheduling_preferences, travel_preferences, dietary_preferences, communication_preferences, gift_preferences, office_address, home_address, timezone')
    .eq('id', executiveId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return undefined;
  }

  return {
    id: data.id,
    full_name: data.full_name,
    preferences: {
      scheduling: data.scheduling_preferences,
      travel: data.travel_preferences,
      dietary: data.dietary_preferences,
      communication: data.communication_preferences,
      gift: data.gift_preferences,
      office_address: data.office_address,
      home_address: data.home_address,
      timezone: data.timezone,
    },
  };
}

async function fetchTemporalContext(
  supabase: SupabaseClient<Database>,
  orgId: string,
  executiveId: string | undefined,
  timezone: string
): Promise<AIContext['temporal']> {
  const now = new Date();

  // Calculate today's date range in the user's timezone
  // We use a broad range (start of today to end of today in UTC) to catch all meetings
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // 30 days from now for key dates
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [meetings, tasks, approvals, keyDates] = await Promise.all([
    fetchTodaysMeetings(supabase, orgId, executiveId, todayStart, todayEnd),
    fetchUpcomingTasks(supabase, orgId, executiveId),
    fetchPendingApprovals(supabase, orgId, executiveId),
    fetchUpcomingKeyDates(supabase, orgId, executiveId, thirtyDaysOut),
  ]);

  return {
    current_time: now.toISOString(),
    timezone,
    todays_meetings: meetings,
    upcoming_tasks: tasks,
    pending_approvals: approvals,
    upcoming_key_dates: keyDates,
  };
}

async function fetchTodaysMeetings(
  supabase: SupabaseClient<Database>,
  orgId: string,
  executiveId: string | undefined,
  todayStart: Date,
  todayEnd: Date
): Promise<unknown[]> {
  let query = supabase
    .from('meetings')
    .select('id, title, start_time, end_time, location, location_type, location_details, attendees, meeting_type, status, description')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true });

  if (executiveId) {
    query = query.eq('executive_id', executiveId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch today\'s meetings:', error.message);
    return [];
  }
  return data || [];
}

async function fetchUpcomingTasks(
  supabase: SupabaseClient<Database>,
  orgId: string,
  executiveId: string | undefined
): Promise<unknown[]> {
  let query = supabase
    .from('tasks')
    .select('id, title, status, priority, category, due_date, due_time, assigned_to, executive_id')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .not('status', 'in', '("completed","cancelled")')
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(20);

  if (executiveId) {
    query = query.eq('executive_id', executiveId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch upcoming tasks:', error.message);
    return [];
  }
  return data || [];
}

async function fetchPendingApprovals(
  supabase: SupabaseClient<Database>,
  orgId: string,
  executiveId: string | undefined
): Promise<unknown[]> {
  let query = supabase
    .from('approvals')
    .select('id, title, approval_type, urgency, amount, currency, due_date, submitted_by, created_at')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (executiveId) {
    query = query.eq('executive_id', executiveId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch pending approvals:', error.message);
    return [];
  }
  return data || [];
}

async function fetchUpcomingKeyDates(
  supabase: SupabaseClient<Database>,
  orgId: string,
  executiveId: string | undefined,
  untilDate: Date
): Promise<unknown[]> {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('key_dates')
    .select('id, title, date, category, related_person, related_contact_id, related_family_member_id, reminder_days, description')
    .eq('org_id', orgId)
    .gte('date', today)
    .lte('date', untilDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(15);

  if (executiveId) {
    query = query.eq('executive_id', executiveId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch upcoming key dates:', error.message);
    return [];
  }
  return data || [];
}

async function fetchPatterns(
  supabase: SupabaseClient<Database>,
  orgId: string,
  executiveId: string | undefined
): Promise<AIPattern[]> {
  let query = supabase
    .from('ai_patterns')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('confidence_score', { ascending: false })
    .limit(20);

  if (executiveId) {
    query = query.eq('executive_id', executiveId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch patterns:', error.message);
    return [];
  }

  // Map DB rows to AIPattern type
  type PatternRow = Database['public']['Tables']['ai_patterns']['Row'];
  return ((data || []) as PatternRow[]).map((row) => ({
    id: row.id,
    org_id: row.org_id,
    executive_id: row.executive_id ?? undefined,
    pattern_type: row.pattern_type as AIPattern['pattern_type'],
    pattern_data: (row.pattern_value as Record<string, unknown>) || {},
    confidence: row.confidence_score ?? 0,
    sample_count: row.sample_size ?? 0,
    last_updated_at: row.last_observed_at || row.created_at || '',
    created_at: row.created_at || '',
  }));
}

/**
 * Format the AI context into a structured prompt string
 * that gives the AI model a rich picture of the current situation.
 */
export function formatContextForPrompt(context: AIContext): string {
  const lines: string[] = [];

  // Time and user
  lines.push(`Current Time: ${context.temporal.current_time}`);
  lines.push(`Timezone: ${context.temporal.timezone}`);
  lines.push(`User: ${context.user.full_name || 'Unknown'}`);

  // Executive info
  if (context.executive) {
    lines.push('');
    lines.push(`## Executive: ${context.executive.full_name}`);
    const prefs = context.executive.preferences;
    if (prefs.scheduling) {
      lines.push(`Scheduling Preferences: ${JSON.stringify(prefs.scheduling)}`);
    }
    if (prefs.communication) {
      lines.push(`Communication Style: ${JSON.stringify(prefs.communication)}`);
    }
    if (prefs.office_address) {
      lines.push(`Office: ${prefs.office_address}`);
    }
  }

  // Today's schedule
  lines.push('');
  const meetings = context.temporal.todays_meetings as Array<{
    title?: string;
    start_time?: string;
    end_time?: string;
    location_type?: string;
    location?: string;
    status?: string;
  }>;

  if (meetings.length > 0) {
    lines.push(`## Today's Schedule (${meetings.length} meetings)`);
    for (const m of meetings) {
      const startTime = m.start_time ? new Date(m.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '?';
      const endTime = m.end_time ? new Date(m.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '?';
      const location = m.location ? ` @ ${m.location}` : '';
      const locType = m.location_type ? ` [${m.location_type}]` : '';
      lines.push(`- ${startTime}–${endTime}: ${m.title || 'Untitled'}${locType}${location}`);
    }
  } else {
    lines.push('## Today\'s Schedule: No meetings scheduled');
  }

  // Upcoming tasks
  const tasks = context.temporal.upcoming_tasks as Array<{
    title?: string;
    priority?: string;
    status?: string;
    due_date?: string;
  }>;

  if (tasks.length > 0) {
    lines.push('');
    lines.push(`## Pending Tasks (${tasks.length})`);
    for (const t of tasks.slice(0, 10)) {
      const priority = t.priority ? `[${t.priority}]` : '';
      const due = t.due_date ? ` (due: ${t.due_date})` : '';
      lines.push(`- ${priority} ${t.title || 'Untitled'} — ${t.status || 'open'}${due}`);
    }
    if (tasks.length > 10) {
      lines.push(`  ... and ${tasks.length - 10} more`);
    }
  }

  // Pending approvals
  const approvals = context.temporal.pending_approvals as Array<{
    title?: string;
    urgency?: string;
    amount?: number;
    currency?: string;
    due_date?: string;
  }>;

  if (approvals.length > 0) {
    lines.push('');
    lines.push(`## Pending Approvals (${approvals.length})`);
    for (const a of approvals) {
      const amount = a.amount ? ` — $${a.amount.toLocaleString()} ${a.currency || 'USD'}` : '';
      const urgency = a.urgency ? ` [${a.urgency}]` : '';
      const due = a.due_date ? ` (due: ${a.due_date})` : '';
      lines.push(`- ${a.title || 'Untitled'}${urgency}${amount}${due}`);
    }
  }

  // Upcoming key dates
  const keyDates = context.temporal.upcoming_key_dates as Array<{
    title?: string;
    date?: string;
    category?: string;
    related_person?: string;
  }>;

  if (keyDates.length > 0) {
    lines.push('');
    lines.push(`## Upcoming Key Dates (next 30 days)`);
    for (const kd of keyDates.slice(0, 8)) {
      const person = kd.related_person ? ` — ${kd.related_person}` : '';
      const cat = kd.category ? ` [${kd.category}]` : '';
      lines.push(`- ${kd.date}: ${kd.title || 'Untitled'}${cat}${person}`);
    }
  }

  // Learned patterns
  if (context.patterns && context.patterns.length > 0) {
    lines.push('');
    lines.push('## Known Patterns');
    for (const p of context.patterns.slice(0, 5)) {
      lines.push(`- ${p.pattern_type}: ${JSON.stringify(p.pattern_data)} (confidence: ${(p.confidence * 100).toFixed(0)}%)`);
    }
  }

  return lines.join('\n');
}
