/**
 * Delegations API Routes
 * GET /api/delegations - List delegations
 * POST /api/delegations - Create delegation
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  parseQueryParams,
  parsePaginationParams,
  buildPaginationMeta,
  validateBody,
  validationErrorResponse,
  parseZodError,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const delegationQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'completed', 'rejected', 'all']).default('all'),
  direction: z.enum(['sent', 'received', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

const createDelegationSchema = z.object({
  task_id: z.string().uuid(),
  delegated_to: z.string().uuid(),
  message: z.string().max(1000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = delegationQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('delegations')
      .select('*, tasks(*)', { count: 'exact' })
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null);

    // Filter by direction
    if (filters.direction === 'sent') {
      query = query.eq('delegated_by', context.user.id);
    } else if (filters.direction === 'received') {
      query = query.eq('delegated_to', context.user.id);
    } else {
      query = query.or(`delegated_by.eq.${context.user.id},delegated_to.eq.${context.user.id}`);
    }

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching delegations:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({
      data: data || [],
      meta: buildPaginationMeta(page, pageSize, count || 0),
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    createDelegationSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Verify task exists and belongs to user
    const { data: task } = await supabase
      .from('tasks')
      .select('id, org_id')
      .eq('id', body.task_id)
      .eq('org_id', context.user.org_id)
      .single();

    if (!task) {
      return internalErrorResponse('Task not found');
    }

    // Verify delegated_to user exists in same org
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', body.delegated_to)
      .eq('org_id', context.user.org_id)
      .single();

    if (!targetUser) {
      return internalErrorResponse('Target user not found in organization');
    }

    const delegationData = {
      org_id: context.user.org_id,
      task_id: body.task_id,
      delegated_by: context.user.id,
      delegated_to: body.delegated_to,
      delegation_notes: body.message,
      due_date: body.due_date,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('delegations')
      .insert(delegationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating delegation:', error);
      return internalErrorResponse(error.message);
    }

    // TODO: Send notification to delegated_to user

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
