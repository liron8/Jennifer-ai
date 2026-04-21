/**
 * Executive Emails API Routes
 * GET /api/executives/[id]/emails - List emails
 * POST /api/executives/[id]/emails - Add email
 * PATCH /api/executives/[id]/emails - Update email
 * DELETE /api/executives/[id]/emails - Delete email
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
  email: z.string().email().max(255),
  label: z.string().max(50).default('work'),
  is_primary: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(255).optional(),
  label: z.string().max(50).optional(),
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
      .from('executive_emails')
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

    // If setting as primary, unset other primaries first
    if (body.is_primary) {
      await supabase
        .from('executive_emails')
        .update({ is_primary: false })
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id);
    }

    const { data, error } = await supabase
      .from('executive_emails')
      .insert({
        org_id: context.user.org_id,
        executive_id: id,
        email: body.email,
        label: body.label,
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
    const { id: emailId, ...updates } = body;

    // If setting as primary, unset other primaries first
    if (updates.is_primary) {
      await supabase
        .from('executive_emails')
        .update({ is_primary: false })
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id);
    }

    const { data, error } = await supabase
      .from('executive_emails')
      .update(updates)
      .eq('id', emailId)
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
      .from('executive_emails')
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
