/**
 * Notifications API Route
 * GET /api/notifications - List notifications
 * PATCH /api/notifications - Mark notifications as read
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  parseQueryParams,
  parsePaginationParams,
  buildPaginationMeta,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const { page, pageSize } = parsePaginationParams(params);
  const isRead = params.is_read === 'true' ? true : params.is_read === 'false' ? false : undefined;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false });

    if (isRead !== undefined) {
      query = query.eq('is_read', isRead);
    }

    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return internalErrorResponse(error.message);
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.user.id)
      .eq('is_read', false);

    return successResponse({
      data: data || [],
      meta: {
        ...buildPaginationMeta(page, pageSize, count || 0),
        unread_count: unreadCount || 0,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    markReadSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', context.user.id)
      .in('id', body.notification_ids);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch);
