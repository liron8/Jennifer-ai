/**
 * Task Folders API Routes
 * GET /api/tasks/folders - List folders for the org
 * POST /api/tasks/folders - Create a new folder
 * PATCH /api/tasks/folders - Update a folder (rename/color)
 * DELETE /api/tasks/folders - Delete a folder
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, validateBody } from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(50).optional(),
});

const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(50).optional(),
});

const deleteFolderSchema = z.object({
  id: z.string().uuid(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('task_folders')
      .select('*')
      .eq('org_id', context.user.org_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return internalErrorResponse(error.message);
    return successResponse(data || []);
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, createFolderSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('task_folders')
      .select('sort_order')
      .eq('org_id', context.user.org_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0;

    const { data, error } = await supabase
      .from('task_folders')
      .insert({
        org_id: context.user.org_id,
        name: body.name,
        color: body.color || 'gray',
        sort_order: nextOrder,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return internalErrorResponse(error.message);
    return successResponse(data, 201);
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, updateFolderSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;

    const { data, error } = await supabase
      .from('task_folders')
      .update(updateData)
      .eq('id', body.id)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error) return internalErrorResponse(error.message);
    return successResponse(data);
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, deleteFolderSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    // Unassign tasks from this folder
    await supabase
      .from('tasks')
      .update({ folder_id: null })
      .eq('folder_id', body.id);

    const { error } = await supabase
      .from('task_folders')
      .delete()
      .eq('id', body.id)
      .eq('org_id', context.user.org_id);

    if (error) return internalErrorResponse(error.message);
    return successResponse({ message: 'Folder deleted' });
  } catch (error) {
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
