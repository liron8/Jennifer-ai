/**
 * AI Orchestrator
 * Main entry point for AI interactions
 */

import { generateText, streamText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { createAdminClient } from '@jeniferai/core-database';
import { defaultAIConfig, systemPrompts } from './config';
import { buildContext, formatContextForPrompt } from './context-builder';
import { getAllTools, type ToolContext } from './tools';
import type { ChatMessage } from '@jeniferai/types';

// Import tool registrations (side-effect imports that call registerTool)
import './tools/calendar';
import './tools/tasks';
import './tools/approvals';
import './tools/contacts';
import './tools/generation';
import './tools/insights';
import './tools/search';

export interface ChatOptions {
  userId: string;
  orgId: string;
  executiveId?: string;
  timezone: string;
  conversationId?: string;
  /** Optional: pass the caller's Supabase client (e.g. user-session-authenticated).
   *  Falls back to createAdminClient() if omitted. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any;
}

export interface ChatResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
}

/**
 * Resolve a Supabase client: prefer an explicitly-passed client,
 * fall back to the service-role admin client, or return null if
 * the admin key is missing / invalid.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSupabase(options: ChatOptions): any | null {
  if (options.supabase) return options.supabase;
  try {
    return createAdminClient();
  } catch {
    console.warn('[AI] No supabase client available — context & tools will be limited');
    return null;
  }
}

function getModel(provider: 'anthropic' | 'openai', modelName: string) {
  if (provider === 'anthropic') {
    return anthropic(modelName);
  }
  return openai(modelName);
}

/**
 * Build the Vercel AI SDK v6 compatible tools object from our registry.
 * Each tool uses the `tool()` helper with Zod parameters and an execute function.
 */
function buildToolsForAI(toolContext: ToolContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};
  for (const t of getAllTools()) {
    tools[t.name] = tool({
      description: t.description,
      inputSchema: t.parameters,
      execute: async (params: unknown) => t.execute(params, toolContext),
    });
  }
  return tools;
}

/**
 * Non-streaming chat — returns complete response after all tool calls resolve.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const config = defaultAIConfig.chat;
  const supabase = resolveSupabase(options);

  let systemMessage = systemPrompts.assistant;

  // Build rich context only if we have a DB client
  if (supabase) {
    const context = await buildContext({
      userId: options.userId,
      orgId: options.orgId,
      executiveId: options.executiveId,
      timezone: options.timezone,
      supabase,
    });
    const contextPrompt = formatContextForPrompt(context);
    systemMessage = `${systemMessage}\n\n--- Current Context ---\n${contextPrompt}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiTools: Record<string, any> = {};
  if (supabase) {
    const toolContext: ToolContext = {
      userId: options.userId,
      orgId: options.orgId,
      executiveId: options.executiveId,
      timezone: options.timezone,
      supabase,
    };
    Object.assign(aiTools, buildToolsForAI(toolContext));
  }

  const model = getModel(config.provider, config.model);

  const result = await generateText({
    model,
    system: systemMessage,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
    stopWhen: stepCountIs(5),
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
  });

  return {
    content: result.text,
    toolCalls: result.toolCalls?.map((tc) => ({
      name: tc.toolName,
      arguments: (tc as Record<string, unknown>).args as Record<string, unknown> || {},
      result: (tc as Record<string, unknown>).result,
    })),
  };
}

/**
 * Streaming chat — returns the raw streamText result so the API route
 * can call .toDataStreamResponse() for proper SSE streaming.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function streamChat(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<any> {
  const config = defaultAIConfig.chat;
  const supabase = resolveSupabase(options);

  let systemMessage = systemPrompts.assistant;

  // Build rich context only if we have a DB client
  if (supabase) {
    try {
      const context = await buildContext({
        userId: options.userId,
        orgId: options.orgId,
        executiveId: options.executiveId,
        timezone: options.timezone,
        supabase,
      });
      const contextPrompt = formatContextForPrompt(context);
      systemMessage = `${systemMessage}\n\n--- Current Context ---\n${contextPrompt}`;
    } catch (err) {
      console.warn('[AI] Failed to build context, proceeding without:', err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiTools: Record<string, any> = {};
  if (supabase) {
    const toolContext: ToolContext = {
      userId: options.userId,
      orgId: options.orgId,
      executiveId: options.executiveId,
      timezone: options.timezone,
      supabase,
    };
    Object.assign(aiTools, buildToolsForAI(toolContext));
  }

  const model = getModel(config.provider, config.model);

  return streamText({
    model,
    system: systemMessage,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
    stopWhen: stepCountIs(5),
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
    onFinish: async ({ text, toolCalls, usage }) => {
      // Persist assistant response — best-effort, skip if no DB client
      if (options.conversationId && supabase) {
        try {
          await supabase.from('ai_messages').insert({
            conversation_id: options.conversationId,
            role: 'assistant',
            content: text,
            model: config.model,
            tokens_used: usage?.totalTokens ?? null,
            tool_calls: toolCalls ? JSON.stringify(toolCalls) : null,
          });
          await supabase.from('ai_conversations').update({
            last_message_at: new Date().toISOString(),
          }).eq('id', options.conversationId);
        } catch (err) {
          console.error('Failed to persist AI message:', err);
        }
      }
    },
  });
}

/**
 * Generate a meeting brief by fetching meeting data and producing a summary.
 */
export async function generateMeetingBrief(
  meetingId: string,
  options: ChatOptions
): Promise<string> {
  const config = defaultAIConfig.generation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  // Fetch the meeting with related data
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('org_id', options.orgId)
    .single();

  if (error || !meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  // Fetch related tasks for this meeting
  const { data: relatedTasks } = await supabase
    .from('tasks')
    .select('title, status, priority, due_date')
    .eq('related_meeting_id', meetingId)
    .eq('org_id', options.orgId)
    .is('deleted_at', null);

  const model = getModel(config.provider, config.model);

  const result = await generateText({
    model,
    system: systemPrompts.briefGenerator,
    messages: [{
      role: 'user' as const,
      content: `Generate a meeting brief for:\n\nMeeting: ${meeting.title}\nTime: ${meeting.start_time} - ${meeting.end_time}\nLocation: ${meeting.location || 'Not specified'} (${meeting.location_type || 'virtual'})\nAttendees: ${JSON.stringify(meeting.attendees || [])}\nDescription: ${meeting.description || 'None'}\n\nRelated Tasks:\n${(relatedTasks || []).map((t: { priority: string; title: string; status: string }) => `- [${t.priority}] ${t.title} (${t.status})`).join('\n') || 'None'}`,
    }],
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
  });

  // Save brief to the meeting record
  await supabase
    .from('meetings')
    .update({ ai_meeting_brief: result.text })
    .eq('id', meetingId);

  return result.text;
}

/**
 * Analyze data and produce actionable insights.
 */
export async function analyzeForInsights(
  data: Record<string, unknown>,
  options: ChatOptions
): Promise<string> {
  const config = defaultAIConfig.analysis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  // Enrich with context if not already provided
  if (!data.context) {
    const context = await buildContext({
      userId: options.userId,
      orgId: options.orgId,
      executiveId: options.executiveId,
      timezone: options.timezone,
      supabase,
    });
    data.context = formatContextForPrompt(context);
  }

  const model = getModel(config.provider, config.model);

  const result = await generateText({
    model,
    system: systemPrompts.insightAnalyzer,
    messages: [{
      role: 'user' as const,
      content: `Analyze the following data and provide actionable insights:\n${JSON.stringify(data, null, 2)}`,
    }],
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
  });

  return result.text;
}
