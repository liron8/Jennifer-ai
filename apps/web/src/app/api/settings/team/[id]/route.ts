/**
 * Team Member API Route
 * PATCH /api/settings/team/:id - Update team member role/details (admin only)
 * DELETE /api/settings/team/:id - Remove team member (admin only)
 */

import type { NextRequest } from 'next/server';
import { withAdmin, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recordAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  full_name: z.string().min(1).max(255).optional(),
  job_title: z.string().max(255).optional().nullable(),
});

async function handlePatch(request: NextRequest, context: AuthContext) {
  const id = request.url.split('/team/')[1]?.split('?')[0];

  if (!id) {
    return internalErrorResponse('Member ID is required');
  }

  const { data: body, error: validationError } = await validateBody(
    request,
    updateMemberSchema
  );

  if (validationError) {
    return validationError;
  }

  // Prevent self-demotion from admin
  if (id === context.user.id && body.role && body.role !== 'admin') {
    return internalErrorResponse('You cannot change your own admin role');
  }

  try {
    const supabase = await createClient();

    // Verify member belongs to same org
    const { data: member, error: findError } = await supabase
      .from('users')
      .select('id, org_id, role')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (findError || !member) {
      return internalErrorResponse('Team member not found');
    }

    const updateData: Record<string, unknown> = {};
    if (body.role !== undefined) updateData.role = body.role;
    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.job_title !== undefined) updateData.job_title = body.job_title;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .select('id, email, full_name, role, avatar_url, job_title, created_at, last_seen_at')
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      return internalErrorResponse(error.message);
    }

    void recordAuditLog({
      orgId: context.user.org_id,
      userId: context.user.id,
      action: 'updated',
      entityType: 'team_member',
      entityId: id,
      oldValues: { role: member.role },
      newValues: updateData,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return successResponse(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext) {
  const id = request.url.split('/team/')[1]?.split('?')[0];

  if (!id) {
    return internalErrorResponse('Member ID is required');
  }

  // Prevent self-removal
  if (id === context.user.id) {
    return internalErrorResponse('You cannot remove yourself from the organization');
  }

  try {
    const supabase = await createClient();

    // Verify member belongs to same org
    const { data: member, error: findError } = await supabase
      .from('users')
      .select('id, org_id, email')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (findError || !member) {
      return internalErrorResponse('Team member not found');
    }

    // Soft-delete: deactivate rather than hard delete
    const { error } = await supabase
      .from('users')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error removing team member:', error);
      return internalErrorResponse(error.message);
    }

    void recordAuditLog({
      orgId: context.user.org_id,
      userId: context.user.id,
      action: 'revoked_access',
      entityType: 'team_member',
      entityId: id,
      oldValues: { email: member.email },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return successResponse({ message: 'Team member access revoked' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const PATCH = withAdmin(handlePatch);
export const DELETE = withAdmin(handleDelete);
