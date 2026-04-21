/**
 * Conversation Store
 * Encapsulates conversation persistence: create, getMessages, saveMessage, list
 */

import type { Database } from '@jeniferai/core-database';

type ConversationRow = Database['public']['Tables']['ai_conversations']['Row'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type MessageRow = Database['public']['Tables']['ai_messages']['Row'];

// Use a loose client type to avoid generic mismatch between packages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokensUsed?: number;
  toolCalls?: unknown;
  toolResults?: unknown;
}

/**
 * Create a new conversation or return an existing one.
 */
export async function getOrCreateConversation(
  supabase: SupabaseAny,
  opts: {
    conversationId?: string;
    userId: string;
    orgId: string;
    executiveId?: string;
    title?: string;
  }
): Promise<{ id: string; isNew: boolean }> {
  // If an ID was provided, verify it exists and belongs to this user/org
  if (opts.conversationId) {
    const { data } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', opts.conversationId)
      .eq('org_id', opts.orgId)
      .eq('user_id', opts.userId)
      .single();

    if (data) {
      return { id: data.id, isNew: false };
    }
    // If the ID doesn't exist, fall through and create a new one
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: opts.userId,
      org_id: opts.orgId,
      executive_id: opts.executiveId,
      title: opts.title || 'New conversation',
      status: 'active',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }

  return { id: data.id, isNew: true };
}

/**
 * Get message history for a conversation (for feeding back into the AI).
 */
export async function getConversationMessages(
  supabase: SupabaseAny,
  conversationId: string,
  limit = 50
): Promise<Array<{ role: string; content: string }>> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch conversation messages:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Save a message to the conversation.
 */
export async function saveMessage(
  supabase: SupabaseAny,
  conversationId: string,
  message: ConversationMessage
): Promise<void> {
  const { error } = await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: message.role,
    content: message.content,
    model: message.model ?? null,
    tokens_used: message.tokensUsed ?? null,
    tool_calls: message.toolCalls ? JSON.stringify(message.toolCalls) : null,
    tool_results: message.toolResults ? JSON.stringify(message.toolResults) : null,
  });

  if (error) {
    console.error('Failed to save message:', error.message);
  }

  // Update conversation timestamp
  await supabase
    .from('ai_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

/**
 * List conversations for a user.
 */
export async function listConversations(
  supabase: SupabaseAny,
  opts: {
    userId: string;
    orgId: string;
    executiveId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ conversations: ConversationRow[]; total: number }> {
  let query = supabase
    .from('ai_conversations')
    .select('*', { count: 'exact' })
    .eq('user_id', opts.userId)
    .eq('org_id', opts.orgId)
    .order('last_message_at', { ascending: false })
    .range(opts.offset || 0, (opts.offset || 0) + (opts.limit || 20) - 1);

  if (opts.executiveId) {
    query = query.eq('executive_id', opts.executiveId);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Failed to list conversations:', error.message);
    return { conversations: [], total: 0 };
  }

  return { conversations: data || [], total: count || 0 };
}

/**
 * Update conversation title (auto-generated from first message).
 */
export async function updateConversationTitle(
  supabase: SupabaseAny,
  conversationId: string,
  title: string
): Promise<void> {
  await supabase
    .from('ai_conversations')
    .update({ title })
    .eq('id', conversationId);
}
