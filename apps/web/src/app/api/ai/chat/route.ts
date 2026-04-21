/**
 * AI Chat API Route
 * POST /api/ai/chat — Streaming AI assistant endpoint
 *
 * Returns an SSE stream (Vercel AI SDK Data Stream protocol) that the
 * frontend `useChat()` hook consumes directly.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamChat } from '@jeniferai/ai';
import {
  getOrCreateConversation,
  saveMessage,
  updateConversationTitle,
} from '@jeniferai/ai/conversation-store';
import { createAdminClient } from '@jeniferai/core-database';

/**
 * Extract text content from a message that may use either:
 * - v4 format: { role, content: string }
 * - v6 format: { role, parts: [{ type: 'text', text: '...' }, ...] }
 */
function extractMessageContent(msg: Record<string, unknown>): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.parts)) {
    return (msg.parts as Array<{ type?: string; text?: string }>)
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
  }
  return '';
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via Supabase session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userData } = await supabase
      .from('users')
      .select('id, org_id, timezone, full_name')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not found' } },
        { status: 401 }
      );
    }

    // Parse request body — supports both v4 and v6 AI SDK wire formats
    const body = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Messages array is required' } },
        { status: 400 }
      );
    }

    // Normalize messages to { role, content } format for the orchestrator
    const messages = (body.messages as Array<Record<string, unknown>>).map((msg) => ({
      role: String(msg.role) as 'user' | 'assistant',
      content: extractMessageContent(msg),
    })).filter((m) => m.content.length > 0);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'At least one message with content is required' } },
        { status: 400 }
      );
    }

    const executiveId = typeof body.executiveId === 'string' ? body.executiveId : undefined;
    const requestedConvId = typeof body.conversationId === 'string' ? body.conversationId : undefined;

    // Conversation persistence is best-effort.
    // Try admin client first, fall back to user's session client, skip if both fail.
    let dbClient: ReturnType<typeof createAdminClient> | typeof supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      dbClient = supabase;
    }

    let conversationId: string | undefined;
    try {
      const result = await getOrCreateConversation(dbClient, {
        conversationId: requestedConvId,
        userId: userData.id,
        orgId: userData.org_id,
        executiveId,
      });
      conversationId = result.id;

      // Save the user's latest message
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage?.role === 'user') {
        await saveMessage(dbClient, conversationId, {
          role: 'user',
          content: lastUserMessage.content,
        });

        if (result.isNew) {
          const title = lastUserMessage.content.slice(0, 100);
          await updateConversationTitle(dbClient, conversationId, title);
        }
      }
    } catch (err) {
      // Conversation persistence failed — chat still works, just no history
      console.warn('[AI Chat] Conversation persistence skipped:', (err as Error).message);
    }

    // Stream AI response — pass user's authenticated client for context & tools
    const stream = await streamChat(messages, {
      userId: userData.id,
      orgId: userData.org_id,
      executiveId,
      timezone: userData.timezone || 'UTC',
      conversationId,
      supabase,
    });

    // Return SSE data stream with conversation ID in headers
    const responseHeaders: Record<string, string> = {};
    if (conversationId) {
      responseHeaders['X-Conversation-Id'] = conversationId;
    }
    // AI SDK v6: toUIMessageStreamResponse() replaces v4's toDataStreamResponse()
    return stream.toUIMessageStreamResponse({ headers: responseHeaders });
  } catch (error) {
    console.error('AI chat error:', error);

    // Detect AI provider auth errors (missing/invalid API key)
    const errMsg = error instanceof Error ? error.message : String(error);
    const isAuthError = /api.key|auth|unauthorized|401/i.test(errMsg);

    return NextResponse.json(
      {
        error: {
          code: isAuthError ? 'AI_CONFIG_ERROR' : 'INTERNAL_ERROR',
          message: isAuthError
            ? 'AI provider not configured. Please set a valid ANTHROPIC_API_KEY.'
            : 'Failed to process AI request',
        },
      },
      { status: isAuthError ? 503 : 500 }
    );
  }
}
