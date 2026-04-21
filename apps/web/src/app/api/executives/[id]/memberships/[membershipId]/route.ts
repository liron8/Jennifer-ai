/**
 * Single Membership API Routes
 * PATCH /api/executives/[id]/memberships/[membershipId] - Update
 * DELETE /api/executives/[id]/memberships/[membershipId] - Delete
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string; membershipId: string }>;
}

const updateSchema = z.object({
  category: z.enum(['airlines', 'hotels', 'lounges', 'car_rental', 'other']).optional(),
  provider_name: z.string().min(1).max(255).optional(),
  program_name: z.string().max(255).optional().nullable(),
  member_number: z.string().max(100).optional().nullable(),
  tier: z.string().max(100).optional().nullable(),
  expires_at: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

async function handlePatch(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id, membershipId } = await params;
  const { data: body, error: validationError } = await validateBody(request, updateSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('memberships')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', membershipId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error || !data) return notFoundResponse('Membership');
    return successResponse({ data });
  } catch (error) {
    console.error('Error updating membership:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id, membershipId } = await params;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', membershipId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id);

    if (error) return internalErrorResponse(error.message);
    return successResponse({ success: true });
  } catch (error) {
    console.error('Error deleting membership:', error);
    return internalErrorResponse();
  }
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}

export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
