/**
 * Calendar Insights Report API Route
 * GET /api/reports/calendar-insights - Get calendar analytics
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  parseQueryParams,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const executiveId = params.executive_id;
  const startDate = params.start_date || getDefaultStartDate();
  const endDate = params.end_date || new Date().toISOString().split('T')[0];

  try {
    const supabase = await createClient();

    // Build base query
    let meetingsQuery = supabase
      .from('meetings')
      .select('*')
      .eq('org_id', context.user.org_id)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .is('deleted_at', null);

    if (executiveId) {
      meetingsQuery = meetingsQuery.eq('executive_id', executiveId);
    }

    const { data: meetings, error } = await meetingsQuery;

    if (error) {
      console.error('Error fetching meetings:', error);
      return internalErrorResponse(error.message);
    }

    // Calculate insights
    const insights = calculateCalendarInsights(meetings || [], startDate, endDate);

    return successResponse({ data: insights });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

interface Meeting {
  id: string;
  start_time: string;
  end_time: string;
  meeting_type: string;
  location_type: string;
  attendees?: { email: string; name?: string }[];
}

function calculateCalendarInsights(meetings: Meeting[], startDate: string, endDate: string) {
  const totalMeetings = meetings.length;
  
  // Calculate total meeting hours
  let totalMinutes = 0;
  meetings.forEach(m => {
    const start = new Date(m.start_time);
    const end = new Date(m.end_time);
    totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
  });

  // Meetings by type
  const byType: Record<string, number> = {};
  meetings.forEach(m => {
    byType[m.meeting_type] = (byType[m.meeting_type] || 0) + 1;
  });

  // Meetings by day of week
  const byDay: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  meetings.forEach(m => {
    const day = dayNames[new Date(m.start_time).getDay()];
    byDay[day]++;
  });

  // Internal vs external
  const internal = meetings.filter(m => m.meeting_type === 'internal' || m.meeting_type === 'team').length;
  const external = meetings.filter(m => m.meeting_type === 'external' || m.meeting_type === 'client').length;

  // Calculate weeks in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  return {
    date_range: { start: startDate, end: endDate },
    metrics: {
      total_meetings: totalMeetings,
      avg_meetings_per_week: Math.round((totalMeetings / weeks) * 10) / 10,
      total_meeting_hours: Math.round(totalMinutes / 60 * 10) / 10,
      internal_meetings: internal,
      external_meetings: external,
    },
    charts: {
      meetings_by_day: Object.entries(byDay).map(([day, count]) => ({ day, count })),
      meetings_by_type: Object.entries(byType).map(([type, count]) => ({ type, count })),
    },
  };
}

export const GET = withAuth(handleGet);
