/**
 * Integrations API Route
 * GET /api/integrations - List user's integrations
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse } from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('integrations')
      .select('id, provider, integration_type, status, provider_email, last_synced_at, created_at')
      .eq('org_id', context.user.org_id)
      .eq('user_id', context.user.id);

    if (error) {
      console.error('Error fetching integrations:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
