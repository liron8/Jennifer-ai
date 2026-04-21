/**
 * Organization Settings API Route
 * GET /api/settings/organization - Get organization settings
 * PATCH /api/settings/organization - Update organization settings (admin only)
 */

import type { NextRequest } from 'next/server';
import { withAuth, withAdmin, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logo_url: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  industry: z.string().max(100).optional(),
  company_size: z.string().max(50).optional(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zip_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  authorized_rep_name: z.string().max(255).optional().nullable(),
  authorized_rep_title: z.string().max(255).optional().nullable(),
  authorized_rep_email: z.string().email().optional().nullable(),
  authorized_rep_phone: z.string().max(50).optional().nullable(),
  settings: z.object({
    default_timezone: z.string().optional(),
    date_format: z.string().optional(),
    time_format: z.enum(['12h', '24h']).optional(),
    week_starts_on: z.enum(['saturday', 'sunday', 'monday']).optional(),
  }).optional(),
  ai_settings: z.object({
    enabled: z.boolean().optional(),
    proactive_insights: z.boolean().optional(),
    auto_brief_generation: z.boolean().optional(),
    preferred_model: z.string().optional(),
  }).optional(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', context.user.org_id)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    updateOrgSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Map company_size to DB column 'size'
    const { company_size, ...rest } = body;
    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };
    if (company_size !== undefined) {
      updatePayload.size = company_size;
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', context.user.org_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const PATCH = withAdmin(handlePatch);
