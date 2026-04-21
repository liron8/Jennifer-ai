/**
 * Approval Validation Schemas
 */

import { z } from 'zod';

export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'info_requested']);
export const approvalTypeSchema = z.enum(['expense', 'calendar', 'document', 'travel', 'purchase', 'time_off', 'other']);
export const approvalUrgencySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const approvalAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  type: z.string().max(100),
  size: z.number().int().positive(),
});

export const createApprovalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  approval_type: approvalTypeSchema,
  urgency: approvalUrgencySchema.default('medium'),
  amount: z.number().positive().optional(),
  currency: z.string().max(10).default('USD'),
  category: z.string().max(100).optional(),
  due_date: z.string().optional(),
  executive_id: z.string().uuid(),
  attachments: z.array(approvalAttachmentSchema).default([]),
});

export const updateApprovalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: approvalStatusSchema.optional(),
  urgency: approvalUrgencySchema.optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  comment: z.string().max(2000).optional(),
});

export const approvalDecisionSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const approvalInfoRequestSchema = z.object({
  questions: z.string().min(1).max(2000),
});

export const approvalQuerySchema = z.object({
  executive_id: z.string().uuid().optional(),
  status: z.union([approvalStatusSchema, z.array(approvalStatusSchema)]).optional(),
  approval_type: approvalTypeSchema.optional(),
  urgency: z.union([approvalUrgencySchema, z.array(approvalUrgencySchema)]).optional(),
  submitted_by: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type UpdateApprovalInput = z.infer<typeof updateApprovalSchema>;
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type ApprovalInfoRequestInput = z.infer<typeof approvalInfoRequestSchema>;
export type ApprovalQueryInput = z.infer<typeof approvalQuerySchema>;
