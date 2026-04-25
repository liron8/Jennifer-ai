/**
 * Executive Validation Schemas
 */

import { z } from 'zod';

const RELIGION_OPTIONS = ['Christian', 'Hindu', 'Jewish', 'Muslim'] as const;

const religionSchema = z.preprocess((value) => {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'n/a' || normalized === 'na') {
    return null;
  }
  if (normalized === 'christen') return 'Christian';
  if (normalized === 'christian') return 'Christian';
  if (normalized === 'hindu') return 'Hindu';
  if (normalized === 'jewish') return 'Jewish';
  if (normalized === 'muslim') return 'Muslim';
  return value;
}, z.enum(RELIGION_OPTIONS).nullable());

export const phoneEntrySchema = z.object({
  type: z.enum(['mobile', 'office', 'home', 'assistant', 'other']),
  number: z.string().min(1).max(50),
  is_primary: z.boolean().default(false),
});

export const addressSchema = z.object({
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
});

export const schedulingPreferencesSchema = z.object({
  meeting_buffer_minutes: z.number().int().min(0).max(120).default(15),
  preferred_meeting_times: z.array(z.string()).default([]),
  max_meetings_per_day: z.number().int().min(1).max(20).optional(),
  working_hours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).default({ start: '09:00', end: '17:00' }),
});

export const dietaryPreferencesSchema = z.object({
  restrictions: z.array(z.string().max(100)).default([]),
  allergies: z.array(z.string().max(100)).default([]),
  favorites: z.array(z.string().max(100)).default([]),
  dislikes: z.array(z.string().max(100)).default([]),
  notes: z.string().max(1000).optional(),
});

export const travelPreferencesSchema = z.object({
  preferred_airlines: z.array(z.string().max(100)).default([]),
  airline_loyalty_numbers: z.record(z.string()).default({}),
  seat_preference: z.enum(['window', 'aisle', 'no_preference']).default('no_preference'),
  class_preference: z.enum(['economy', 'premium_economy', 'business', 'first']).default('business'),
  hotel_preferences: z.array(z.string().max(100)).default([]),
  hotel_loyalty_numbers: z.record(z.string()).default({}),
  car_rental_preferences: z.array(z.string().max(100)).default([]),
  tsa_precheck: z.string().max(50).optional(),
  global_entry: z.string().max(50).optional(),
  passport_number: z.string().max(50).optional(),
  passport_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const createExecutiveSchema = z.object({
  full_name: z.string().min(1).max(255),
  title: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phones: z.array(phoneEntrySchema).default([]),
  main_office_location: z.string().max(255).optional(),
  timezone: z.string().default('America/Los_Angeles'),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(2000).optional(),
});

export const updateExecutiveSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  preferred_name: z.string().max(100).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phones: z.array(phoneEntrySchema).optional(),
  main_office_location: z.string().max(255).optional().nullable(),
  office_address: addressSchema.optional().nullable(),
  home_address: z.union([addressSchema, z.string().max(500)]).optional().nullable(),
  timezone: z.string().optional(),
  avatar_url: z.string().url().optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  scheduling_preferences: schedulingPreferencesSchema.partial().optional(),
  dietary_preferences: dietaryPreferencesSchema.partial().optional(),
  travel_preferences: travelPreferencesSchema.partial().optional(),
  is_active: z.boolean().optional(),
  // P2-06: Communication preferences
  communication_preferences: z.array(z.string().max(50)).optional(),
  // P2-07: Meeting preferences
  meeting_preferences: z.array(z.string().max(50)).optional(),
  typical_meeting_hours_start: z.string().max(10).optional().nullable(),
  typical_meeting_hours_end: z.string().max(10).optional().nullable(),
  // P2-09: Archive
  archived_at: z.string().datetime().optional().nullable(),
  // P2-11: Travel profile (comprehensive)
  home_airports: z.array(z.string().max(10)).optional(),
  airline_preferences: z.array(z.string().max(100)).optional(),
  hotel_preferences: z.array(z.string().max(100)).optional(),
  flight_class_general: z.string().max(50).optional().nullable(),
  flight_class_domestic: z.string().max(50).optional().nullable(),
  flight_class_international: z.string().max(50).optional().nullable(),
  seat_preference: z.string().max(50).optional().nullable(),
  rideshare_preferences: z.array(z.string().max(50)).optional(),
  tsa_number_encrypted: z.string().max(100).optional().nullable(),
  global_entry_number_encrypted: z.string().max(100).optional().nullable(),
  layover_preference: z.string().max(100).optional().nullable(),
  avoid_red_eye: z.boolean().optional(),
  avoid_arrivals_before: z.string().max(10).optional().nullable(),
  avoid_departures_after: z.string().max(10).optional().nullable(),
  dietary_restrictions: z.array(z.string().max(100)).optional(),
  favorite_cuisines: z.array(z.string().max(100)).optional(),
  coffee_order: z.string().max(500).optional().nullable(),
  tea_order: z.string().max(500).optional().nullable(),
  snack_preferences: z.string().max(1000).optional().nullable(),
  // P2-12: Religion
  religion: religionSchema.optional(),
  // P2-13: Approval threshold
  approval_threshold: z.number().min(0).optional().nullable(),
  // P2-15: Medical
  carries_epipen: z.boolean().optional(),
  accessibility_needs: z.string().max(2000).optional().nullable(),
  allergies: z.array(z.string().max(100)).optional(),
  insurance_provider: z.string().max(255).optional().nullable(),
  insurance_plan_name: z.string().max(255).optional().nullable(),
  insurance_member_id_encrypted: z.string().max(255).optional().nullable(),
  preferred_medical_facilities: z.string().max(2000).optional().nullable(),
});

export const executiveQuerySchema = z.object({
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExecutiveInput = z.infer<typeof createExecutiveSchema>;
export type UpdateExecutiveInput = z.infer<typeof updateExecutiveSchema>;
export type ExecutiveQueryInput = z.infer<typeof executiveQuerySchema>;
