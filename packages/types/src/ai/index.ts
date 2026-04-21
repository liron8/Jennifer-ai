/**
 * AI Engine Types
 */

export type InsightType = 
  | 'conflict'
  | 'reminder'
  | 'suggestion'
  | 'anomaly'
  | 'optimization'
  | 'preparation'
  | 'follow_up';

export type InsightPriority = 'low' | 'medium' | 'high' | 'urgent';
export type InsightStatus = 'active' | 'dismissed' | 'actioned' | 'expired';

export interface SuggestedAction {
  id: string;
  action_type: string;
  label: string;
  description?: string;
  payload: Record<string, unknown>;
}

export interface AIInsight {
  id: string;
  org_id: string;
  user_id: string;
  executive_id?: string;
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  title: string;
  description: string;
  suggested_actions: SuggestedAction[];
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
  dismissed_at?: string;
  actioned_at?: string;
  created_at: string;
}

export interface AIInsightFilters {
  executive_id?: string;
  type?: InsightType | InsightType[];
  priority?: InsightPriority | InsightPriority[];
  status?: InsightStatus;
}

export type PatternType = 
  | 'meeting_time'
  | 'task_completion'
  | 'approval_behavior'
  | 'communication'
  | 'scheduling';

export interface AIPattern {
  id: string;
  org_id: string;
  executive_id?: string;
  pattern_type: PatternType;
  pattern_data: Record<string, unknown>;
  confidence: number;
  sample_count: number;
  last_updated_at: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  org_id: string;
  user_id: string;
  executive_id?: string;
  title: string;
  last_message_at: string;
  message_count: number;
  created_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tool_calls?: ToolCall[];
  created_at: string;
}

export interface AIEmbedding {
  id: string;
  org_id: string;
  content_type: string;
  content_id: string;
  content_text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  executive_id?: string;
  conversation_id?: string;
}

export interface AIContext {
  user: {
    id: string;
    full_name?: string;
    timezone: string;
  };
  organization: {
    id: string;
    name: string;
    ai_settings: Record<string, unknown>;
  };
  executive?: {
    id: string;
    full_name: string;
    preferences: Record<string, unknown>;
  };
  temporal: {
    current_time: string;
    timezone: string;
    todays_meetings: unknown[];
    upcoming_tasks: unknown[];
    pending_approvals: unknown[];
    upcoming_key_dates: unknown[];
  };
  patterns?: AIPattern[];
}

export interface GenerateRequest {
  type: 'email' | 'brief' | 'summary' | 'response';
  input: Record<string, unknown>;
  executive_id?: string;
}

export interface GenerateResponse {
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
}
