/**
 * Concierge Service Validation Schemas
 */

import { z } from 'zod';

export const serviceCategorySchema = z.enum([
  'restaurants',
  'hotels',
  'transportation',
  'entertainment',
  'wellness',
  'shopping',
  'travel',
  'other',
]);

export const priceRangeSchema = z.enum(['$', '$$', '$$$', '$$$$']);

export const createConciergeServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: serviceCategorySchema,
  subcategory: z.string().max(100).optional(),
  contact_name: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  price_range: priceRangeSchema.optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  special_instructions: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

export const updateConciergeServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: serviceCategorySchema.optional(),
  subcategory: z.string().max(100).optional().nullable(),
  contact_name: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  price_range: priceRangeSchema.optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  special_instructions: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  is_favorite: z.boolean().optional(),
  contact_id: z.string().uuid().optional().nullable(),
});

export const conciergeServiceQuerySchema = z.object({
  category: z.union([serviceCategorySchema, z.array(serviceCategorySchema)]).optional(),
  city: z.string().optional(),
  price_range: z.union([priceRangeSchema, z.array(priceRangeSchema)]).optional(),
  favorites_only: z.coerce.boolean().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateConciergeServiceInput = z.infer<typeof createConciergeServiceSchema>;
export type UpdateConciergeServiceInput = z.infer<typeof updateConciergeServiceSchema>;
export type ConciergeServiceQueryInput = z.infer<typeof conciergeServiceQuerySchema>;
