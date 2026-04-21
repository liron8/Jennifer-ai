/**
 * Single Direct Report API Routes
 * PATCH /api/executives/[id]/direct-reports/[reportId] - Update
 * DELETE /api/executives/[id]/direct-reports/[reportId] - Delete
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
  params: Promise<{ id: string; reportId: string }>;
}

const updateSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  title: z.string().max(255).optional().nullable(),
  department: z.string().max(255).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
});

async function handlePatch(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id, reportId } = await params;
  const { data: body, error: validationError } = await validateBody(request, updateSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('direct_reports')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error || !data) return notFoundResponse('Direct report');
    return successResponse({ data });
  } catch (error) {
    console.error('Error updating direct report:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id, reportId } = await params;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('direct_reports')
      .delete()
      .eq('id', reportId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id);

    if (error) return internalErrorResponse(error.message);
    return successResponse({ success: true });
  } catch (error) {
    console.error('Error deleting direct report:', error);
    return internalErrorResponse();
  }
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}

export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
