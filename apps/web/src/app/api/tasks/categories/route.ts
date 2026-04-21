/**
 * Task Categories API Routes
 * GET /api/tasks/categories - List task categories for the org
 * POST /api/tasks/categories - Create a new custom category
 * PATCH /api/tasks/categories - Update a category (rename)
 * DELETE /api/tasks/categories - Soft-delete a category
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
  badRequestResponse,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(50).optional(),
});

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});

const deleteCategorySchema = z.object({
  id: z.string().uuid(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return internalErrorResponse(error.message);
    }

    // If no categories exist, seed defaults
    if (!data || data.length === 0) {
      const defaults = [
        { name: 'Personal', color: 'blue', is_default: true, sort_order: 0 },
        { name: 'Work', color: 'brand', is_default: true, sort_order: 1 },
        { name: 'Travel', color: 'warning', is_default: true, sort_order: 2 },
        { name: 'Events', color: 'success', is_default: true, sort_order: 3 },
        { name: 'Finance', color: 'error', is_default: true, sort_order: 4 },
      ];

      const { data: seeded, error: seedError } = await supabase
        .from('task_categories')
        .insert(defaults.map(d => ({ ...d, org_id: context.user.org_id })))
        .select();

      if (seedError) {
        console.error('Error seeding categories:', seedError);
        return internalErrorResponse(seedError.message);
      }

      return successResponse(seeded || []);
    }

    return successResponse(data);
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

    // Get max sort_order
    const { data: existing } = await supabase
      .from('task_categories')
      .select('sort_order')
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0;

    const { data, error } = await supabase
      .from('task_categories')
      .insert({
        org_id: context.user.org_id,
        name: body.name,
        color: body.color || 'gray',
        is_default: false,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, updateCategorySchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from('task_categories')
      .update(updateData)
      .eq('id', body.id)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, deleteCategorySchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    // Check if it's a default category
    const { data: category } = await supabase
      .from('task_categories')
      .select('is_default')
      .eq('id', body.id)
      .eq('org_id', context.user.org_id)
      .single();

    if (category?.is_default) {
      return badRequestResponse('Cannot delete a default category. You can rename it instead.');
    }

    const { error } = await supabase
      .from('task_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deleting category:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ message: 'Category deleted' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
