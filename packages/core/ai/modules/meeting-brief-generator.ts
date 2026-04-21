/**
 * Meeting Brief Generator
 * Orchestrates data gathering + AI generation for rich meeting briefs.
 * Fetches meeting, attendees from contacts, past meetings, related tasks,
 * and key dates — then calls generateText() for a structured brief.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@jeniferai/core-database';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { defaultAIConfig, systemPrompts } from '../config';

export interface BriefResult {
  meetingId: string;
  meetingTitle: string;
  brief: string;
  attendeeCount: number;
  relatedTaskCount: number;
  pastMeetingCount: number;
}

/**
 * Generate a comprehensive meeting brief.
 */
export async function generateBrief(
  supabase: SupabaseClient<Database>,
  meetingId: string,
  orgId: string
): Promise<BriefResult> {
  // Fetch meeting
  const { data: meeting, error } = await (supabase as any)
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('org_id', orgId)
    .single();

  if (error || !meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  const sections: string[] = [
    `# Meeting Brief: ${meeting.title}`,
    `**Time:** ${formatDateTime(meeting.start_time)} — ${formatDateTime(meeting.end_time)}`,
    `**Location:** ${meeting.location || 'Not specified'} (${meeting.location_type || 'virtual'})`,
    `**Type:** ${meeting.meeting_type || 'General'}`,
    meeting.description ? `**Description:** ${meeting.description}` : '',
  ];

  // Gather attendee info
  const attendees = (meeting.attendees as Array<{ email?: string; name?: string }>) || [];
  const emails = attendees.map(a => a.email).filter((e): e is string => !!e);
  let contactCount = 0;

  if (emails.length > 0) {
    const { data: contacts } = await (supabase as any)
      .from('contacts')
      .select('full_name, email, company, title, category, relationship_notes, relationship_strength, last_contacted_at')
      .eq('org_id', orgId)
      .in('email', emails);

    if (contacts && contacts.length > 0) {
      contactCount = contacts.length;
      sections.push('\n## Attendees');
      for (const c of contacts) {
        const lastContact = c.last_contacted_at
          ? `last contact: ${c.last_contacted_at.split('T')[0]}`
          : 'no prior contact on record';
        sections.push(
          `- **${c.full_name}** — ${c.title || 'No title'} at ${c.company || 'Unknown'} ` +
          `(${c.category || 'uncategorized'}, strength: ${c.relationship_strength ?? '?'}/10, ${lastContact})` +
          (c.relationship_notes ? `\n  _Notes: ${c.relationship_notes}_` : '')
        );
      }

      // Note any attendees NOT found in contacts
      const foundEmails = new Set(contacts.map((c: Record<string, unknown>) => c.email));
      const unknown = attendees.filter(a => a.email && !foundEmails.has(a.email));
      if (unknown.length > 0) {
        sections.push(`- _${unknown.length} attendee(s) not in contacts: ${unknown.map(u => u.name || u.email).join(', ')}_`);
      }
    }
  }

  // Fetch past meetings with overlapping attendees
  let pastMeetingCount = 0;
  if (emails.length > 0) {
    // Use a simple approach: search for meetings that mention the first attendee email
    const { data: pastMeetings } = await (supabase as any)
      .from('meetings')
      .select('title, start_time, description, status')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .neq('id', meetingId)
      .lt('start_time', meeting.start_time)
      .order('start_time', { ascending: false })
      .limit(10);

    // Filter to those mentioning any attendee email
    const related = (pastMeetings || []).filter((m: Record<string, unknown>) => {
      const raw = JSON.stringify(m);
      return emails.some(e => raw.includes(e));
    }).slice(0, 5);

    if (related.length > 0) {
      pastMeetingCount = related.length;
      sections.push('\n## Previous Meetings with These Attendees');
      for (const m of related) {
        sections.push(
          `- **${(m.start_time as string).split('T')[0]}:** ${m.title}` +
          (m.description ? ` — ${(m.description as string).slice(0, 120)}` : '')
        );
      }
    }
  }

  // Fetch related tasks
  const { data: tasks } = await (supabase as any)
    .from('tasks')
    .select('title, status, priority, due_date, description')
    .eq('org_id', orgId)
    .eq('related_meeting_id', meetingId)
    .is('deleted_at', null);

  const relatedTaskCount = (tasks || []).length;
  if (relatedTaskCount > 0) {
    sections.push('\n## Related Action Items');
    for (const t of tasks) {
      sections.push(
        `- [${t.priority}] **${t.title}** — ${t.status}` +
        (t.due_date ? ` (due: ${t.due_date})` : '') +
        (t.description ? `\n  ${t.description.slice(0, 100)}` : '')
      );
    }
  }

  // Fetch upcoming key dates for attendees' contacts
  if (emails.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: keyDates } = await (supabase as any)
      .from('key_dates')
      .select('title, date, category, related_person')
      .eq('org_id', orgId)
      .gte('date', today)
      .lte('date', twoWeeksOut)
      .limit(5);

    if (keyDates && keyDates.length > 0) {
      sections.push('\n## Upcoming Key Dates (for context)');
      for (const kd of keyDates) {
        sections.push(`- **${kd.date}:** ${kd.title} [${kd.category}]${kd.related_person ? ` — ${kd.related_person}` : ''}`);
      }
    }
  }

  // Generate the final brief using AI
  const config = defaultAIConfig.generation;
  const model = anthropic(config.model);

  const result = await generateText({
    model,
    system: systemPrompts.briefGenerator,
    messages: [{
      role: 'user' as const,
      content: `Generate a polished meeting brief from this raw data. Synthesize the information into a coherent, scannable brief with talking points and preparation notes:\n\n${sections.join('\n')}`,
    }],
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
  });

  // Persist the brief
  await (supabase as any)
    .from('meetings')
    .update({ ai_meeting_brief: result.text })
    .eq('id', meetingId);

  return {
    meetingId,
    meetingTitle: meeting.title,
    brief: result.text,
    attendeeCount: contactCount,
    relatedTaskCount,
    pastMeetingCount,
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
