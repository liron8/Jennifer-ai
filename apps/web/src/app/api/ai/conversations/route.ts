/**
 * AI Conversations API Route
 * GET /api/ai/conversations — List past conversations
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  parseQueryParams,
} from '@/lib/api/utils';
import { createAdminClient } from '@jeniferai/core-database';
import { listConversations, getConversationMessages } from '@jeniferai/ai/conversation-store';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const executiveId = params.executive_id;
  const conversationId = params.conversation_id;
  const limit = Math.min(parseInt(params.limit || '20', 10), 100);
  const offset = Math.max(parseInt(params.offset || '0', 10), 0);

  try {
    const adminClient = createAdminClient();

    // If a specific conversation_id is provided, return its messages
    if (conversationId) {
      const messages = await getConversationMessages(adminClient, conversationId, limit);
      return successResponse({ data: { conversationId, messages } });
    }

    // Otherwise, list conversations
    const { conversations, total } = await listConversations(adminClient, {
      userId: context.user.id,
      orgId: context.user.org_id,
      executiveId,
      limit,
      offset,
    });

    return successResponse({
      data: {
        conversations,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      },
    });
  } catch (error) {
    console.error('Conversations list error:', error);
    return internalErrorResponse('Failed to fetch conversations');
  }
}

export const GET = withAuth(handleGet);
