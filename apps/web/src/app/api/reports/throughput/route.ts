/**
 * Throughput Report API Route
 * GET /api/reports/throughput - Get task/approval throughput analytics
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
  const startDate = params.start_date || getDefaultStartDate();
  const endDate = params.end_date || new Date().toISOString().split('T')[0];

  try {
    const supabase = await createClient();

    // Fetch completed tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('org_id', context.user.org_id)
      .eq('status', 'done')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);

    // Fetch processed approvals
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('org_id', context.user.org_id)
      .in('status', ['approved', 'rejected'])
      .gte('decided_at', startDate)
      .lte('decided_at', endDate);

    const insights = calculateThroughputInsights(
      tasks || [],
      approvals || [],
      startDate,
      endDate
    );

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

interface Task {
  id: string;
  category: string;
  priority: string;
  created_at: string;
  completed_at: string;
}

interface Approval {
  id: string;
  created_at: string;
  decided_at: string;
}

function calculateThroughputInsights(
  tasks: Task[],
  approvals: Approval[],
  startDate: string,
  endDate: string
) {
  // Tasks by category
  const byCategory: Record<string, number> = {};
  tasks.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });

  // Tasks by priority
  const byPriority: Record<string, number> = {};
  tasks.forEach(t => {
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  });

  // Average completion time (days)
  let totalCompletionDays = 0;
  tasks.forEach(t => {
    const created = new Date(t.created_at);
    const completed = new Date(t.completed_at);
    totalCompletionDays += (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });
  const avgCompletionDays = tasks.length > 0 ? totalCompletionDays / tasks.length : 0;

  // Average approval turnaround (hours)
  let totalApprovalHours = 0;
  approvals.forEach(a => {
    const created = new Date(a.created_at);
    const decided = new Date(a.decided_at);
    totalApprovalHours += (decided.getTime() - created.getTime()) / (1000 * 60 * 60);
  });
  const avgApprovalHours = approvals.length > 0 ? totalApprovalHours / approvals.length : 0;

  return {
    date_range: { start: startDate, end: endDate },
    metrics: {
      tasks_completed: tasks.length,
      approvals_processed: approvals.length,
      avg_task_completion_days: Math.round(avgCompletionDays * 10) / 10,
      avg_approval_turnaround_hours: Math.round(avgApprovalHours * 10) / 10,
    },
    charts: {
      tasks_by_category: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      tasks_by_priority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
    },
  };
}

export const GET = withAuth(handleGet);
