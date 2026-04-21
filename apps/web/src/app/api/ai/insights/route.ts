/**
 * AI Insights API Route
 * GET /api/ai/insights - Get AI-generated insights
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  parseQueryParams,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const executiveId = params.executive_id;
  const type = params.type || 'all';
  const limit = Math.min(parseInt(params.limit || '10', 10), 50);

  try {
    const supabase = await createClient();

    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('org_id', context.user.org_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (executiveId) {
      query = query.eq('executive_id', executiveId);
    }

    if (type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching insights:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
