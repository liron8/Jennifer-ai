/**
 * Integration Disconnect API Route
 * POST /api/integrations/[provider]/disconnect - Disconnect integration
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ provider: string }>;
}

async function handlePost(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { provider } = await params;

  try {
    const supabase = await createClient();

    // Find the integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('org_id', context.user.org_id)
      .eq('user_id', context.user.id)
      .eq('provider', provider)
      .single();

    if (!integration) {
      return notFoundResponse('Integration');
    }

    // Update status to revoked
    const { error } = await supabase
      .from('integrations')
      .update({
        status: 'revoked',
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (error) {
      console.error('Error disconnecting integration:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePost(req, ctx, routeParams))(request);
}
