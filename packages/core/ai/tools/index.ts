/**
 * AI Tools Registry
 * Defines all tools available to the AI assistant
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@jeniferai/core-database';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: unknown, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  orgId: string;
  executiveId?: string;
  timezone: string;
  supabase: SupabaseClient<Database>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export const toolRegistry: Map<string, ToolDefinition> = new Map();

export function registerTool(tool: ToolDefinition): void {
  toolRegistry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

export function getToolsForVercelAI(): Array<{
  name: string;
  description: string;
  parameters: z.ZodSchema;
}> {
  return getAllTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
