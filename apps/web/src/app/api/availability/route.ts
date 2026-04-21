/**
 * Availability Links API
 * GET /api/availability - List availability links
 * POST /api/availability - Create a new availability link
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, validateBody } from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  title: z.string().max(255).optional(),
  executive_id: z.string().uuid().optional(),
  date_range_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_range_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_window_start: z.string().regex(/^\d{2}:\d{2}$/),
  time_window_end: z.string().regex(/^\d{2}:\d{2}$/),
  slot_duration_minutes: z.number().int().min(15).max(120).default(30),
});

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('availability_links')
      .select('*, availability_responses(count)')
      .eq('organization_id', context.user.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching availability links:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, createSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();
    const linkToken = generateToken();

    const { data, error } = await supabase
      .from('availability_links')
      .insert({
        organization_id: context.user.org_id,
        created_by: context.user.id,
        link_token: linkToken,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating availability link:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
