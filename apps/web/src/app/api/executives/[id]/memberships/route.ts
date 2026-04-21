/**
 * Memberships API Routes
 * GET /api/executives/[id]/memberships - List memberships
 * POST /api/executives/[id]/memberships - Add membership
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
  category: z.enum(['airlines', 'hotels', 'lounges', 'car_rental', 'other']),
  provider_name: z.string().min(1).max(255),
  program_name: z.string().max(255).optional(),
  member_number: z.string().max(100).optional(),
  tier: z.string().max(100).optional(),
  expires_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .order('category');

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
      .from('memberships')
      .insert({
        org_id: context.user.org_id,
        executive_id: id,
        category: body.category,
        provider_name: body.provider_name,
        program_name: body.program_name || null,
        member_number: body.member_number || null,
        tier: body.tier || null,
        expires_at: body.expires_at || null,
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
