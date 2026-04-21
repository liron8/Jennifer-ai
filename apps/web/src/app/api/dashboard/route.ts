/**
 * Dashboard API Route
 * GET /api/dashboard - Get dashboard data
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse } from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, startOfWeek } from 'date-fns';

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    // Compute today's window in the user's timezone, then convert to UTC for DB queries.
    // This way, "today" matches the user's wall-clock day regardless of where the server runs.
    const tz = context.user.timezone || 'UTC';
    const nowInTz = toZonedTime(new Date(), tz);
    const todayStartUtc = fromZonedTime(startOfDay(nowInTz), tz);
    const todayEndUtc = fromZonedTime(endOfDay(nowInTz), tz);
    const weekStartUtc = fromZonedTime(startOfWeek(nowInTz, { weekStartsOn: 0 }), tz);

    const todayStart = todayStartUtc.toISOString();
    const todayEnd = todayEndUtc.toISOString();
    const weekStart = weekStartUtc.toISOString();

    // Fetch today's meetings — includes any meeting that OVERLAPS today
    // (started earlier and still ongoing, or starts later today).
    // A meeting overlaps today if: start_time <= todayEnd AND end_time >= todayStart.
    const { data: todaysMeetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('org_id', context.user.org_id)
      .lte('start_time', todayEnd)
      .gte('end_time', todayStart)
      .is('deleted_at', null)
      .order('start_time', { ascending: true })
      .limit(10);

    // Fetch priority tasks
    const { data: priorityTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('org_id', context.user.org_id)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(5);

    // Fetch pending approvals count
    const { count: pendingApprovalsCount } = await supabase
      .from('approvals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .eq('status', 'pending');

    // Fetch upcoming key dates (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: upcomingKeyDates } = await supabase
      .from('key_dates')
      .select('*')
      .eq('org_id', context.user.org_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .lte('date', thirtyDaysFromNow.toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('date', { ascending: true })
      .limit(5);

    // Fetch metrics — use overlap filter so multi-day meetings show up correctly.
    const { count: meetingsToday } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .lte('start_time', todayEnd)
      .gte('end_time', todayStart)
      .is('deleted_at', null);

    // "This week" = any meeting overlapping the week (started or ending within it).
    const { count: meetingsThisWeek } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .gte('end_time', weekStart)
      .is('deleted_at', null);

    const { count: tasksPending } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null);

    const { count: tasksOverdue } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', new Date().toISOString().split('T')[0])
      .is('deleted_at', null);

    const dashboardData = {
      todays_meetings: todaysMeetings || [],
      priority_tasks: priorityTasks || [],
      pending_approvals_count: pendingApprovalsCount || 0,
      upcoming_key_dates: upcomingKeyDates || [],
      metrics: {
        meetings_today: meetingsToday || 0,
        meetings_this_week: meetingsThisWeek || 0,
        tasks_pending: tasksPending || 0,
        tasks_overdue: tasksOverdue || 0,
        approvals_pending: pendingApprovalsCount || 0,
      },
    };

    return successResponse(dashboardData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
