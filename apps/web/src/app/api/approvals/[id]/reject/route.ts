/**
 * Reject Approval API Route
 * POST /api/approvals/[id]/reject
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
  badRequestResponse,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const rejectSchema = z.object({
  reason: z.string().min(1).max(2000),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handlePost(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  const { data: body, error: validationError } = await validateBody(
    request,
    rejectSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('approvals')
      .select('id, status')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (!existing) {
      return notFoundResponse('Approval');
    }

    if (existing.status !== 'pending' && existing.status !== 'info_requested') {
      return badRequestResponse('Approval has already been decided');
    }

    const { data, error } = await supabase
      .from('approvals')
      .update({
        status: 'rejected',
        decided_by: context.user.id,
        decision_notes: body.reason,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting:', error);
      return internalErrorResponse(error.message);
    }

    // TODO: Emit approval.decided event

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePost(req, ctx, routeParams))(request);
}
