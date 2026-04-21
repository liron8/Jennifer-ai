/**
 * Audit Log API Route
 * GET /api/settings/audit - Get audit log entries
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
  const limit = parseInt(params.limit || '50', 10);
  const offset = parseInt(params.offset || '0', 10);

  try {
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from('audit_log')
      .select('*, user:users!user_id(email, full_name)', { count: 'exact' })
      .eq('org_id', context.user.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching audit log:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
