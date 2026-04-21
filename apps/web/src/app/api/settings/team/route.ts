/**
 * Team Settings API Route
 * GET /api/settings/team - List team members
 * POST /api/settings/team - Invite new team member (admin only)
 */

import type { NextRequest } from 'next/server';
import { withAuth, withAdmin, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'user']).default('user'),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, created_at, last_seen_at')
      .eq('org_id', context.user.org_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team:', error);
      return internalErrorResponse(error.message);
    }

    // Also get pending invitations
    const { data: invitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('org_id', context.user.org_id)
      .eq('status', 'pending');

    return successResponse({
      data: {
        members: data || [],
        pending_invitations: invitations || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    inviteSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Check if user already exists in org
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', context.user.org_id)
      .eq('email', body.email)
      .single();

    if (existingUser) {
      return internalErrorResponse('User already exists in organization');
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('org_id', context.user.org_id)
      .eq('email', body.email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return internalErrorResponse('Invitation already pending for this email');
    }

    // Create invitation
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        org_id: context.user.org_id,
        email: body.email,
        role: body.role,
        invited_by: context.user.id,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return internalErrorResponse(error.message);
    }

    // TODO: Send invitation email

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAdmin(handlePost);
