/**
 * Public Availability Link API
 * GET /api/availability/[token] - Fetch availability link data by token (no auth required)
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
      .from('availability_links')
      .select('id, title, date_range_start, date_range_end, time_window_start, time_window_end, slot_duration_minutes, status')
      .eq('link_token', token)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Availability link not found or expired' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching availability link:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
