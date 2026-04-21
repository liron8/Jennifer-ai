/**
 * Contact Groups API Routes
 * GET /api/contacts/groups - List groups for org (auto-seeds defaults)
 * POST /api/contacts/groups - Create new group
 * PATCH /api/contacts/groups - Rename a group
 * DELETE /api/contacts/groups - Soft-delete a group
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  badRequestResponse,
  validateBody,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(50).optional(),
});

const updateGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});

const deleteGroupSchema = z.object({
  id: z.string().uuid(),
});

const DEFAULT_GROUPS = [
  { name: 'VIP', color: 'purple', sort_order: 0 },
  { name: 'Client', color: 'blue', sort_order: 1 },
  { name: 'Vendor', color: 'orange', sort_order: 2 },
  { name: 'Partner', color: 'green', sort_order: 3 },
  { name: 'Personal', color: 'gray', sort_order: 4 },
  { name: 'Colleague', color: 'indigo', sort_order: 5 },
];

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    let { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching contact groups:', error);
      return internalErrorResponse(error.message);
    }

    // Auto-seed defaults if empty
    if (!data || data.length === 0) {
      const defaults = DEFAULT_GROUPS.map((g) => ({
        ...g,
        org_id: context.user.org_id,
        is_default: true,
      }));

      const { data: seeded, error: seedError } = await supabase
        .from('contact_groups')
        .insert(defaults)
        .select();

      if (seedError) {
        console.error('Error seeding default groups:', seedError);
        return internalErrorResponse(seedError.message);
      }

      data = seeded;
    }

    return successResponse(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, createGroupSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { count } = await supabase
      .from('contact_groups')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null);

    const { data, error } = await supabase
      .from('contact_groups')
      .insert({
        org_id: context.user.org_id,
        name: body.name,
        color: body.color || 'gray',
        is_default: false,
        sort_order: (count || 0),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact group:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, updateGroupSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name) update.name = body.name;
    if (body.color) update.color = body.color;
    if (body.sort_order !== undefined) update.sort_order = body.sort_order;

    const { error } = await supabase
      .from('contact_groups')
      .update(update)
      .eq('id', body.id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error updating contact group:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ message: 'Group updated' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, deleteGroupSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data: group } = await supabase
      .from('contact_groups')
      .select('is_default')
      .eq('id', body.id)
      .eq('org_id', context.user.org_id)
      .single();

    if (group?.is_default) {
      return badRequestResponse('Cannot delete a default group. You can rename it instead.');
    }

    const { error } = await supabase
      .from('contact_groups')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deleting contact group:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ message: 'Group deleted' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
