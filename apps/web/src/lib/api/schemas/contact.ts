/**
 * Contact Validation Schemas
 */

import { z } from 'zod';

export const contactCategorySchema = z.enum(['vip', 'client', 'vendor', 'partner', 'personal', 'colleague', 'other']);

export const contactAddressSchema = z.object({
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
});

export const createContactSchema = z.object({
  full_name: z.string().min(1).max(255),
  title: z.string().max(255).optional(),
  company: z.string().min(1).max(255),
  email: z.string().email(),
  additional_emails: z.array(z.string().email()).max(5).default([]),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  address: contactAddressSchema.optional(),
  category: contactCategorySchema,
  tags: z.array(z.string().max(50)).max(10).default([]),
  relationship_notes: z.string().max(2000).optional(),
  relationship_strength: z.number().int().min(1).max(5).optional(),
  executive_id: z.string().uuid().optional(),
  assistant_name: z.string().max(255).optional(),
  assistant_email: z.string().email().optional(),
  linkedin_url: z.string().url().optional(),
  birthday: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
});

export const updateContactSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  title: z.string().max(255).optional().nullable(),
  company: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  additional_emails: z.array(z.string().email()).max(5).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  address: contactAddressSchema.optional().nullable(),
  category: contactCategorySchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  relationship_notes: z.string().max(2000).optional().nullable(),
  relationship_strength: z.number().int().min(1).max(5).optional().nullable(),
  assistant_name: z.string().max(255).optional().nullable(),
  assistant_email: z.string().email().optional().nullable(),
  assistant_phone: z.string().max(50).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable(),
  twitter_url: z.string().url().optional().nullable(),
  last_contacted_at: z.string().datetime().optional().nullable(),
  next_followup_at: z.string().datetime().optional().nullable(),
  birthday: z.string().max(10).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
});

export const contactQuerySchema = z.object({
  executive_id: z.string().uuid().optional(),
  category: z.union([contactCategorySchema, z.array(contactCategorySchema)]).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  has_followup: z.coerce.boolean().optional(),
  sort_by: z.enum(['name', 'company', 'last_contacted']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Bulk import schemas
// ---------------------------------------------------------------------------

/** Single contact in a bulk import — more permissive than createContactSchema */
const importContactSchema = z.object({
  full_name: z.string().min(1).max(255),
  email: z.string().email(),
  company: z.string().max(255).default('Unknown'),
  category: z.string().max(50).default('other'),
  title: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  relationship_notes: z.string().max(2000).optional(),
  assistant_name: z.string().max(255).optional(),
  assistant_email: z.string().max(255).optional(),
  linkedin_url: z.string().max(500).optional(),
  address_line1: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

export const bulkImportContactSchema = z.object({
  contacts: z.array(importContactSchema).min(1).max(50),
  skip_duplicates: z.boolean().default(true),
  update_duplicates: z.boolean().default(false),
});

export const checkDuplicatesSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactQueryInput = z.infer<typeof contactQuerySchema>;
export type BulkImportContactInput = z.infer<typeof bulkImportContactSchema>;
export type CheckDuplicatesInput = z.infer<typeof checkDuplicatesSchema>;
