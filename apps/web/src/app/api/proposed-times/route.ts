/**
 * Proposed Times API Route
 * GET /api/proposed-times - List proposed times
 * POST /api/proposed-times - Create proposed times
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, validateBody } from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  title: z.string().max(255).optional(),
  executive_id: z.string().uuid().optional(),
  time_slots: z.array(z.object({
    start: z.string(),
    end: z.string(),
  })).min(1),
  timezone_columns: z.array(z.string()).default(['America/New_York']),
  recipient_info: z.string().max(500).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('proposed_times')
      .select('*')
      .eq('organization_id', context.user.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposed times:', error);
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

    const { data, error } = await supabase
      .from('proposed_times')
      .insert({
        organization_id: context.user.org_id,
        created_by: context.user.id,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating proposed times:', error);
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
