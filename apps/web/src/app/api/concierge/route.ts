/**
 * Concierge Services API Routes (Pro tier)
 * GET /api/concierge - List services
 * POST /api/concierge - Create service
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
import { createConciergeServiceSchema, conciergeServiceQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = conciergeServiceQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('concierge_services')
      .select('*', { count: 'exact' })
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null);

    if (filters.category) {
      const categories = Array.isArray(filters.category) 
        ? filters.category 
        : [filters.category];
      query = query.in('category', categories);
    }

    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.price_range) {
      const ranges = Array.isArray(filters.price_range) 
        ? filters.price_range 
        : [filters.price_range];
      query = query.in('price_range', ranges);
    }

    if (filters.favorites_only) {
      query = query.eq('is_favorite', true);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query
      .order('name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching concierge services:', error);
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
    createConciergeServiceSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Exclude state/country as they don't exist in the DB table
    const { state, country, ...rest } = body;
    const serviceData = {
      ...rest,
      org_id: context.user.org_id,
      is_favorite: false,
      created_by: context.user.id,
    };

    const { data, error } = await supabase
      .from('concierge_services')
      .insert(serviceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating concierge service:', error);
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
