/**
 * Dashboard Activity API Route
 * GET /api/dashboard/activity - Get meeting activity data for charts
 * Supports time ranges: 7days, 30days, 12months
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, badRequestResponse } from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

type TimeRange = '7days' | '30days' | '12months';

interface ActivityDataPoint {
  date: string;
  label: string;
  meetings: number;
  tasks: number;
}

function getDateRange(range: TimeRange): { startDate: Date; endDate: Date; groupBy: 'day' | 'week' | 'month' } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  
  switch (range) {
    case '7days':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate, groupBy: 'day' };
    case '30days':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate, groupBy: 'day' };
    case '12months':
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate, groupBy: 'month' };
    default:
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate, groupBy: 'month' };
  }
}

function generateDateLabels(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month'): ActivityDataPoint[] {
  const labels: ActivityDataPoint[] = [];
  const current = new Date(startDate);
  
  if (groupBy === 'month') {
    while (current <= endDate) {
      labels.push({
        date: current.toISOString().split('T')[0],
        label: current.toLocaleDateString('en-US', { month: 'short' }),
        meetings: 0,
        tasks: 0,
      });
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    while (current <= endDate) {
      labels.push({
        date: current.toISOString().split('T')[0],
        label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        meetings: 0,
        tasks: 0,
      });
      current.setDate(current.getDate() + 1);
    }
  }
  
  return labels;
}

function getDateKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  if (groupBy === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return date.toISOString().split('T')[0];
}

async function handleGet(request: NextRequest, context: AuthContext) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get('range') || '12months') as TimeRange;
  
  if (!['7days', '30days', '12months'].includes(range)) {
    return badRequestResponse('Invalid range. Must be 7days, 30days, or 12months');
  }

  try {
    const supabase = await createClient();
    const { startDate, endDate, groupBy } = getDateRange(range);
    
    // Fetch meetings in the date range
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, start_time')
      .eq('org_id', context.user.org_id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .is('deleted_at', null);

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError);
      return internalErrorResponse(meetingsError.message);
    }

    // Fetch completed tasks in the date range (by completed_at or updated_at when status changed to done)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, completed_at, updated_at, status')
      .eq('org_id', context.user.org_id)
      .eq('status', 'done')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())
      .is('deleted_at', null);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return internalErrorResponse(tasksError.message);
    }

    // Generate date labels for the chart
    const dataPoints = generateDateLabels(startDate, endDate, groupBy);
    
    // Create a map for quick lookup
    const dataMap = new Map<string, ActivityDataPoint>();
    dataPoints.forEach(point => {
      const key = groupBy === 'month' 
        ? point.date.substring(0, 7) // YYYY-MM
        : point.date; // YYYY-MM-DD
      dataMap.set(key, point);
    });

    // Count meetings per period
    (meetings || []).forEach(meeting => {
      const meetingDate = new Date(meeting.start_time);
      const key = getDateKey(meetingDate, groupBy);
      const point = dataMap.get(key);
      if (point) {
        point.meetings++;
      }
    });

    // Count completed tasks per period
    (tasks || []).forEach(task => {
      const taskDate = new Date(task.completed_at || task.updated_at);
      const key = getDateKey(taskDate, groupBy);
      const point = dataMap.get(key);
      if (point) {
        point.tasks++;
      }
    });

    // Calculate totals and change percentage
    const totalMeetings = dataPoints.reduce((sum, p) => sum + p.meetings, 0);
    const totalTasks = dataPoints.reduce((sum, p) => sum + p.tasks, 0);
    
    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    previousEndDate.setMilliseconds(-1);
    
    if (range === '7days') {
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (range === '30days') {
      previousStartDate.setDate(previousStartDate.getDate() - 30);
    } else {
      previousStartDate.setMonth(previousStartDate.getMonth() - 12);
    }

    const { count: previousMeetingsCount } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .gte('start_time', previousStartDate.toISOString())
      .lte('start_time', previousEndDate.toISOString())
      .is('deleted_at', null);

    const previousMeetings = previousMeetingsCount || 0;
    let changePercentage = 0;
    if (previousMeetings > 0) {
      changePercentage = Math.round(((totalMeetings - previousMeetings) / previousMeetings) * 100);
    } else if (totalMeetings > 0) {
      changePercentage = 100;
    }

    return successResponse({
      data: dataPoints,
      summary: {
        total_meetings: totalMeetings,
        total_tasks: totalTasks,
        change_percentage: changePercentage,
        change_trend: changePercentage >= 0 ? 'positive' : 'negative',
        range,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
