/**
 * Category Options API Route
 * GET /api/settings/preferences?type=concierge|contact|key_date|priority|todo
 * POST /api/settings/preferences - Create a new category option
 * PATCH /api/settings/preferences - Update a category option
 * DELETE /api/settings/preferences?id=uuid - Delete a category option
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const categoryTypeEnum = z.enum(['concierge', 'contact', 'key_date', 'priority', 'todo']);

const createCategorySchema = z.object({
  category_type: categoryTypeEnum,
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_default: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_default: z.boolean().optional(),
});

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const supabase = await createClient();

    let query = supabase
      .from('category_options')
      .select('*')
      .eq('organization_id', context.user.org_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (type) {
      const parsed = categoryTypeEnum.safeParse(type);
      if (!parsed.success) {
        return badRequestResponse('Invalid category type');
      }
      query = query.eq('category_type', parsed.data);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching category options:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, createCategorySchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('category_options')
      .insert({
        organization_id: context.user.org_id,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category option:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const rawBody = await request.json();

  // Check if this is a reorder request
  if ('items' in rawBody) {
    const parsed = reorderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return badRequestResponse('Invalid reorder data');
    }

    try {
      const supabase = await createClient();

      // Update each item's sort_order
      const updates = parsed.data.items.map(item =>
        supabase
          .from('category_options')
          .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('organization_id', context.user.org_id)
      );

      await Promise.all(updates);

      return successResponse({ message: 'Reorder successful' });
    } catch (error) {
      console.error('Unexpected error:', error);
      return internalErrorResponse();
    }
  }

  // Regular update
  const parsed = updateCategorySchema.safeParse(rawBody);
  if (!parsed.success) {
    return badRequestResponse(parsed.error.issues.map(i => i.message).join(', '));
  }

  try {
    const supabase = await createClient();
    const { id, ...updateData } = parsed.data;

    const { data, error } = await supabase
      .from('category_options')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', context.user.org_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category option:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return badRequestResponse('Missing id parameter');
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('category_options')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.user.org_id);

    if (error) {
      console.error('Error deleting category option:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ message: 'Deleted' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
