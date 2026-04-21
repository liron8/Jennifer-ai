/**
 * Executive Offices API Routes
 * GET /api/executives/[id]/offices - List offices
 * POST /api/executives/[id]/offices - Add office
 * PATCH /api/executives/[id]/offices - Update office
 * DELETE /api/executives/[id]/offices - Delete office
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, validateBody } from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createSchema = z.object({
  location_name: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  is_primary: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  location_name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional().nullable(),
  is_primary: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

async function handleGet(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('executive_offices')
      .select('*')
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) return internalErrorResponse(error.message);
    return successResponse(data || []);
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  const { data: body, error: validationError } = await validateBody(request, createSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    if (body.is_primary) {
      await supabase
        .from('executive_offices')
        .update({ is_primary: false })
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id);
    }

    const { data, error } = await supabase
      .from('executive_offices')
      .insert({
        org_id: context.user.org_id,
        executive_id: id,
        location_name: body.location_name,
        address: body.address,
        is_primary: body.is_primary,
      })
      .select()
      .single();

    if (error) return internalErrorResponse(error.message);
    return successResponse(data, 201);
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  const { data: body, error: validationError } = await validateBody(request, updateSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();
    const { id: officeId, ...updates } = body;

    if (updates.is_primary) {
      await supabase
        .from('executive_offices')
        .update({ is_primary: false })
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id);
    }

    const { data, error } = await supabase
      .from('executive_offices')
      .update(updates)
      .eq('id', officeId)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error) return internalErrorResponse(error.message);
    return successResponse(data);
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { data: body, error: validationError } = await validateBody(request, deleteSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('executive_offices')
      .delete()
      .eq('id', body.id)
      .eq('org_id', context.user.org_id);

    if (error) return internalErrorResponse(error.message);
    return successResponse({ deleted: true });
  } catch (error) {
    return internalErrorResponse();
  }
}

export async function GET(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleGet(req, ctx, routeParams))(request);
}
export async function POST(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePost(req, ctx, routeParams))(request);
}
export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}
export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
