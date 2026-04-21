/**
 * Task Entity Types
 */

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'general' | 'meeting_prep' | 'follow_up' | 'travel' | 'expense' | 'communication' | 'research' | 'other';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  executive_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  due_date?: string;
  due_time?: string;
  completed_at?: string;
  assigned_to?: string;
  created_by: string;
  subtasks: Subtask[];
  tags: string[];
  attachments: TaskAttachment[];
  related_meeting_id?: string;
  related_contact_id?: string;
  ai_suggested_priority?: TaskPriority;
  ai_suggested_due_date?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  due_date?: string;
  due_time?: string;
  executive_id?: string;
  assigned_to?: string;
  subtasks?: Omit<Subtask, 'id' | 'completed_at'>[];
  tags?: string[];
  related_meeting_id?: string;
  related_contact_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  due_date?: string;
  due_time?: string;
  executive_id?: string;
  assigned_to?: string;
  subtasks?: Subtask[];
  tags?: string[];
}

export interface TaskFilters {
  executive_id?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  category?: TaskCategory;
  assigned_to?: string;
  due_before?: string;
  due_after?: string;
  search?: string;
  tags?: string[];
}

export interface TaskStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
}
