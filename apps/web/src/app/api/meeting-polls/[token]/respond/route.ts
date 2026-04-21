/**
 * Public Meeting Poll Response API
 * POST /api/meeting-polls/[token]/respond - Submit poll vote (no auth required)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const respondSchema = z.object({
  respondent_name: z.string().min(1).max(255),
  respondent_email: z.string().email().max(255).optional(),
  selected_options: z.array(z.number().int().min(0)).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid token' } },
      { status: 400 }
    );
  }

  let body: z.infer<typeof respondSchema>;
  try {
    const raw = await request.json();
    body = respondSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 422 }
    );
  }

  try {
    const supabase = await createClient();

    // Look up the poll by token
    const { data: poll, error: pollError } = await supabase
      .from('meeting_polls')
      .select('id, status')
      .eq('link_token', token)
      .eq('status', 'active')
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Poll not found or expired' } },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('meeting_poll_responses')
      .insert({
        poll_id: poll.id,
        respondent_name: body.respondent_name,
        respondent_email: body.respondent_email ?? null,
        selected_options: body.selected_options,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving poll response:', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to save response' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error processing poll response:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
