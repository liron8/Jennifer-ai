/**
 * Generation Tools
 * AI tools for content generation — meeting briefs, email drafts, summaries
 */

import { z } from 'zod';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { registerTool, type ToolResult } from './index';
import { defaultAIConfig, systemPrompts } from '../config';

const generateMeetingBriefParams = z.object({
  meetingId: z.string().uuid(),
  includeAttendeeInfo: z.boolean().default(true),
  includePreviousMeetings: z.boolean().default(true),
  includeActionItems: z.boolean().default(true),
});

const generateEmailDraftParams = z.object({
  type: z.enum(['meeting_request', 'follow_up', 'thank_you', 'reschedule', 'cancellation', 'general']),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  context: z.string().describe('Context or key points to include'),
  tone: z.enum(['formal', 'professional', 'friendly']).default('professional'),
  executiveId: z.string().uuid().optional(),
});

const generateSummaryParams = z.object({
  type: z.enum(['daily', 'weekly', 'meeting_notes']),
  date: z.string().optional().describe('Date for daily summary (YYYY-MM-DD)'),
  meetingId: z.string().uuid().optional().describe('Meeting ID for meeting notes'),
  executiveId: z.string().uuid().optional(),
});

function getModel(provider: 'anthropic' | 'openai', modelName: string) {
  return provider === 'anthropic' ? anthropic(modelName) : openai(modelName);
}

registerTool({
  name: 'generate_meeting_brief',
  description: 'Generate a comprehensive meeting brief with attendee info, context, and talking points.',
  parameters: generateMeetingBriefParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = generateMeetingBriefParams.parse(params);
    const { supabase, orgId } = context;

    // Fetch meeting details
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', validated.meetingId)
      .eq('org_id', orgId)
      .single();

    if (error || !meeting) return { success: false, error: error?.message || 'Meeting not found' };

    const sections: string[] = [
      `Meeting: ${meeting.title}`,
      `Time: ${meeting.start_time} — ${meeting.end_time}`,
      `Location: ${meeting.location || 'Not specified'} (${meeting.location_type || 'virtual'})`,
      `Description: ${meeting.description || 'None provided'}`,
    ];

    // Fetch attendee details from contacts
    const attendees = (meeting.attendees as Array<{ email?: string; name?: string }>) || [];
    if (validated.includeAttendeeInfo && attendees.length > 0) {
      const emails = attendees.map(a => a.email).filter((e): e is string => !!e);
      if (emails.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('full_name, email, company, title, category, relationship_notes, relationship_strength, last_contacted_at')
          .eq('org_id', orgId)
          .in('email', emails);

        if (contacts && contacts.length > 0) {
          sections.push(`\nAttendee Details:\n${contacts.map((c: Record<string, unknown>) =>
            `- ${c.full_name} (${c.title || 'No title'} at ${c.company || 'Unknown'}) — ${c.category || 'uncategorized'}, strength: ${c.relationship_strength ?? 'unknown'}${c.relationship_notes ? `, notes: ${c.relationship_notes}` : ''}`
          ).join('\n')}`);
        }
      }
    }

    // Fetch previous meetings with same attendees
    if (validated.includePreviousMeetings && attendees.length > 0) {
      const firstEmail = attendees[0]?.email;
      if (firstEmail) {
        const { data: pastMeetings } = await supabase
          .from('meetings')
          .select('title, start_time, description')
          .eq('org_id', orgId)
          .is('deleted_at', null)
          .neq('id', validated.meetingId)
          .lt('start_time', meeting.start_time)
          .order('start_time', { ascending: false })
          .limit(5);

        // Filter to those that contain the attendee email in JSON
        const related = (pastMeetings || []).filter((m: Record<string, unknown>) => {
          const raw = JSON.stringify(m);
          return raw.includes(firstEmail);
        });

        if (related.length > 0) {
          sections.push(`\nPrevious Meetings with These Attendees:\n${related.map((m: Record<string, unknown>) =>
            `- ${(m.start_time as string)?.split('T')[0]}: ${m.title}${m.description ? ` — ${(m.description as string).slice(0, 100)}` : ''}`
          ).join('\n')}`);
        }
      }
    }

    // Fetch related tasks
    if (validated.includeActionItems) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status, priority, due_date')
        .eq('org_id', orgId)
        .eq('related_meeting_id', validated.meetingId)
        .is('deleted_at', null);

      if (tasks && tasks.length > 0) {
        sections.push(`\nRelated Action Items:\n${tasks.map((t: Record<string, unknown>) =>
          `- [${t.priority}] ${t.title} — ${t.status}${t.due_date ? ` (due: ${t.due_date})` : ''}`
        ).join('\n')}`);
      }
    }

    // Generate brief with AI
    const config = defaultAIConfig.generation;
    const model = getModel(config.provider, config.model);

    const result = await generateText({
      model,
      system: systemPrompts.briefGenerator,
      messages: [{ role: 'user', content: `Generate a meeting brief from this data:\n\n${sections.join('\n')}` }],
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    });

    // Save brief to the meeting record
    await supabase
      .from('meetings')
      .update({ ai_meeting_brief: result.text })
      .eq('id', validated.meetingId);

    return {
      success: true,
      data: {
        meetingId: validated.meetingId,
        brief: result.text,
        message: `Meeting brief generated for "${meeting.title}"`,
      },
    };
  },
});

registerTool({
  name: 'generate_email_draft',
  description: 'Draft an email based on type and context. Matches executive communication style.',
  parameters: generateEmailDraftParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = generateEmailDraftParams.parse(params);
    const { supabase, orgId } = context;
    const execId = validated.executiveId || context.executiveId;

    // Look up recipient in contacts for context
    const { data: recipient } = await supabase
      .from('contacts')
      .select('full_name, company, title, category, relationship_notes, preferences')
      .eq('org_id', orgId)
      .eq('email', validated.recipientEmail)
      .single();

    // Get executive communication preferences
    let commPrefs: unknown = null;
    if (execId) {
      const { data: exec } = await supabase
        .from('executive_profiles')
        .select('full_name, communication_preferences')
        .eq('id', execId)
        .single();
      commPrefs = exec?.communication_preferences;
    }

    const contextParts = [
      `Email Type: ${validated.type}`,
      `Recipient: ${validated.recipientName || recipient?.full_name || validated.recipientEmail}`,
      validated.subject ? `Subject: ${validated.subject}` : null,
      `Tone: ${validated.tone}`,
      `Context: ${validated.context}`,
      recipient ? `\nRecipient Info: ${recipient.full_name} — ${recipient.title || 'No title'} at ${recipient.company || 'Unknown company'} (${recipient.category || 'uncategorized'})` : null,
      recipient?.relationship_notes ? `Relationship Notes: ${recipient.relationship_notes}` : null,
      commPrefs ? `Executive Communication Preferences: ${JSON.stringify(commPrefs)}` : null,
    ].filter(Boolean).join('\n');

    const config = defaultAIConfig.generation;
    const model = getModel(config.provider, config.model);

    const result = await generateText({
      model,
      system: `You are an email drafting assistant for executive assistants. Write emails that match the requested tone and type. Keep emails concise, professional, and appropriate for business communication. Return only the email body text (no subject line unless asked).`,
      messages: [{ role: 'user', content: `Draft an email with this context:\n\n${contextParts}` }],
      maxOutputTokens: 2048,
      temperature: 0.6,
    });

    return {
      success: true,
      data: {
        type: validated.type,
        recipientEmail: validated.recipientEmail,
        recipientName: validated.recipientName || recipient?.full_name,
        subject: validated.subject,
        draft: result.text,
        message: `Email draft generated for ${validated.recipientName || validated.recipientEmail}`,
      },
    };
  },
});

registerTool({
  name: 'generate_summary',
  description: 'Generate daily/weekly summaries or meeting notes.',
  parameters: generateSummaryParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = generateSummaryParams.parse(params);
    const { supabase, orgId } = context;
    const execId = validated.executiveId || context.executiveId;

    const dataParts: string[] = [`Summary Type: ${validated.type}`];

    if (validated.type === 'meeting_notes' && validated.meetingId) {
      // Fetch meeting for notes
      const { data: meeting } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', validated.meetingId)
        .eq('org_id', orgId)
        .single();

      if (!meeting) return { success: false, error: 'Meeting not found' };

      dataParts.push(`Meeting: ${meeting.title}`);
      dataParts.push(`Time: ${meeting.start_time} — ${meeting.end_time}`);
      dataParts.push(`Description: ${meeting.description || 'None'}`);
      dataParts.push(`Attendees: ${JSON.stringify(meeting.attendees || [])}`);
      if (meeting.ai_meeting_brief) {
        dataParts.push(`Meeting Brief: ${meeting.ai_meeting_brief}`);
      }
    } else {
      // Daily or weekly summary — fetch date range data
      const targetDate = validated.date || new Date().toISOString().split('T')[0];
      const isWeekly = validated.type === 'weekly';

      const rangeStart = new Date(targetDate);
      const rangeEnd = new Date(targetDate);
      if (isWeekly) {
        const dow = rangeStart.getDay();
        rangeStart.setDate(rangeStart.getDate() - dow);
        rangeEnd.setDate(rangeStart.getDate() + 6);
      }
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);

      // Fetch meetings in range
      let meetingQuery = supabase
        .from('meetings')
        .select('title, start_time, end_time, status, location_type, attendees')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .gte('start_time', rangeStart.toISOString())
        .lte('start_time', rangeEnd.toISOString())
        .order('start_time', { ascending: true });

      if (execId) meetingQuery = meetingQuery.eq('executive_id', execId);
      const { data: meetings } = await meetingQuery;

      // Fetch tasks completed/due in range
      let taskQuery = supabase
        .from('tasks')
        .select('title, status, priority, due_date, completed_at')
        .eq('org_id', orgId)
        .is('deleted_at', null);

      if (execId) taskQuery = taskQuery.eq('executive_id', execId);
      const { data: allTasks } = await taskQuery;

      // Filter tasks relevant to the period
      type TaskRow = { title: string; status: string; priority: string; due_date: string | null; completed_at: string | null };
      const tasks = (allTasks as TaskRow[] || []).filter((t: TaskRow) => {
        const due = t.due_date;
        const completed = t.completed_at?.split('T')[0];
        const start = rangeStart.toISOString().split('T')[0];
        const end = rangeEnd.toISOString().split('T')[0];
        return (due && due >= start && due <= end) ||
               (completed && completed >= start && completed <= end) ||
               (t.status !== 'completed' && t.status !== 'cancelled');
      });

      // Fetch pending approvals
      let approvalQuery = supabase
        .from('approvals')
        .select('title, urgency, amount, currency, status, created_at')
        .eq('org_id', orgId)
        .eq('status', 'pending');

      if (execId) approvalQuery = approvalQuery.eq('executive_id', execId);
      const { data: approvals } = await approvalQuery;

      type MeetingRow = { title: string; start_time: string; status: string; location_type: string | null };
      type ApprovalRow = { title: string; urgency: string; amount: number | null };

      dataParts.push(`Date Range: ${rangeStart.toISOString().split('T')[0]} to ${rangeEnd.toISOString().split('T')[0]}`);
      dataParts.push(`\nMeetings (${(meetings || []).length}):\n${((meetings || []) as MeetingRow[]).map((m: MeetingRow) =>
        `- ${m.start_time} ${m.title} [${m.location_type || 'virtual'}] (${m.status})`
      ).join('\n') || 'None'}`);
      dataParts.push(`\nTasks (${tasks.length}):\n${tasks.slice(0, 15).map((t: TaskRow) =>
        `- [${t.priority}] ${t.title} — ${t.status}${t.due_date ? ` (due: ${t.due_date})` : ''}`
      ).join('\n') || 'None'}`);
      dataParts.push(`\nPending Approvals (${(approvals || []).length}):\n${((approvals || []) as ApprovalRow[]).map((a: ApprovalRow) =>
        `- ${a.title} [${a.urgency}]${a.amount ? ` $${a.amount}` : ''}`
      ).join('\n') || 'None'}`);
    }

    const config = defaultAIConfig.generation;
    const model = getModel(config.provider, config.model);

    const result = await generateText({
      model,
      system: `You are a summary generator for executive assistants. Create clear, scannable summaries that highlight what matters most. Use bullet points, bold key items, and organize by priority. For daily summaries, focus on the day ahead. For weekly summaries, include highlights and carry-forward items.`,
      messages: [{ role: 'user', content: `Generate a ${validated.type} summary from this data:\n\n${dataParts.join('\n')}` }],
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    });

    return {
      success: true,
      data: {
        type: validated.type,
        date: validated.date,
        summary: result.text,
        message: `${validated.type.charAt(0).toUpperCase() + validated.type.slice(1)} summary generated`,
      },
    };
  },
});

export { generateMeetingBriefParams, generateEmailDraftParams, generateSummaryParams };
