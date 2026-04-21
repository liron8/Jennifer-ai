/**
 * Single Family Member API Routes
 * PATCH /api/executives/[id]/family-members/[memberId] - Update
 * DELETE /api/executives/[id]/family-members/[memberId] - Delete
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
  params: Promise<{ id: string; memberId: string }>;
}

const updateSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  relationship: z.string().min(1).max(100).optional(),
  birthday: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

async function handlePatch(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id, memberId } = await params;
  const { data: body, error: validationError } = await validateBody(request, updateSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('family_members')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error || !data) return notFoundResponse('Family member');
    return successResponse({ data });
  } catch (error) {
    console.error('Error updating family member:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id, memberId } = await params;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id);

    if (error) return internalErrorResponse(error.message);
    return successResponse({ success: true });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return internalErrorResponse();
  }
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}

export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
