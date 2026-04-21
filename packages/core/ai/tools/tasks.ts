/**
 * Task Tools
 * AI tools for task management — wired to real Supabase data
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const getTasksParams = z.object({
  status: z.enum(['todo', 'in_progress', 'waiting', 'done', 'all']).default('all'),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
  executiveId: z.string().uuid().optional(),
  dueWithinDays: z.number().min(1).max(365).optional(),
  limit: z.number().min(1).max(50).default(10),
});

const createTaskParams = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum(['general', 'meeting_prep', 'follow_up', 'travel', 'expense', 'communication', 'research', 'other']).default('general'),
  dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
  dueTime: z.string().optional().describe('Due time in HH:MM format'),
  executiveId: z.string().uuid().optional(),
  relatedMeetingId: z.string().uuid().optional(),
});

const updateTaskParams = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  title: z.string().optional(),
});

const completeTaskParams = z.object({
  taskId: z.string().uuid(),
  notes: z.string().optional(),
});

registerTool({
  name: 'get_tasks',
  description: 'Retrieve tasks with optional filters. Use to check pending work.',
  parameters: getTasksParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getTasksParams.parse(params);
    const { supabase, orgId } = context;
    const execId = validated.executiveId || context.executiveId;

    let query = supabase
      .from('tasks')
      .select('id, title, description, status, priority, category, due_date, due_time, assigned_to, executive_id, created_at')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(validated.limit);

    if (validated.status !== 'all') {
      query = query.eq('status', validated.status);
    }
    if (validated.priority !== 'all') {
      query = query.eq('priority', validated.priority);
    }
    if (execId) {
      query = query.eq('executive_id', execId);
    }
    if (validated.dueWithinDays) {
      const futureDate = new Date(Date.now() + validated.dueWithinDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      query = query.lte('due_date', futureDate);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { tasks: data || [], count: data?.length || 0 },
    };
  },
});

registerTool({
  name: 'create_task',
  description: 'Create a new task. Can be linked to meetings or executives.',
  parameters: createTaskParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = createTaskParams.parse(params);
    const { supabase, orgId, userId } = context;
    const execId = validated.executiveId || context.executiveId;

    const { data, error } = await supabase.from('tasks').insert({
      org_id: orgId,
      title: validated.title,
      description: validated.description,
      priority: validated.priority,
      category: validated.category,
      due_date: validated.dueDate,
      due_time: validated.dueTime,
      executive_id: execId,
      related_meeting_id: validated.relatedMeetingId,
      created_by: userId,
      assigned_to: userId,
      status: 'open',
    }).select('id, title, priority, status, due_date').single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { task: data, message: `Task "${validated.title}" created` },
    };
  },
});

registerTool({
  name: 'update_task',
  description: 'Update an existing task status, priority, or due date.',
  parameters: updateTaskParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = updateTaskParams.parse(params);
    const { supabase, orgId } = context;

    const updates: Record<string, unknown> = {};
    if (validated.status) updates.status = validated.status;
    if (validated.priority) updates.priority = validated.priority;
    if (validated.dueDate) updates.due_date = validated.dueDate;
    if (validated.title) updates.title = validated.title;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', validated.taskId)
      .eq('org_id', orgId)
      .select('id, title, status, priority, due_date')
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { task: data, message: `Task updated` },
    };
  },
});

registerTool({
  name: 'complete_task',
  description: 'Mark a task as completed.',
  parameters: completeTaskParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = completeTaskParams.parse(params);
    const { supabase, orgId } = context;

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', validated.taskId)
      .eq('org_id', orgId)
      .select('id, title')
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { task: data, message: `Task "${data?.title}" marked as completed` },
    };
  },
});

export { getTasksParams, createTaskParams, updateTaskParams, completeTaskParams };
