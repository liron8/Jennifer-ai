/**
 * Key Date Scanner
 * Runs daily to find upcoming key dates (birthdays, anniversaries, etc.)
 * and create proactive reminders with suggested actions.
 */

import { createAdminClient } from '@jeniferai/core-database';
import { createInsightWithNotification } from '../handlers/insight-creator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

interface KeyDateRow {
  id: string;
  title: string;
  date: string;
  category: string | null;
  related_person: string | null;
  related_contact_id: string | null;
  reminder_days: number | null;
  description: string | null;
  executive_id: string | null;
}

/**
 * Scan for upcoming key dates across all organizations and create reminders.
 */
export async function runKeyDateScan(): Promise<{ orgsProcessed: number; remindersCreated: number }> {
  const supabase: AnySupabase = createAdminClient();
  let remindersCreated = 0;

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('is_active', true);

  if (!orgs || orgs.length === 0) return { orgsProcessed: 0, remindersCreated: 0 };

  for (const org of orgs as Array<{ id: string }>) {
    try {
      const created = await scanKeyDatesForOrg(supabase, org.id);
      remindersCreated += created;
    } catch (err) {
      console.error(`[Key Date Scanner] Failed for org ${org.id}:`, err);
    }
  }

  return { orgsProcessed: orgs.length, remindersCreated };
}

async function scanKeyDatesForOrg(supabase: AnySupabase, orgId: string): Promise<number> {
  const now = new Date();
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];

  // Find key dates in the next 14 days
  const { data: keyDates } = await supabase
    .from('key_dates')
    .select('id, title, date, category, related_person, related_contact_id, reminder_days, description, executive_id')
    .eq('org_id', orgId)
    .gte('date', today)
    .lte('date', fourteenDaysOut.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (!keyDates || keyDates.length === 0) return 0;

  let created = 0;

  for (const kd of keyDates as KeyDateRow[]) {
    const daysUntil = Math.ceil(
      (new Date(kd.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const reminderDays = kd.reminder_days || 7;

    // Only create reminder if within the reminder window
    if (daysUntil > reminderDays) continue;

    // Check if we already created a reminder for this key date
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('org_id', orgId)
      .eq('insight_type', 'key_date_reminder')
      .eq('related_entity_id', kd.id)
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) continue; // Already reminded

    const suggestions = buildSuggestions(kd, daysUntil);
    const urgency = daysUntil <= 1 ? 'high' : daysUntil <= 3 ? 'medium' : 'low';

    const personNote = kd.related_person ? ` for ${kd.related_person}` : '';
    const categoryNote = kd.category ? ` [${kd.category}]` : '';
    const daysNote = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

    await createInsightWithNotification(supabase, {
      orgId,
      executiveId: kd.executive_id || undefined,
      insightType: 'key_date_reminder',
      title: `${daysNote}: ${kd.title}${personNote}`,
      description: `${kd.title}${categoryNote}${personNote} is ${daysNote.toLowerCase()} (${kd.date}).${kd.description ? ` Note: ${kd.description}` : ''}`,
      priority: urgency,
      confidenceScore: 1.0,
      suggestedActions: suggestions,
      relatedEntityId: kd.id,
      relatedEntityType: 'key_date',
      validUntil: new Date(kd.date + 'T23:59:59Z').toISOString(),
    }, {
      notificationType: 'key_date_reminder',
      title: `${daysNote}: ${kd.title}${personNote}`,
      body: `${kd.category || 'Key date'}${personNote} — ${kd.date}. ${suggestions.length > 0 ? suggestions[0].label : ''}`,
      category: 'key_date',
      actionLabel: 'View Key Dates',
      actionUrl: '/dashboard/key-dates',
      relatedEntityId: kd.id,
      relatedEntityType: 'key_date',
    });

    created++;
  }

  return created;
}

function buildSuggestions(
  kd: KeyDateRow,
  daysUntil: number
): Array<{ action: string; label: string }> {
  const suggestions: Array<{ action: string; label: string }> = [];
  const category = (kd.category || '').toLowerCase();

  if (category === 'birthday') {
    if (daysUntil >= 3) {
      suggestions.push({ action: 'gift', label: 'Order a birthday gift' });
    }
    suggestions.push({ action: 'card', label: 'Send a birthday card or message' });
    if (daysUntil <= 1) {
      suggestions.push({ action: 'call', label: 'Schedule a birthday call' });
    }
  } else if (category === 'anniversary' || category === 'work_anniversary') {
    suggestions.push({ action: 'acknowledge', label: 'Send congratulations' });
    if (daysUntil >= 3) {
      suggestions.push({ action: 'gift', label: 'Arrange a gift or celebration' });
    }
  } else if (category === 'holiday') {
    suggestions.push({ action: 'greetings', label: 'Send holiday greetings' });
  } else if (category === 'deadline') {
    suggestions.push({ action: 'review', label: 'Review status and prep materials' });
    if (daysUntil <= 2) {
      suggestions.push({ action: 'escalate', label: 'Verify everything is on track' });
    }
  } else {
    // Generic suggestions
    suggestions.push({ action: 'prepare', label: `Prepare for ${kd.title}` });
    if (kd.related_person) {
      suggestions.push({ action: 'reach_out', label: `Reach out to ${kd.related_person}` });
    }
  }

  return suggestions;
}
