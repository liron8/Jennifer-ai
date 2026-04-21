/**
 * Tasks API Routes
 * GET /api/tasks - List tasks
 * POST /api/tasks - Create task
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
import { createTaskSchema, taskQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';
import { eventBus } from '@jeniferai/core-event-bus';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = taskQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('tasks')
      .select('*, executive:executive_profiles!executive_id(full_name)', { count: 'exact' })
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null);

    // Apply filters
    if (filters.executive_id) {
      query = query.eq('executive_id', filters.executive_id);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      query = query.in('priority', priorities);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters.due_before) {
      query = query.lte('due_date', filters.due_before);
    }

    if (filters.due_after) {
      query = query.gte('due_date', filters.due_after);
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
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
  console.log('POST /api/tasks - Creating task');
  
  const { data: body, error: validationError } = await validateBody(
    request,
    createTaskSchema
  );

  if (validationError) {
    console.log('Validation error:', validationError);
    return validationError;
  }
  
  console.log('Validated body:', body);

  try {
    const supabase = await createClient();

    const taskData = {
      org_id: context.user.org_id,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      category: body.category,
      due_date: body.due_date,
      due_time: body.due_time,
      executive_id: body.executive_id,
      assigned_to: body.assigned_to || context.user.id,
      subtasks: body.subtasks,
      tags: body.tags,
      related_meeting_id: body.related_meeting_id,
      related_contact_id: body.related_contact_id,
      is_recurring: body.is_recurring,
      recurrence_rule: body.recurrence_rule,
      created_by: context.user.id,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return internalErrorResponse(error.message);
    }

    // Emit task.created event (fire-and-forget for duplicate detection)
    void eventBus.publish({
      type: 'task.created',
      payload: data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api.tasks.post',
        orgId: context.user.org_id,
        userId: context.user.id,
        correlationId: data.id,
      },
    });

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
