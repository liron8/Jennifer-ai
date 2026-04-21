/**
 * Single Approval API Routes
 * GET /api/approvals/[id] - Get approval
 * PATCH /api/approvals/[id] - Update approval
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { updateApprovalSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (error || !data) {
      return notFoundResponse('Approval');
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  const { data: body, error: validationError } = await validateBody(
    request,
    updateApprovalSchema
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

    // Only allow status changes if still pending or info_requested
    if (body.status && existing.status !== 'pending' && existing.status !== 'info_requested') {
      return internalErrorResponse('Cannot update a decided approval');
    }

    const { comment, ...updateFields } = body;
    const updatePayload: Record<string, unknown> = {
      ...updateFields,
      updated_at: new Date().toISOString(),
    };

    // Set decided_by/decided_at when making a decision
    if (body.status === 'approved' || body.status === 'rejected') {
      updatePayload.decided_by = context.user.id;
      updatePayload.decided_at = new Date().toISOString();
      if (comment) {
        updatePayload.decision_notes = comment;
      }
    }

    const { data, error } = await supabase
      .from('approvals')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating approval:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function GET(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleGet(req, ctx, routeParams))(request);
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}
