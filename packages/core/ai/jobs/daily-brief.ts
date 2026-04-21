/**
 * Daily Brief Generator
 * Runs each morning to generate a comprehensive daily briefing
 * for each active executive, covering schedule, tasks, approvals, and key dates.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createAdminClient } from '@jeniferai/core-database';
import { defaultAIConfig, systemPrompts } from '../config';
import { createInsightWithNotification } from '../handlers/insight-creator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

interface BriefContext {
  orgId: string;
  orgName: string;
  executiveId: string;
  executiveName: string;
  timezone: string;
}

/**
 * Generate daily briefs for all active executives across all organizations.
 */
export async function runDailyBriefs(): Promise<{ orgsProcessed: number; briefsGenerated: number }> {
  const supabase: AnySupabase = createAdminClient();
  let briefsGenerated = 0;

  // Get all active organizations
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('is_active', true);

  if (!orgs || orgs.length === 0) return { orgsProcessed: 0, briefsGenerated: 0 };

  for (const org of orgs as Array<{ id: string; name: string }>) {
    // Get active executives for this org
    const { data: executives } = await supabase
      .from('executive_profiles')
      .select('id, full_name, timezone')
      .eq('org_id', org.id)
      .eq('is_active', true);

    if (!executives) continue;

    for (const exec of executives as Array<{ id: string; full_name: string; timezone: string }>) {
      try {
        const generated = await generateBriefForExecutive(supabase, {
          orgId: org.id,
          orgName: org.name,
          executiveId: exec.id,
          executiveName: exec.full_name,
          timezone: exec.timezone || 'America/New_York',
        });
        if (generated) briefsGenerated++;
      } catch (err) {
        console.error(`[Daily Brief] Failed for executive ${exec.id}:`, err);
      }
    }
  }

  return { orgsProcessed: orgs.length, briefsGenerated };
}

async function generateBriefForExecutive(
  supabase: AnySupabase,
  ctx: BriefContext
): Promise<boolean> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch all data in parallel
  const [meetings, tasks, approvals, keyDates] = await Promise.all([
    supabase
      .from('meetings')
      .select('title, start_time, end_time, location, location_type, meeting_type, attendees, status')
      .eq('org_id', ctx.orgId)
      .eq('executive_id', ctx.executiveId)
      .is('deleted_at', null)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time', { ascending: true })
      .then((r: { data: unknown }) => r.data || []),

    supabase
      .from('tasks')
      .select('title, status, priority, category, due_date')
      .eq('org_id', ctx.orgId)
      .eq('executive_id', ctx.executiveId)
      .is('deleted_at', null)
      .not('status', 'in', '("completed","cancelled")')
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(15)
      .then((r: { data: unknown }) => r.data || []),

    supabase
      .from('approvals')
      .select('title, approval_type, urgency, amount, currency, due_date')
      .eq('org_id', ctx.orgId)
      .eq('executive_id', ctx.executiveId)
      .eq('status', 'pending')
      .order('urgency', { ascending: false })
      .limit(10)
      .then((r: { data: unknown }) => r.data || []),

    supabase
      .from('key_dates')
      .select('title, date, category, related_person')
      .eq('org_id', ctx.orgId)
      .eq('executive_id', ctx.executiveId)
      .gte('date', now.toISOString().split('T')[0])
      .lte('date', sevenDaysOut.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(10)
      .then((r: { data: unknown }) => r.data || []),
  ]);

  const dataStr = [
    `Executive: ${ctx.executiveName}`,
    `Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Timezone: ${ctx.timezone}`,
    '',
    `Today's Meetings (${(meetings as unknown[]).length}):`,
    JSON.stringify(meetings, null, 2),
    '',
    `Pending Tasks (${(tasks as unknown[]).length}):`,
    JSON.stringify(tasks, null, 2),
    '',
    `Pending Approvals (${(approvals as unknown[]).length}):`,
    JSON.stringify(approvals, null, 2),
    '',
    `Upcoming Key Dates (next 7 days, ${(keyDates as unknown[]).length}):`,
    JSON.stringify(keyDates, null, 2),
  ].join('\n');

  const config = defaultAIConfig.generation;

  const result = await generateText({
    model: anthropic(config.model),
    system: systemPrompts.briefGenerator,
    messages: [{
      role: 'user' as const,
      content: `Generate a comprehensive daily briefing for ${ctx.executiveName}:\n\n${dataStr}`,
    }],
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
  });

  if (!result.text) return false;

  // Save as an AI insight with notification
  await createInsightWithNotification(supabase, {
    orgId: ctx.orgId,
    executiveId: ctx.executiveId,
    insightType: 'daily_brief',
    title: `Daily Briefing — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    description: result.text,
    priority: 'medium',
    confidenceScore: 1.0,
    reasoning: `Auto-generated daily brief with ${(meetings as unknown[]).length} meetings, ${(tasks as unknown[]).length} tasks, ${(approvals as unknown[]).length} approvals`,
    validUntil: todayEnd.toISOString(),
  }, {
    notificationType: 'daily_brief',
    title: `Good morning — your daily briefing is ready`,
    body: `${(meetings as unknown[]).length} meetings, ${(tasks as unknown[]).length} pending tasks, ${(approvals as unknown[]).length} approvals need attention.`,
    category: 'daily_brief',
    actionLabel: 'View Briefing',
    actionUrl: '/dashboard',
  });

  return true;
}
