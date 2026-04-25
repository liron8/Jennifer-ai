/**
 * Profile Settings API Route
 * GET /api/settings/profile - Get user profile
 * PATCH /api/settings/profile - Update user profile
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
  job_title: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  phone_extension: z.string().max(20).optional().nullable(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      slack: z.boolean().optional(),
    }).optional(),
    default_executive_id: z.string().uuid().optional().nullable(),
  }).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', context.user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    updateProfileSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch);
