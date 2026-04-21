/**
 * Emergency Contacts API Routes
 * GET /api/executives/[id]/emergency-contacts - List emergency contacts
 * POST /api/executives/[id]/emergency-contacts - Add emergency contact
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
  category: z.enum(['business', 'personal']),
  role: z.string().max(100).optional(),
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  sort_order: z.number().int().min(0).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('executive_emergency_contacts')
      .select('*')
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .order('category')
      .order('sort_order', { ascending: true });

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
      .from('executive_emergency_contacts')
      .insert({
        org_id: context.user.org_id,
        executive_id: id,
        category: body.category,
        role: body.role || null,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        sort_order: body.sort_order ?? 0,
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
