/**
 * Public Meeting Poll API
 * GET /api/meeting-polls/[token] - Fetch poll data by token (no auth required)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid token' } },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('meeting_polls')
      .select('id, title, duration_minutes, time_options, status')
      .eq('link_token', token)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Poll not found or expired' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching meeting poll:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
