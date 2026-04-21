/**
 * Meetings API Routes
 * GET /api/meetings - List meetings
 * POST /api/meetings - Create meeting
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
  parseQueryParams,
  parsePaginationParams,
  buildPaginationMeta,
  validateBody,
  parseZodError,
} from '@/lib/api/utils';
import { createMeetingSchema, meetingQuerySchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';
import { eventBus } from '@jeniferai/core-event-bus';
import { syncMeetingToExternalCalendars } from '@/lib/calendar-sync';

async function handleGet(request: NextRequest, context: AuthContext) {
  const params = parseQueryParams(request.url);
  const validation = meetingQuerySchema.safeParse(params);

  if (!validation.success) {
    return validationErrorResponse(parseZodError(validation.error));
  }

  const { page, pageSize } = parsePaginationParams(params);
  const filters = validation.data;

  try {
    // Use admin client to bypass RLS (we already authenticated via middleware)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    
    let query = supabase
      .from('meetings')
      .select('*, executive:executive_profiles(full_name)', { count: 'exact' })
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null);

    // Apply filters
    if (filters.executive_id) {
      query = query.eq('executive_id', filters.executive_id);
    }

    if (filters.meeting_type) {
      query = query.eq('meeting_type', filters.meeting_type);
    }

    if (filters.location_type) {
      query = query.eq('location_type', filters.location_type);
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    // Date filtering based on status
    const now = new Date().toISOString();
    if (filters.status === 'upcoming') {
      query = query.gte('start_time', now);
    } else if (filters.status === 'past') {
      query = query.lt('start_time', now);
    } else if (filters.status === 'pending') {
      query = query.in('status', ['pending', 'tentative']);
    } else if (filters.status === 'cancelled') {
      query = query.eq('status', 'cancelled');
    }

    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('start_time', filters.end_date);
    }

    // Pagination and ordering
    query = query
      .order('start_time', { ascending: filters.status !== 'past' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
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
    createMeetingSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Merge reminder_minutes and user-supplied metadata into the metadata JSONB
    const mergedMetadata: Record<string, unknown> = { ...(body.metadata ?? {}) };
    if (typeof body.reminder_minutes === 'number') {
      mergedMetadata.reminder_minutes = body.reminder_minutes;
    }

    const meetingData = {
      org_id: context.user.org_id,
      title: body.title,
      description: body.description,
      start_time: body.start_time,
      end_time: body.end_time,
      timezone: body.timezone,
      is_all_day: body.is_all_day,
      status: 'confirmed',
      location_type: body.location_type,
      location: body.location,
      location_details: body.location_address,
      video_conference_url: body.video_conference_url,
      video_conference_provider: body.video_conference_provider,
      meeting_type: body.meeting_type,
      attendees: body.attendees,
      executive_id: body.executive_id,
      is_recurring: body.is_recurring,
      recurrence_rule: body.recurrence_rule,
      metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : null,
      created_by: context.user.id,
    };

    const { data, error } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return internalErrorResponse(error.message);
    }

    // TODO: If create_video_conference is true, create video conference link

    // Emit meeting.created event (fire-and-forget for proactive AI analysis)
    void eventBus.publish({
      type: 'meeting.created',
      payload: data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api.meetings.post',
        orgId: context.user.org_id,
        userId: context.user.id,
        correlationId: data.id,
      },
    });

    // Sync to external calendars (fire-and-forget)
    void syncMeetingToExternalCalendars(data, context.user.id, context.user.org_id)
      .then((results) => {
        if (results.length > 0) {
          console.log('Calendar sync results:', results);
        }
      })
      .catch((err) => {
        console.error('Calendar sync error:', err);
      });

    return successResponse({ data }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
