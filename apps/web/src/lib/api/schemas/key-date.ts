/**
 * Key Date Validation Schemas
 */

import { z } from 'zod';

export const keyDateCategorySchema = z.enum([
  'birthdays',
  'anniversaries',
  'deadlines',
  'milestones',
  'travel',
  'financial',
  'team',
  'personal',
  'vip',
  'expirations',
  'holidays',
  'other',
]);

export const createKeyDateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: keyDateCategorySchema,
  related_person: z.string().max(255).optional(),
  related_contact_id: z.string().uuid().optional(),
  related_family_member_id: z.string().uuid().optional(),
  executive_id: z.string().uuid().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
  reminder_days: z.array(z.number().int().min(0).max(365)).default([7, 1]),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

export const updateKeyDateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  category: keyDateCategorySchema.optional(),
  related_person: z.string().max(255).optional().nullable(),
  related_contact_id: z.string().uuid().optional().nullable(),
  related_family_member_id: z.string().uuid().optional().nullable(),
  executive_id: z.string().uuid().optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.string().optional().nullable(),
  reminder_days: z.array(z.number().int().min(0).max(365)).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const keyDateQuerySchema = z.object({
  executive_id: z.string().uuid().optional(),
  category: z.union([keyDateCategorySchema, z.array(keyDateCategorySchema)]).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateKeyDateInput = z.infer<typeof createKeyDateSchema>;
export type UpdateKeyDateInput = z.infer<typeof updateKeyDateSchema>;
export type KeyDateQueryInput = z.infer<typeof keyDateQuerySchema>;
