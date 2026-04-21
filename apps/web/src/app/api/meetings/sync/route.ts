/**
 * Meeting Calendar Sync API Route
 * POST /api/meetings/sync          - Sync a specific meeting (body: { meeting_id })
 * POST /api/meetings/sync?all=1    - Sync all unsynced meetings for the current user
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  badRequestResponse,
} from '@/lib/api/utils';
import {
  syncMeetingToExternalCalendars,
  importAllExternalCalendarEvents,
} from '@/lib/calendar-sync';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const url = new URL(request.url);
    const syncAll = url.searchParams.get('all') === '1';
    const direction = url.searchParams.get('direction'); // 'pull' | 'push' | undefined (both)

    if (syncAll) {
      // Bidirectional sync:
      // 1. PULL: import events from Outlook/Google into our meetings table
      //    (so dashboard, calendar, route planner, etc. can see them).
      // 2. PUSH: upload any JenAI-only meetings to the user's external calendars.

      let imported = 0;
      let updated = 0;
      const importErrors: string[] = [];

      if (direction !== 'push') {
        const importResults = await importAllExternalCalendarEvents(
          context.user.id,
          context.user.org_id,
        );
        for (const r of importResults) {
          imported += r.imported;
          updated += r.updated;
          if (!r.success && r.error) importErrors.push(`${r.provider}: ${r.error}`);
        }
      }

      let synced = 0;
      let failed = 0;
      let processed = 0;

      if (direction !== 'pull') {
        const { data: meetings, error } = await supabase
          .from('meetings')
          .select('*')
          .eq('org_id', context.user.org_id)
          .is('deleted_at', null)
          .is('external_event_id', null)
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(200);

        if (error) return internalErrorResponse(error.message);

        processed = meetings?.length ?? 0;
        for (const m of meetings || []) {
          const results = await syncMeetingToExternalCalendars(m, context.user.id, context.user.org_id);
          synced += results.filter((r) => r.success).length;
          failed += results.filter((r) => !r.success).length;
        }
      }

      return successResponse({
        imported,
        updated,
        processed,
        synced,
        failed,
        import_errors: importErrors,
      });
    }

    // Single meeting sync
    const body = await request.json();
    const { meeting_id } = body;

    if (!meeting_id) {
      return badRequestResponse('meeting_id is required');
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meeting_id)
      .eq('org_id', context.user.org_id)
      .single();

    if (error || !meeting) {
      return badRequestResponse('Meeting not found');
    }

    const results = await syncMeetingToExternalCalendars(
      meeting,
      context.user.id,
      context.user.org_id,
    );

    return successResponse({
      data: results,
      synced: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error('Error syncing meeting:', error);
    return internalErrorResponse();
  }
}

export const POST = withAuth(handlePost);
