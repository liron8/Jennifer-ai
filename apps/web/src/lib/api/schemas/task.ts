/**
 * Task Validation Schemas
 */

import { z } from 'zod';

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'approval', 'waiting', 'done']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
// Allow any string for category to support UI categories
export const taskCategorySchema = z.string().max(50).default('general');

export const subtaskSchema = z.object({
  title: z.string().min(1).max(255),
  completed: z.boolean().default(false),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  assigned_to: z.string().max(255).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  category: taskCategorySchema.default('general'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  executive_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  subtasks: z.array(subtaskSchema).default([]),
  tags: z.array(z.string().max(50)).max(10).default([]),
  related_meeting_id: z.string().uuid().optional(),
  related_contact_id: z.string().uuid().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
  folder_id: z.string().uuid().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: z.string().max(50).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  executive_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  subtasks: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(255),
    completed: z.boolean(),
    completed_at: z.string().datetime().optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    assigned_to: z.string().max(255).optional().nullable(),
  })).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  folder_id: z.string().uuid().optional().nullable(),
});

export const taskQuerySchema = z.object({
  executive_id: z.string().uuid().optional(),
  status: z.union([taskStatusSchema, z.array(taskStatusSchema)]).optional(),
  priority: z.union([taskPrioritySchema, z.array(taskPrioritySchema)]).optional(),
  category: z.string().max(50).optional(),
  assigned_to: z.string().uuid().optional(),
  due_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
