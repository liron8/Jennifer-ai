/**
 * Single Emergency Contact API Routes
 * PATCH /api/executives/[id]/emergency-contacts/[contactId] - Update
 * DELETE /api/executives/[id]/emergency-contacts/[contactId] - Delete
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, notFoundResponse, internalErrorResponse, validateBody } from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string; contactId: string }>;
}

const updateSchema = z.object({
  category: z.enum(['business', 'personal']).optional(),
  role: z.string().max(100).optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
});

async function handlePatch(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id, contactId } = await params;
  const { data: body, error: validationError } = await validateBody(request, updateSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('executive_emergency_contacts')
      .update(body)
      .eq('id', contactId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .select()
      .single();

    if (error || !data) return notFoundResponse('Emergency contact');
    return successResponse({ data });
  } catch (error) {
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id, contactId } = await params;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('executive_emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id);

    if (error) return internalErrorResponse(error.message);
    return successResponse({ success: true });
  } catch (error) {
    return internalErrorResponse();
  }
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}
export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
