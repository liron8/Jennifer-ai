/**
 * Approval Tools
 * AI tools for approval workflow management — wired to real Supabase data
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const getApprovalsParams = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'info_requested', 'all']).default('pending'),
  executiveId: z.string().uuid().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
  limit: z.number().min(1).max(50).default(10),
});

const getApprovalDetailsParams = z.object({
  approvalId: z.string().uuid(),
});

const summarizeApprovalParams = z.object({
  approvalId: z.string().uuid(),
});

registerTool({
  name: 'get_approvals',
  description: 'Retrieve pending or historical approvals. Useful for checking what needs executive attention.',
  parameters: getApprovalsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getApprovalsParams.parse(params);
    const { supabase, orgId } = context;
    const execId = validated.executiveId || context.executiveId;

    let query = supabase
      .from('approvals')
      .select('id, title, description, approval_type, status, urgency, amount, currency, category, due_date, submitted_by, created_at, decision_notes')
      .eq('org_id', orgId)
      .order('urgency', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(validated.limit);

    if (validated.status !== 'all') {
      query = query.eq('status', validated.status);
    }
    if (validated.urgency !== 'all') {
      query = query.eq('urgency', validated.urgency);
    }
    if (execId) {
      query = query.eq('executive_id', execId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { approvals: data || [], count: data?.length || 0 },
    };
  },
});

registerTool({
  name: 'get_approval_details',
  description: 'Get full details of a specific approval including attachments and history.',
  parameters: getApprovalDetailsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getApprovalDetailsParams.parse(params);
    const { supabase, orgId } = context;

    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', validated.approvalId)
      .eq('org_id', orgId)
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { approval: data },
    };
  },
});

registerTool({
  name: 'summarize_approval',
  description: 'Generate a concise summary of an approval request for quick executive review.',
  parameters: summarizeApprovalParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = summarizeApprovalParams.parse(params);
    const { supabase, orgId } = context;

    // Fetch the approval
    const { data: approval, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', validated.approvalId)
      .eq('org_id', orgId)
      .single();

    if (error || !approval) return { success: false, error: error?.message || 'Approval not found' };

    // Fetch historical approvals of same type for context
    const { data: historical } = await supabase
      .from('approvals')
      .select('amount, status')
      .eq('org_id', orgId)
      .eq('approval_type', approval.approval_type)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    const avgAmount = historical && historical.length > 0
      ? historical.reduce((sum: number, h: { amount?: number | null }) => sum + (h.amount || 0), 0) / historical.length
      : null;

    const isUnusual = avgAmount && approval.amount && approval.amount > avgAmount * 2;

    const summary = [
      `**${approval.title}**`,
      `Type: ${approval.approval_type} | Urgency: ${approval.urgency}`,
      approval.amount ? `Amount: $${approval.amount.toLocaleString()} ${approval.currency || 'USD'}` : null,
      approval.description ? `Description: ${approval.description}` : null,
      approval.due_date ? `Due: ${approval.due_date}` : null,
      avgAmount ? `Average for this type: $${avgAmount.toFixed(0)}` : null,
      isUnusual ? '⚠️ Amount is significantly above average — review carefully' : null,
    ].filter(Boolean).join('\n');

    return {
      success: true,
      data: {
        approvalId: validated.approvalId,
        summary,
        is_unusual: isUnusual || false,
        average_amount: avgAmount,
      },
    };
  },
});

export { getApprovalsParams, getApprovalDetailsParams, summarizeApprovalParams };
