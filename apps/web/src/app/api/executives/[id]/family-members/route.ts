/**
 * Family Members API Routes
 * GET /api/executives/[id]/family-members - List family members
 * POST /api/executives/[id]/family-members - Add family member
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
  full_name: z.string().min(1).max(255),
  relationship: z.string().min(1).max(100),
  birthday: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .order('full_name');

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
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        org_id: context.user.org_id,
        executive_id: id,
        full_name: body.full_name,
        relationship: body.relationship,
        birthday: body.birthday || null,
        email: body.email || null,
        phone: body.phone || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) return internalErrorResponse(error.message);
    return successResponse(data, 201);
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
