/**
 * Approvals API Routes
 * GET /api/approvals - List approvals
 * POST /api/approvals - Create approval
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
  validationErrorResponse,
  parseZodError,
} from '@/lib/api/utils';
import { createApprovalSchema, approvalQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';
import { eventBus } from '@jeniferai/core-event-bus';
import { recordAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = approvalQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    const supabase = await createClient();

    let query = supabase
      .from('approvals')
      .select('*, executive:executive_profiles!executive_id(full_name), submitter:users!submitted_by(full_name)', { count: 'exact' })
      .eq('org_id', context.user.org_id);

    if (filters.executive_id) {
      query = query.eq('executive_id', filters.executive_id);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }

    if (filters.approval_type) {
      query = query.eq('approval_type', filters.approval_type);
    }

    if (filters.urgency) {
      const urgencies = Array.isArray(filters.urgency) ? filters.urgency : [filters.urgency];
      query = query.in('urgency', urgencies);
    }

    if (filters.submitted_by) {
      query = query.eq('submitted_by', filters.submitted_by);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching approvals:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({
      data: data || [],
      meta: buildPaginationMeta(page, pageSize, count || 0),
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    createApprovalSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const approvalData: Record<string, unknown> = {
      org_id: context.user.org_id,
      title: body.title,
      description: body.description || null,
      approval_type: body.approval_type,
      status: 'pending',
      urgency: body.urgency || 'medium',
      amount: body.amount || null,
      currency: body.currency || null,
      due_date: body.due_date || null,
      executive_id: body.executive_id,
      submitted_by: context.user.id,
      category: body.category || null,
      attachments: body.attachments || null,
    };

    const { data, error } = await supabase
      .from('approvals')
      .insert(approvalData)
      .select()
      .single();

    if (error) {
      console.error('Error creating approval:', error);
      return internalErrorResponse(error.message);
    }

    void recordAuditLog({
      orgId: context.user.org_id,
      userId: context.user.id,
      action: 'created',
      entityType: 'approval',
      entityId: data.id,
      newValues: { title: data.title, approval_type: data.approval_type, urgency: data.urgency },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Emit approval.created event (fire-and-forget for anomaly detection)
    void eventBus.publish({
      type: 'approval.created',
      payload: data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api.approvals.post',
        orgId: context.user.org_id,
        userId: context.user.id,
        correlationId: data.id,
      },
    });

    return successResponse(data, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
