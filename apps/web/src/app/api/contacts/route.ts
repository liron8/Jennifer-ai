/**
 * Contacts API Routes (Pro tier)
 * GET /api/contacts - List contacts
 * POST /api/contacts - Create contact
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
import { createContactSchema, contactQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = contactQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('contacts')
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

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    }

    if (filters.has_followup) {
      query = query.not('next_followup_at', 'is', null);
    }

    const sortColumn = filters.sort_by === 'company' ? 'company' 
      : filters.sort_by === 'last_contacted' ? 'last_contacted_at' 
      : 'full_name';

    query = query
      .order(sortColumn, { ascending: filters.sort_order === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
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
    createContactSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Flatten address object into individual DB columns
    const { address, ...rest } = body;
    const contactData: Record<string, unknown> = {
      ...rest,
      org_id: context.user.org_id,
      created_by: context.user.id,
    };
    if (address) {
      contactData.address_line1 = address.line1;
      contactData.address_line2 = address.line2 || null;
      contactData.city = address.city;
      contactData.state = address.state;
      contactData.postal_code = address.postal_code;
      contactData.country = address.country;
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return internalErrorResponse(error.message);
    }

    // Sync birthday → key_dates
    if (data && body.birthday) {
      try {
        await supabase.from('key_dates').insert({
          org_id: context.user.org_id,
          title: `${body.full_name}'s Birthday`,
          date: body.birthday,
          category: 'birthdays',
          related_contact_id: data.id,
          is_recurring: true,
          recurrence_rule: 'FREQ=YEARLY',
          reminder_days: [7, 1],
          tags: [],
        });
      } catch (syncErr) {
        console.error('Birthday sync to key_dates failed:', syncErr);
      }
    }

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
