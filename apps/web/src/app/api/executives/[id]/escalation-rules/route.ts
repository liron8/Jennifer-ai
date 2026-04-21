/**
 * Escalation Rules API Routes
 * GET /api/executives/[id]/escalation-rules - List rules
 * POST /api/executives/[id]/escalation-rules - Add rule
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
  rule_description: z.string().min(1).max(2000),
  sort_order: z.number().int().min(0).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('executive_escalation_rules')
      .select('*')
      .eq('executive_id', id)
      .eq('org_id', context.user.org_id)
      .order('sort_order', { ascending: true })
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
    const { data, error } = await supabase
      .from('executive_escalation_rules')
      .insert({
        org_id: context.user.org_id,
        executive_id: id,
        rule_description: body.rule_description,
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
