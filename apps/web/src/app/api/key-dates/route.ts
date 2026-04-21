/**
 * Key Dates API Routes
 * GET /api/key-dates - List key dates
 * POST /api/key-dates - Create key date
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
import { createKeyDateSchema, keyDateQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = keyDateQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('key_dates')
      .select('*', { count: 'exact' })
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null);

    if (filters.executive_id) {
      query = query.eq('executive_id', filters.executive_id);
    }

    if (filters.category) {
      const categories = Array.isArray(filters.category) 
        ? filters.category 
        : [filters.category];
      query = query.in('category', categories);
    }

    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    query = query
      .order('date', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching key dates:', error);
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
    createKeyDateSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const keyDateData = {
      org_id: context.user.org_id,
      title: body.title,
      description: body.description,
      date: body.date,
      end_date: body.end_date,
      category: body.category,
      related_person: body.related_person,
      related_contact_id: body.related_contact_id,
      related_family_member_id: body.related_family_member_id,
      executive_id: body.executive_id,
      is_recurring: body.is_recurring,
      recurrence_rule: body.recurrence_rule,
      reminder_days: body.reminder_days,
      tags: body.tags,
      created_by: context.user.id,
    };

    const { data, error } = await supabase
      .from('key_dates')
      .insert(keyDateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating key date:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
