/**
 * Executives API Routes
 * GET /api/executives - List executives
 * POST /api/executives - Create executive
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
import { createExecutiveSchema, executiveQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = executiveQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('executive_profiles')
      .select('*', { count: 'exact' })
      .eq('org_id', context.user.org_id);

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.search) {
      query = query.ilike('full_name', `%${filters.search}%`);
    }

    query = query
      .order('full_name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching executives:', error);
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
    createExecutiveSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Map schema fields to actual DB columns
    const { phones, main_office_location, ...rest } = body;
    const primaryPhone = phones?.find((p: { is_primary?: boolean }) => p.is_primary) || phones?.[0];
    const executiveData = {
      ...rest,
      org_id: context.user.org_id,
      phone: primaryPhone?.number || null,
      office_location: main_office_location || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('executive_profiles')
      .insert(executiveData)
      .select()
      .single();

    if (error) {
      console.error('Error creating executive:', error);
      return internalErrorResponse(error.message);
    }

    // Auto-assign the creating user to this executive
    await supabase.from('user_executive_assignments').insert({
      user_id: context.user.id,
      executive_id: data.id,
      is_primary: true,
    });

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
