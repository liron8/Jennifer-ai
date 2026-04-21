/**
 * Invitation API Route
 * GET /api/invitations/[token] - Get invitation details
 * POST /api/invitations/[token] - Accept invitation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  
  try {
    const supabase = await createClient();

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        organizations:org_id (
          id,
          name,
          logo_url
        ),
        inviter:invited_by (
          full_name,
          email
        )
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 410 }
      );
    }

    return NextResponse.json({ data: invitation });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Validate invitation
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 410 }
      );
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if user already exists in the organization
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // User already has a profile - update their org_id
      const { error: updateError } = await supabase
        .from('users')
        .update({
          org_id: invitation.org_id,
          role: invitation.role,
          onboarding_completed: false, // They need to complete invited user onboarding
          onboarding_step: 0,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to accept invitation' },
          { status: 500 }
        );
      }
    } else {
      // Create new user profile
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          org_id: invitation.org_id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          role: invitation.role,
          onboarding_completed: false,
          onboarding_step: 0,
        });

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to accept invitation' },
          { status: 500 }
        );
      }
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (acceptError) {
      console.error('Error accepting invitation:', acceptError);
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted',
      redirect: '/onboarding',
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
