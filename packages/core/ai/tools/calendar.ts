/**
 * Calendar Tools
 * AI tools for calendar and meeting management — wired to real Supabase data
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const getMeetingsParams = z.object({
  date: z.string().optional().describe('Date in YYYY-MM-DD format, defaults to today'),
  executiveId: z.string().uuid().optional().describe('Filter by executive'),
  range: z.enum(['day', 'week', 'month']).default('day').describe('Time range to fetch'),
});

const createMeetingParams = z.object({
  title: z.string().describe('Meeting title'),
  startTime: z.string().describe('Start time in ISO format'),
  endTime: z.string().describe('End time in ISO format'),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).optional().describe('List of attendees'),
  location: z.string().optional().describe('Meeting location'),
  locationType: z.enum(['virtual', 'in_person', 'phone', 'hybrid']).default('virtual'),
  description: z.string().optional().describe('Meeting description'),
  executiveId: z.string().uuid().optional().describe('Associated executive'),
});

const checkAvailabilityParams = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format'),
  startTime: z.string().optional().describe('Start of time window (HH:MM)'),
  endTime: z.string().optional().describe('End of time window (HH:MM)'),
  duration: z.number().min(15).max(480).describe('Required duration in minutes'),
  executiveId: z.string().uuid().optional().describe('Check for specific executive'),
});

const rescheduleMeetingParams = z.object({
  meetingId: z.string().uuid().describe('ID of meeting to reschedule'),
  newStartTime: z.string().describe('New start time in ISO format'),
  newEndTime: z.string().describe('New end time in ISO format'),
  notifyAttendees: z.boolean().default(true).describe('Send notifications to attendees'),
});

registerTool({
  name: 'get_meetings',
  description: 'Retrieve meetings for a specific date or range. Use this to check the schedule.',
  parameters: getMeetingsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getMeetingsParams.parse(params);
    const { supabase, orgId } = context;

    const targetDate = validated.date || new Date().toISOString().split('T')[0];
    const { startOfRange, endOfRange } = getDateRange(targetDate, validated.range);

    let query = supabase
      .from('meetings')
      .select('id, title, start_time, end_time, location, location_type, location_details, attendees, meeting_type, status, description')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .gte('start_time', startOfRange)
      .lte('start_time', endOfRange)
      .order('start_time', { ascending: true });

    const execId = validated.executiveId || context.executiveId;
    if (execId) {
      query = query.eq('executive_id', execId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { meetings: data || [], count: data?.length || 0, date: targetDate, range: validated.range },
    };
  },
});

registerTool({
  name: 'create_meeting',
  description: 'Schedule a new meeting. Automatically checks for conflicts.',
  parameters: createMeetingParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = createMeetingParams.parse(params);
    const { supabase, orgId, userId } = context;
    const execId = validated.executiveId || context.executiveId;

    // Check for overlapping meetings
    let conflictQuery = supabase
      .from('meetings')
      .select('id, title, start_time, end_time')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .lt('start_time', validated.endTime)
      .gt('end_time', validated.startTime);

    if (execId) {
      conflictQuery = conflictQuery.eq('executive_id', execId);
    }

    const { data: overlapping } = await conflictQuery;
    const conflicts = (overlapping || []).map((m: { id: string; title: string; start_time: string; end_time: string }) => ({
      id: m.id, title: m.title, time: `${m.start_time} - ${m.end_time}`,
    }));

    // Create the meeting
    const { data, error } = await supabase.from('meetings').insert({
      org_id: orgId,
      title: validated.title,
      start_time: validated.startTime,
      end_time: validated.endTime,
      attendees: validated.attendees as any,
      location: validated.location,
      location_type: validated.locationType,
      description: validated.description,
      executive_id: execId,
      created_by: userId,
      status: 'scheduled',
    }).select('id, title, start_time, end_time').single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        meeting: data,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        warning: conflicts.length > 0
          ? `Created with ${conflicts.length} conflict(s): ${conflicts.map(c => c.title).join(', ')}`
          : undefined,
      },
    };
  },
});

registerTool({
  name: 'check_availability',
  description: 'Find available time slots on a given date. Returns open windows.',
  parameters: checkAvailabilityParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = checkAvailabilityParams.parse(params);
    const { supabase, orgId } = context;
    const execId = validated.executiveId || context.executiveId;

    const dayStart = `${validated.date}T00:00:00`;
    const dayEnd = `${validated.date}T23:59:59`;

    let query = supabase
      .from('meetings')
      .select('start_time, end_time, title')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time', { ascending: true });

    if (execId) {
      query = query.eq('executive_id', execId);
    }

    const { data: meetings, error } = await query;
    if (error) return { success: false, error: error.message };

    const windowStart = validated.startTime || '08:00';
    const windowEnd = validated.endTime || '18:00';

    const slots = findAvailableSlots(meetings || [], validated.date, windowStart, windowEnd, validated.duration);

    return {
      success: true,
      data: {
        date: validated.date,
        duration_minutes: validated.duration,
        available_slots: slots,
        existing_meetings: (meetings || []).length,
      },
    };
  },
});

registerTool({
  name: 'reschedule_meeting',
  description: 'Move an existing meeting to a new time.',
  parameters: rescheduleMeetingParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = rescheduleMeetingParams.parse(params);
    const { supabase, orgId } = context;

    const { data, error } = await supabase
      .from('meetings')
      .update({ start_time: validated.newStartTime, end_time: validated.newEndTime })
      .eq('id', validated.meetingId)
      .eq('org_id', orgId)
      .select('id, title, start_time, end_time')
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { meeting: data, message: `Meeting rescheduled to ${validated.newStartTime}` },
    };
  },
});

function getDateRange(date: string, range: 'day' | 'week' | 'month') {
  const d = new Date(date);
  let start: Date;
  let end: Date;

  switch (range) {
    case 'week': {
      const dow = d.getDay();
      start = new Date(d);
      start.setDate(d.getDate() - dow);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }
    case 'month':
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      break;
    default:
      start = new Date(d);
      end = new Date(d);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { startOfRange: start.toISOString(), endOfRange: end.toISOString() };
}

function findAvailableSlots(
  meetings: Array<{ start_time: string; end_time: string }>,
  date: string,
  windowStart: string,
  windowEnd: string,
  durationMinutes: number
) {
  const slots: Array<{ start: string; end: string }> = [];
  const wStart = new Date(`${date}T${windowStart}:00`).getTime();
  const wEnd = new Date(`${date}T${windowEnd}:00`).getTime();
  const dur = durationMinutes * 60 * 1000;

  const busy = meetings.map(m => ({
    start: new Date(m.start_time).getTime(),
    end: new Date(m.end_time).getTime(),
  })).sort((a, b) => a.start - b.start);

  let cursor = wStart;

  for (const b of busy) {
    if (b.start > cursor && b.start - cursor >= dur) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(b.start).toISOString() });
    }
    cursor = Math.max(cursor, b.end);
  }

  if (wEnd > cursor && wEnd - cursor >= dur) {
    slots.push({ start: new Date(cursor).toISOString(), end: new Date(wEnd).toISOString() });
  }

  return slots;
}

export { getMeetingsParams, createMeetingParams, checkAvailabilityParams, rescheduleMeetingParams };
