/**
 * Pattern Learner
 * Analyzes historical data (last 4 weeks) to discover scheduling,
 * task completion, and approval patterns. Stores results in ai_patterns
 * with confidence scores that grow with sample size.
 *
 * Designed to run weekly via cron.
 */

import { createAdminClient } from '@jeniferai/core-database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

interface PatternUpsert {
  orgId: string;
  executiveId?: string;
  patternType: string;
  patternKey: string;
  patternValue: Record<string, unknown>;
  sampleSize: number;
}

/**
 * Run pattern analysis for all active organizations.
 */
export async function runPatternAnalysis(): Promise<{ orgsProcessed: number; patternsStored: number }> {
  const supabase: AnySupabase = createAdminClient();
  let patternsStored = 0;

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('is_active', true);

  if (!orgs || orgs.length === 0) return { orgsProcessed: 0, patternsStored: 0 };

  for (const org of orgs as Array<{ id: string }>) {
    try {
      // Get executives for this org
      const { data: executives } = await supabase
        .from('executive_profiles')
        .select('id')
        .eq('org_id', org.id)
        .eq('is_active', true);

      const execIds = (executives || []).map((e: { id: string }) => e.id);

      // Analyze patterns for each executive + org-wide
      for (const execId of [undefined, ...execIds]) {
        const stored = await analyzeAllPatterns(supabase, org.id, execId);
        patternsStored += stored;
      }
    } catch (err) {
      console.error(`[Pattern Learner] Failed for org ${org.id}:`, err);
    }
  }

  return { orgsProcessed: orgs.length, patternsStored };
}

async function analyzeAllPatterns(
  supabase: AnySupabase,
  orgId: string,
  executiveId?: string
): Promise<number> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  let stored = 0;

  // Run all analyses in parallel
  const [meetingPatterns, taskPatterns, approvalPatterns, schedulePatterns] = await Promise.all([
    analyzeMeetingPatterns(supabase, orgId, executiveId, fourWeeksAgo),
    analyzeTaskPatterns(supabase, orgId, executiveId, fourWeeksAgo),
    analyzeApprovalPatterns(supabase, orgId, executiveId, fourWeeksAgo),
    analyzeSchedulePatterns(supabase, orgId, executiveId, fourWeeksAgo),
  ]);

  const allPatterns = [...meetingPatterns, ...taskPatterns, ...approvalPatterns, ...schedulePatterns];

  for (const pattern of allPatterns) {
    await upsertPattern(supabase, pattern);
    stored++;
  }

  return stored;
}

// ─── Meeting Time Preferences ─────────────────────────────────────

async function analyzeMeetingPatterns(
  supabase: AnySupabase,
  orgId: string,
  executiveId: string | undefined,
  since: string
): Promise<PatternUpsert[]> {
  let query = supabase
    .from('meetings')
    .select('start_time, end_time, meeting_type, location_type')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .gte('start_time', since);

  if (executiveId) query = query.eq('executive_id', executiveId);

  const { data: meetings } = await query;
  if (!meetings || meetings.length < 5) return []; // Not enough data

  const patterns: PatternUpsert[] = [];
  const typed = meetings as Array<{
    start_time: string;
    end_time: string;
    meeting_type: string | null;
    location_type: string | null;
  }>;

  // Preferred meeting hours
  const hourCounts: Record<number, number> = {};
  const durations: number[] = [];

  for (const m of typed) {
    const hour = new Date(m.start_time).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    const durationMin = (new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / (1000 * 60);
    if (durationMin > 0 && durationMin < 480) durations.push(durationMin);
  }

  // Find peak hours (top 3)
  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));

  patterns.push({
    orgId,
    executiveId,
    patternType: 'meeting_time_preference',
    patternKey: 'preferred_hours',
    patternValue: {
      peak_hours: sortedHours,
      hour_distribution: hourCounts,
      total_meetings: typed.length,
    },
    sampleSize: typed.length,
  });

  // Average meeting duration
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    patterns.push({
      orgId,
      executiveId,
      patternType: 'meeting_duration',
      patternKey: 'avg_duration',
      patternValue: {
        average_minutes: Math.round(avgDuration),
        median_minutes: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)],
        most_common: getMostCommonDuration(durations),
      },
      sampleSize: durations.length,
    });
  }

  // Meeting type distribution
  const typeCounts: Record<string, number> = {};
  for (const m of typed) {
    const type = m.meeting_type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  patterns.push({
    orgId,
    executiveId,
    patternType: 'meeting_type_distribution',
    patternKey: 'type_breakdown',
    patternValue: {
      distribution: typeCounts,
      total: typed.length,
    },
    sampleSize: typed.length,
  });

  return patterns;
}

// ─── Task Completion Patterns ─────────────────────────────────────

async function analyzeTaskPatterns(
  supabase: AnySupabase,
  orgId: string,
  executiveId: string | undefined,
  since: string
): Promise<PatternUpsert[]> {
  let query = supabase
    .from('tasks')
    .select('title, status, priority, category, created_at, completed_at')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .gte('created_at', since);

  if (executiveId) query = query.eq('executive_id', executiveId);

  const { data: tasks } = await query;
  if (!tasks || tasks.length < 5) return [];

  const patterns: PatternUpsert[] = [];
  const typed = tasks as Array<{
    status: string;
    priority: string | null;
    category: string | null;
    created_at: string;
    completed_at: string | null;
  }>;

  // Completion rate by priority
  const priorityStats: Record<string, { total: number; completed: number; avgDaysToComplete: number[] }> = {};

  for (const t of typed) {
    const priority = t.priority || 'none';
    if (!priorityStats[priority]) {
      priorityStats[priority] = { total: 0, completed: 0, avgDaysToComplete: [] };
    }
    priorityStats[priority].total++;

    if (t.status === 'done' || t.status === 'completed') {
      priorityStats[priority].completed++;
      if (t.completed_at && t.created_at) {
        const days = (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) priorityStats[priority].avgDaysToComplete.push(days);
      }
    }
  }

  const completionByPriority: Record<string, { completion_rate: number; avg_days: number; count: number }> = {};
  for (const [priority, stats] of Object.entries(priorityStats)) {
    completionByPriority[priority] = {
      completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      avg_days: stats.avgDaysToComplete.length > 0
        ? Math.round(stats.avgDaysToComplete.reduce((a, b) => a + b, 0) / stats.avgDaysToComplete.length * 10) / 10
        : 0,
      count: stats.total,
    };
  }

  patterns.push({
    orgId,
    executiveId,
    patternType: 'task_completion',
    patternKey: 'completion_by_priority',
    patternValue: completionByPriority,
    sampleSize: typed.length,
  });

  // Category distribution
  const catCounts: Record<string, number> = {};
  for (const t of typed) {
    const cat = t.category || 'uncategorized';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  patterns.push({
    orgId,
    executiveId,
    patternType: 'task_category_distribution',
    patternKey: 'category_breakdown',
    patternValue: { distribution: catCounts, total: typed.length },
    sampleSize: typed.length,
  });

  return patterns;
}

// ─── Approval Patterns ─────────────────────────────────────

async function analyzeApprovalPatterns(
  supabase: AnySupabase,
  orgId: string,
  executiveId: string | undefined,
  since: string
): Promise<PatternUpsert[]> {
  let query = supabase
    .from('approvals')
    .select('approval_type, status, urgency, amount, currency, created_at, decided_at')
    .eq('org_id', orgId)
    .gte('created_at', since);

  if (executiveId) query = query.eq('executive_id', executiveId);

  const { data: approvals } = await query;
  if (!approvals || approvals.length < 3) return [];

  const patterns: PatternUpsert[] = [];
  const typed = approvals as Array<{
    approval_type: string;
    status: string;
    urgency: string | null;
    amount: number | null;
    currency: string | null;
    created_at: string;
    decided_at: string | null;
  }>;

  // Approval rates and turnaround by type
  const typeStats: Record<string, {
    total: number;
    approved: number;
    rejected: number;
    amounts: number[];
    turnaroundDays: number[];
  }> = {};

  for (const a of typed) {
    const type = a.approval_type;
    if (!typeStats[type]) {
      typeStats[type] = { total: 0, approved: 0, rejected: 0, amounts: [], turnaroundDays: [] };
    }
    typeStats[type].total++;

    if (a.status === 'approved') typeStats[type].approved++;
    if (a.status === 'rejected') typeStats[type].rejected++;
    if (a.amount) typeStats[type].amounts.push(a.amount);

    if (a.decided_at && a.created_at) {
      const days = (new Date(a.decided_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 90) typeStats[type].turnaroundDays.push(days);
    }
  }

  const approvalBehavior: Record<string, unknown> = {};
  for (const [type, stats] of Object.entries(typeStats)) {
    const avgAmount = stats.amounts.length > 0
      ? Math.round(stats.amounts.reduce((a, b) => a + b, 0) / stats.amounts.length)
      : null;
    const avgTurnaround = stats.turnaroundDays.length > 0
      ? Math.round(stats.turnaroundDays.reduce((a, b) => a + b, 0) / stats.turnaroundDays.length * 10) / 10
      : null;

    approvalBehavior[type] = {
      approval_rate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      rejection_rate: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
      avg_amount: avgAmount,
      avg_turnaround_days: avgTurnaround,
      count: stats.total,
    };
  }

  patterns.push({
    orgId,
    executiveId,
    patternType: 'approval_behavior',
    patternKey: 'behavior_by_type',
    patternValue: approvalBehavior,
    sampleSize: typed.length,
  });

  return patterns;
}

// ─── Schedule Habits ─────────────────────────────────────

async function analyzeSchedulePatterns(
  supabase: AnySupabase,
  orgId: string,
  executiveId: string | undefined,
  since: string
): Promise<PatternUpsert[]> {
  let query = supabase
    .from('meetings')
    .select('start_time, end_time')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .gte('start_time', since);

  if (executiveId) query = query.eq('executive_id', executiveId);

  const { data: meetings } = await query;
  if (!meetings || meetings.length < 5) return [];

  const typed = meetings as Array<{ start_time: string; end_time: string }>;

  // Group by day to find scheduling density
  const dayMeetings: Record<string, number> = {};
  const dayOfWeekCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const m of typed) {
    const date = m.start_time.split('T')[0];
    dayMeetings[date] = (dayMeetings[date] || 0) + 1;

    const dow = new Date(m.start_time).getDay();
    dayOfWeekCounts[dow]++;
  }

  const dailyCounts = Object.values(dayMeetings);
  const maxPerDay = Math.max(...dailyCounts, 0);
  const avgPerDay = dailyCounts.length > 0
    ? Math.round(dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length * 10) / 10
    : 0;

  // Find buffer times (gaps between consecutive meetings)
  const sortedMeetings = [...typed].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const buffers: number[] = [];

  for (let i = 0; i < sortedMeetings.length - 1; i++) {
    const end = new Date(sortedMeetings[i].end_time).getTime();
    const nextStart = new Date(sortedMeetings[i + 1].start_time).getTime();
    // Only count same-day gaps
    if (sortedMeetings[i].start_time.split('T')[0] === sortedMeetings[i + 1].start_time.split('T')[0]) {
      const gap = (nextStart - end) / (1000 * 60);
      if (gap >= 0 && gap < 480) buffers.push(gap);
    }
  }

  const avgBuffer = buffers.length > 0
    ? Math.round(buffers.reduce((a, b) => a + b, 0) / buffers.length)
    : 0;

  // Day of week names
  const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiestDays = Object.entries(dayOfWeekCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dow, count]) => ({ day: dowNames[parseInt(dow)], count }));

  return [{
    orgId,
    executiveId,
    patternType: 'schedule_habits',
    patternKey: 'density_and_buffers',
    patternValue: {
      avg_meetings_per_day: avgPerDay,
      max_meetings_per_day: maxPerDay,
      avg_buffer_minutes: avgBuffer,
      busiest_days: busiestDays,
      day_of_week_distribution: Object.fromEntries(
        Object.entries(dayOfWeekCounts).map(([dow, count]) => [dowNames[parseInt(dow)], count])
      ),
      total_meetings: typed.length,
      days_analyzed: dailyCounts.length,
    },
    sampleSize: typed.length,
  }];
}

// ─── Helpers ─────────────────────────────────────

function getMostCommonDuration(durations: number[]): number {
  // Round to nearest 15 minutes
  const rounded = durations.map((d) => Math.round(d / 15) * 15);
  const counts: Record<number, number> = {};
  for (const d of rounded) {
    counts[d] = (counts[d] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? parseInt(sorted[0][0]) : 30;
}

/**
 * Upsert a pattern into the ai_patterns table.
 * If a matching pattern (org + exec + type + key) exists, update it;
 * otherwise insert a new one.
 */
async function upsertPattern(supabase: AnySupabase, pattern: PatternUpsert): Promise<void> {
  const now = new Date().toISOString();
  const confidence = calculateConfidence(pattern.sampleSize);

  // Try to find existing pattern
  let query = supabase
    .from('ai_patterns')
    .select('id, first_observed_at')
    .eq('org_id', pattern.orgId)
    .eq('pattern_type', pattern.patternType)
    .eq('pattern_key', pattern.patternKey);

  if (pattern.executiveId) {
    query = query.eq('executive_id', pattern.executiveId);
  } else {
    query = query.is('executive_id', null);
  }

  const { data: existing } = await query.limit(1);

  if (existing && existing.length > 0) {
    // Update existing pattern
    await supabase
      .from('ai_patterns')
      .update({
        pattern_value: pattern.patternValue,
        sample_size: pattern.sampleSize,
        confidence_score: confidence,
        last_observed_at: now,
        updated_at: now,
        is_active: true,
      })
      .eq('id', (existing[0] as { id: string }).id);
  } else {
    // Insert new pattern
    await supabase
      .from('ai_patterns')
      .insert({
        org_id: pattern.orgId,
        executive_id: pattern.executiveId || null,
        pattern_type: pattern.patternType,
        pattern_key: pattern.patternKey,
        pattern_value: pattern.patternValue,
        sample_size: pattern.sampleSize,
        confidence_score: confidence,
        first_observed_at: now,
        last_observed_at: now,
        is_active: true,
      });
  }
}

/**
 * Confidence grows logarithmically with sample size:
 * 5 samples → 0.50, 10 → 0.65, 20 → 0.75, 50 → 0.85, 100+ → 0.95
 */
function calculateConfidence(sampleSize: number): number {
  if (sampleSize <= 0) return 0;
  const raw = 0.3 + 0.15 * Math.log2(sampleSize);
  return Math.min(0.95, Math.max(0.1, Math.round(raw * 100) / 100));
}
