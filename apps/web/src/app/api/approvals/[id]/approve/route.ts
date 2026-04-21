/**
 * Approve Approval API Route
 * POST /api/approvals/[id]/approve
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
import { approvalDecisionSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

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
    approvalDecisionSchema
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
        status: 'approved',
        decided_by: context.user.id,
        decision_notes: body.notes,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving:', error);
      return internalErrorResponse(error.message);
    }

    // TODO: Emit approval.decided event
    // TODO: Send notification to submitter

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePost(req, ctx, routeParams))(request);
}
