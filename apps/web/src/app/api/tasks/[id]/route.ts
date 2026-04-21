/**
 * Single Task API Routes
 * GET /api/tasks/[id] - Get task
 * PATCH /api/tasks/[id] - Update task
 * DELETE /api/tasks/[id] - Delete task
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { updateTaskSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';
import { eventBus } from '@jeniferai/core-event-bus';

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
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse('Task');
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
    updateTaskSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return notFoundResponse('Task');
    }

    const updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if status changed to done
    if (body.status === 'done' && existing.status !== 'done') {
      updateData.completed_at = new Date().toISOString();
    } else if (body.status && body.status !== 'done') {
      updateData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return internalErrorResponse(error.message);
    }

    // Emit task.updated event (fire-and-forget)
    void eventBus.publish({
      type: 'task.updated',
      payload: data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api.tasks.patch',
        orgId: context.user.org_id,
        userId: context.user.id,
        correlationId: id,
      },
    });

    // If status changed to done, also emit task.completed
    if (body.status === 'done' && existing.status !== 'done') {
      void eventBus.publish({
        type: 'task.completed',
        payload: data,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api.tasks.patch',
          orgId: context.user.org_id,
          userId: context.user.id,
          correlationId: id,
        },
      });
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deleting task:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ success: true });
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

export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
