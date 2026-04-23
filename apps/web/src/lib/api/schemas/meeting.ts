/**
 * Meeting Validation Schemas
 */

import { z } from 'zod';

export const meetingStatusSchema = z.enum(['scheduled', 'confirmed', 'tentative', 'pending', 'cancelled']);
export const locationTypeSchema = z.enum(['virtual', 'in_person', 'phone', 'hybrid']);
export const meetingTypeSchema = z.enum(['internal', 'external', 'one_on_one', 'team', 'client', 'interview', 'other']);
export const videoProviderSchema = z.enum(['zoom', 'teams', 'google_meet', 'webex', 'other']);

export const attendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  is_optional: z.boolean().default(false),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  timezone: z.string().default('UTC'),
  is_all_day: z.boolean().default(false),
  location_type: locationTypeSchema.default('virtual'),
  location: z.string().max(500).optional(),
  location_address: z.string().max(500).optional(),
  create_video_conference: z.boolean().default(false),
  video_conference_url: z.string().url().optional(),
  video_conference_provider: videoProviderSchema.optional(),
  meeting_type: meetingTypeSchema.default('other'),
  attendees: z.array(attendeeSchema).default([]),
  executive_id: z.string().uuid().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
  reminder_minutes: z.number().int().min(0).max(40320).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  timezone: z.string().optional(),
  is_all_day: z.boolean().optional(),
  status: meetingStatusSchema.optional(),
  location_type: locationTypeSchema.optional(),
  location: z.string().max(500).optional(),
  location_address: z.string().max(500).optional(),
  video_conference_url: z.string().url().optional(),
  meeting_type: meetingTypeSchema.optional(),
  attendees: z.array(attendeeSchema).optional(),
  notes: z.string().max(10000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const meetingQuerySchema = z.object({
  executive_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.enum(['upcoming', 'pending', 'past', 'cancelled', 'all']).default('upcoming'),
  meeting_type: meetingTypeSchema.optional(),
  location_type: locationTypeSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type MeetingQueryInput = z.infer<typeof meetingQuerySchema>;
