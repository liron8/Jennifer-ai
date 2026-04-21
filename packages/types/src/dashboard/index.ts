/**
 * Dashboard Types
 */

import type { Meeting } from '../entities/meeting';
import type { Task } from '../entities/task';
import type { KeyDate } from '../entities/key-date';
import type { AIInsight } from '../ai';

export interface DashboardMetrics {
  meetings_today: number;
  meetings_this_week: number;
  tasks_completed_today: number;
  tasks_pending: number;
  tasks_overdue: number;
  approvals_pending: number;
  approvals_processed_this_week: number;
}

export interface DashboardData {
  todays_meetings: Meeting[];
  priority_tasks: Task[];
  pending_approvals_count: number;
  active_insights: AIInsight[];
  metrics: DashboardMetrics;
  upcoming_key_dates: KeyDate[];
}

export interface ScheduleTimelineItem {
  id: string;
  type: 'meeting' | 'task' | 'key_date';
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  is_all_day: boolean;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  shortcut?: string;
}
