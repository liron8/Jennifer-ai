/**
 * Calendar Sync Service
 * Creates, updates, and deletes events in external calendars
 * (Google Calendar, Microsoft Outlook) via their APIs.
 * Requires user to have connected their calendar via OAuth.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

interface MeetingData {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  attendees?: Array<{ email: string; name?: string; is_optional?: boolean }> | null;
  timezone?: string | null;
  is_all_day?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  metadata?: Record<string, unknown> | null;
  external_event_id?: string | null;
  external_calendar_provider?: string | null;
}

/**
 * Parse a simple RRULE (e.g. "FREQ=WEEKLY;INTERVAL=2") into a key/value map.
 */
function parseRRule(rrule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rrule.split(';')) {
    const [k, v] = part.split('=');
    if (k && v) out[k.trim().toUpperCase()] = v.trim().toUpperCase();
  }
  return out;
}

/**
 * Build Microsoft Graph recurrence payload from an RRULE string.
 * Supports DAILY, WEEKLY (with INTERVAL), MONTHLY, YEARLY.
 */
function buildMicrosoftRecurrence(
  rrule: string,
  startIso: string,
): Record<string, unknown> | null {
  const r = parseRRule(rrule);
  if (!r.FREQ) return null;

  const startDate = startIso.split('T')[0];
  let pattern: Record<string, unknown>;

  switch (r.FREQ) {
    case 'DAILY':
      pattern = { type: 'daily', interval: Number(r.INTERVAL) || 1 };
      break;
    case 'WEEKLY': {
      const day = new Date(startIso).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      pattern = {
        type: 'weekly',
        interval: Number(r.INTERVAL) || 1,
        daysOfWeek: [day],
      };
      break;
    }
    case 'MONTHLY':
      pattern = {
        type: 'absoluteMonthly',
        interval: Number(r.INTERVAL) || 1,
        dayOfMonth: new Date(startIso).getUTCDate(),
      };
      break;
    case 'YEARLY':
      pattern = {
        type: 'absoluteYearly',
        interval: Number(r.INTERVAL) || 1,
        dayOfMonth: new Date(startIso).getUTCDate(),
        month: new Date(startIso).getUTCMonth() + 1,
      };
      break;
    default:
      return null;
  }

  return {
    pattern,
    range: { type: 'noEnd', startDate },
  };
}

/**
 * Build Google Calendar recurrence payload — straight RFC 5545 RRULEs.
 */
function buildGoogleRecurrence(rrule: string): string[] {
  // Google expects full RRULE lines with the "RRULE:" prefix.
  return [`RRULE:${rrule.replace(/^RRULE:/i, '')}`];
}

interface IntegrationTokens {
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  provider: string;
}

interface CalendarSyncResult {
  success: boolean;
  provider: string;
  external_event_id?: string;
  error?: string;
}

/**
 * Convert an ISO timestamp (possibly with offset or Z) into the naive
 * local datetime format Microsoft Graph expects: `YYYY-MM-DDTHH:mm:ss`.
 * The accompanying `timeZone` field tells Graph how to interpret it.
 */
function toGraphDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Produce a UTC naive string. We always send timeZone: 'UTC' alongside.
  return d.toISOString().replace(/\.\d{3}Z$/, '');
}

/**
 * Refresh Microsoft OAuth token if expired
 */
async function refreshMicrosoftToken(refreshToken: string) {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid profile email offline_access Calendars.ReadWrite Mail.Read',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Microsoft token:', await response.text());
      return null;
    }

    return (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error);
    return null;
  }
}

/**
 * Refresh Google OAuth token if expired
 */
async function refreshGoogleToken(refreshToken: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token:', await response.text());
      return null;
    }

    return (await response.json()) as { access_token: string; expires_in: number };
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken(
  integration: IntegrationTokens,
  updateTokenFn?: (newToken: string, expiresAt: string, newRefreshToken?: string) => Promise<void>,
): Promise<string | null> {
  const now = new Date();
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;

  // If token hasn't expired yet (with 5 min buffer), use it
  if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return integration.access_token;
  }

  if (!integration.refresh_token) {
    console.error('No refresh token available for', integration.provider);
    return null;
  }

  let refreshed: { access_token: string; refresh_token?: string; expires_in: number } | null = null;

  if (integration.provider === 'microsoft') {
    refreshed = await refreshMicrosoftToken(integration.refresh_token);
  } else if (integration.provider === 'google') {
    refreshed = await refreshGoogleToken(integration.refresh_token);
  }

  if (!refreshed) return null;

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  if (updateTokenFn) {
    await updateTokenFn(refreshed.access_token, newExpiresAt, refreshed.refresh_token);
  }

  return refreshed.access_token;
}

/**
 * Build the Microsoft Graph event payload from our meeting shape.
 */
function buildMicrosoftEventPayload(meeting: MeetingData): Record<string, unknown> {
  const attendees = (meeting.attendees || []).map((a) => ({
    emailAddress: { address: a.email, name: a.name || a.email },
    type: a.is_optional ? 'optional' : 'required',
  }));

  // Microsoft Graph requires all-day events to start and end at midnight,
  // with end being the day AFTER the last included day.
  let start: { dateTime: string; timeZone: string };
  let end: { dateTime: string; timeZone: string };

  if (meeting.is_all_day) {
    const startDate = meeting.start_time.split('T')[0];
    const endDateRaw = meeting.end_time.split('T')[0];
    // If end date equals start date, push it one day forward (Graph's exclusive-end rule).
    let endDate = endDateRaw;
    if (endDate === startDate) {
      const d = new Date(`${startDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      endDate = d.toISOString().split('T')[0];
    }
    start = { dateTime: `${startDate}T00:00:00`, timeZone: 'UTC' };
    end = { dateTime: `${endDate}T00:00:00`, timeZone: 'UTC' };
  } else {
    start = { dateTime: toGraphDateTime(meeting.start_time), timeZone: 'UTC' };
    end = { dateTime: toGraphDateTime(meeting.end_time), timeZone: 'UTC' };
  }

  const event: Record<string, unknown> = {
    subject: meeting.title,
    body: { contentType: 'text', content: meeting.description || '' },
    start,
    end,
    attendees,
    isAllDay: meeting.is_all_day || false,
  };

  if (meeting.location) {
    event.location = { displayName: meeting.location };
  }

  // Recurrence
  if (meeting.is_recurring && meeting.recurrence_rule) {
    const recurrence = buildMicrosoftRecurrence(meeting.recurrence_rule, meeting.start_time);
    if (recurrence) event.recurrence = recurrence;
  }

  // Reminder (metadata.reminder_minutes)
  const reminderMinutes = meeting.metadata?.reminder_minutes;
  if (typeof reminderMinutes === 'number' && reminderMinutes >= 0) {
    event.isReminderOn = true;
    event.reminderMinutesBeforeStart = reminderMinutes;
  }

  return event;
}

/**
 * Build the Google Calendar event payload from our meeting shape.
 */
function buildGoogleEventPayload(meeting: MeetingData): Record<string, unknown> {
  const attendees = (meeting.attendees || []).map((a) => ({
    email: a.email,
    displayName: a.name || undefined,
    optional: a.is_optional || false,
  }));

  const event: Record<string, unknown> = {
    summary: meeting.title,
    description: meeting.description || '',
    start: meeting.is_all_day
      ? { date: meeting.start_time.split('T')[0] }
      : { dateTime: meeting.start_time, timeZone: meeting.timezone || 'UTC' },
    end: meeting.is_all_day
      ? { date: meeting.end_time.split('T')[0] }
      : { dateTime: meeting.end_time, timeZone: meeting.timezone || 'UTC' },
    attendees,
  };

  if (meeting.location) {
    event.location = meeting.location;
  }

  // Recurrence
  if (meeting.is_recurring && meeting.recurrence_rule) {
    event.recurrence = buildGoogleRecurrence(meeting.recurrence_rule);
  }

  // Reminder (metadata.reminder_minutes)
  const reminderMinutes = meeting.metadata?.reminder_minutes;
  if (typeof reminderMinutes === 'number' && reminderMinutes >= 0) {
    event.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: reminderMinutes }],
    };
  }

  return event;
}

async function createMicrosoftCalendarEvent(accessToken: string, meeting: MeetingData) {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildMicrosoftEventPayload(meeting)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Microsoft Calendar API error:', response.status, errorText);
      return { success: false as const, error: `Microsoft API ${response.status}: ${errorText.slice(0, 300)}` };
    }

    const result = await response.json();
    return { success: true as const, eventId: result.id as string };
  } catch (error) {
    console.error('Error creating Microsoft calendar event:', error);
    return { success: false as const, error: String(error) };
  }
}

async function updateMicrosoftCalendarEvent(accessToken: string, eventId: string, meeting: MeetingData) {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildMicrosoftEventPayload(meeting)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false as const, error: `Microsoft API ${response.status}: ${errorText.slice(0, 300)}` };
    }

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

async function deleteMicrosoftCalendarEvent(accessToken: string, eventId: string) {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // 404 is fine — event is already gone
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      return { success: false as const, error: `Microsoft API ${response.status}: ${errorText.slice(0, 300)}` };
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

async function createGoogleCalendarEvent(accessToken: string, meeting: MeetingData) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGoogleEventPayload(meeting)),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar API error:', response.status, errorText);
      return { success: false as const, error: `Google API ${response.status}: ${errorText.slice(0, 300)}` };
    }

    const result = await response.json();
    return { success: true as const, eventId: result.id as string };
  } catch (error) {
    console.error('Error creating Google calendar event:', error);
    return { success: false as const, error: String(error) };
  }
}

async function updateGoogleCalendarEvent(accessToken: string, eventId: string, meeting: MeetingData) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGoogleEventPayload(meeting)),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false as const, error: `Google API ${response.status}: ${errorText.slice(0, 300)}` };
    }

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    // 404/410 are fine — event already gone
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const errorText = await response.text();
      return { success: false as const, error: `Google API ${response.status}: ${errorText.slice(0, 300)}` };
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

function getAdminClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getActiveCalendarIntegrations(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
) {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('integration_type', 'calendar')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching integrations:', error);
    return [];
  }
  return data || [];
}

async function recordSyncError(
  supabase: SupabaseClient,
  integrationId: string,
  errorMessage: string | null,
) {
  await supabase
    .from('integrations')
    .update({
      last_error: errorMessage,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId);
}

/**
 * Sync a newly created meeting to all connected external calendars.
 */
export async function syncMeetingToExternalCalendars(
  meeting: MeetingData,
  userId: string,
  orgId: string,
): Promise<CalendarSyncResult[]> {
  const results: CalendarSyncResult[] = [];
  const supabase = getAdminClient();
  const integrations = await getActiveCalendarIntegrations(supabase, userId, orgId);

  if (!integrations.length) {
    console.log('[calendar-sync] No active calendar integrations for user', userId);
    return results;
  }

  for (const integration of integrations) {
    const updateTokenFn = async (newToken: string, expiresAt: string, newRefreshToken?: string) => {
      const updateData: Record<string, string> = {
        access_token: newToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };
      if (newRefreshToken) updateData.refresh_token = newRefreshToken;
      await supabase.from('integrations').update(updateData).eq('id', integration.id);
    };

    const accessToken = await getValidAccessToken(
      {
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
        token_expires_at: integration.token_expires_at,
        provider: integration.provider,
      },
      updateTokenFn,
    );

    if (!accessToken) {
      const err = 'Failed to obtain valid access token (refresh failed)';
      await recordSyncError(supabase, integration.id, err);
      results.push({ success: false, provider: integration.provider, error: err });
      continue;
    }

    let result: { success: boolean; eventId?: string; error?: string };
    if (integration.provider === 'microsoft') {
      result = await createMicrosoftCalendarEvent(accessToken, meeting);
    } else if (integration.provider === 'google') {
      result = await createGoogleCalendarEvent(accessToken, meeting);
    } else {
      const err = 'Calendar sync not supported for this provider';
      await recordSyncError(supabase, integration.id, err);
      results.push({ success: false, provider: integration.provider, error: err });
      continue;
    }

    await recordSyncError(supabase, integration.id, result.success ? null : result.error || 'Unknown error');

    results.push({
      success: result.success,
      provider: integration.provider,
      external_event_id: result.eventId,
      error: result.error,
    });

    // Store the external event ID on the meeting so we can update/delete it later.
    // NOTE: schema only has a single external_event_id; if a user has BOTH
    // Google and Outlook connected, the last-synced one wins here. Multi-provider
    // tracking would need a junction table.
    if (result.success && result.eventId) {
      await supabase
        .from('meetings')
        .update({
          external_event_id: result.eventId,
          external_calendar_provider: integration.provider,
          external_calendar_id: 'primary',
          updated_at: new Date().toISOString(),
        })
        .eq('id', meeting.id);
    }
  }

  return results;
}

/**
 * Sync a meeting update to the external calendar it originated on.
 */
export async function updateMeetingOnExternalCalendar(
  meeting: MeetingData,
  userId: string,
  orgId: string,
): Promise<CalendarSyncResult[]> {
  const results: CalendarSyncResult[] = [];

  // Nothing to update if the meeting was never synced
  if (!meeting.external_event_id || !meeting.external_calendar_provider) {
    return results;
  }

  const supabase = getAdminClient();
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('integration_type', 'calendar')
    .eq('provider', meeting.external_calendar_provider)
    .eq('status', 'active')
    .maybeSingle();

  if (!integration) {
    results.push({
      success: false,
      provider: meeting.external_calendar_provider,
      error: 'No active integration for the original calendar provider',
    });
    return results;
  }

  const updateTokenFn = async (newToken: string, expiresAt: string, newRefreshToken?: string) => {
    const updateData: Record<string, string> = {
      access_token: newToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (newRefreshToken) updateData.refresh_token = newRefreshToken;
    await supabase.from('integrations').update(updateData).eq('id', integration.id);
  };

  const accessToken = await getValidAccessToken(
    {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_expires_at: integration.token_expires_at,
      provider: integration.provider,
    },
    updateTokenFn,
  );

  if (!accessToken) {
    const err = 'Failed to obtain valid access token';
    await recordSyncError(supabase, integration.id, err);
    results.push({ success: false, provider: integration.provider, error: err });
    return results;
  }

  let result: { success: boolean; error?: string };
  if (integration.provider === 'microsoft') {
    result = await updateMicrosoftCalendarEvent(accessToken, meeting.external_event_id, meeting);
  } else if (integration.provider === 'google') {
    result = await updateGoogleCalendarEvent(accessToken, meeting.external_event_id, meeting);
  } else {
    result = { success: false, error: 'Unsupported provider' };
  }

  await recordSyncError(supabase, integration.id, result.success ? null : result.error || 'Unknown error');

  results.push({
    success: result.success,
    provider: integration.provider,
    external_event_id: meeting.external_event_id,
    error: result.error,
  });

  return results;
}

/**
 * Delete a meeting from the external calendar it was synced to.
 */
export async function deleteMeetingFromExternalCalendars(
  externalEventId: string | null | undefined,
  externalProvider: string | null | undefined,
  userId: string,
  orgId: string,
): Promise<CalendarSyncResult[]> {
  const results: CalendarSyncResult[] = [];

  if (!externalEventId || !externalProvider) {
    return results;
  }

  const supabase = getAdminClient();
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('integration_type', 'calendar')
    .eq('provider', externalProvider)
    .eq('status', 'active')
    .maybeSingle();

  if (!integration) {
    return results;
  }

  const updateTokenFn = async (newToken: string, expiresAt: string, newRefreshToken?: string) => {
    const updateData: Record<string, string> = {
      access_token: newToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (newRefreshToken) updateData.refresh_token = newRefreshToken;
    await supabase.from('integrations').update(updateData).eq('id', integration.id);
  };

  const accessToken = await getValidAccessToken(
    {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_expires_at: integration.token_expires_at,
      provider: integration.provider,
    },
    updateTokenFn,
  );

  if (!accessToken) {
    results.push({
      success: false,
      provider: integration.provider,
      error: 'Failed to obtain valid access token',
    });
    return results;
  }

  let result: { success: boolean; error?: string };
  if (integration.provider === 'microsoft') {
    result = await deleteMicrosoftCalendarEvent(accessToken, externalEventId);
  } else if (integration.provider === 'google') {
    result = await deleteGoogleCalendarEvent(accessToken, externalEventId);
  } else {
    result = { success: false, error: 'Unsupported provider' };
  }

  await recordSyncError(supabase, integration.id, result.success ? null : result.error || 'Unknown error');

  results.push({
    success: result.success,
    provider: integration.provider,
    external_event_id: externalEventId,
    error: result.error,
  });

  return results;
}

// ---------------------------------------------------------------------------
// INBOUND SYNC: pull events from external calendars into the meetings table.
// ---------------------------------------------------------------------------

export interface ImportResult {
  provider: string;
  success: boolean;
  imported: number;  // newly inserted
  updated: number;   // existing rows updated
  error?: string;
}

/**
 * Default window: 30 days before now → 90 days ahead.
 * Dashboard, route planner, meeting tracker, etc all operate in this window.
 */
function getImportWindow(): { startIso: string; endIso: string } {
  const now = Date.now();
  const DAY = 86_400_000;
  return {
    startIso: new Date(now - 30 * DAY).toISOString(),
    endIso: new Date(now + 90 * DAY).toISOString(),
  };
}

/**
 * Microsoft Graph event → meetings row.
 */
function mapMicrosoftEvent(event: Record<string, unknown>, orgId: string, userId: string): Record<string, unknown> | null {
  const id = typeof event.id === 'string' ? event.id : null;
  if (!id) return null;

  const subject = (event.subject as string | undefined) || '(No title)';
  const body = event.body as { content?: string; contentType?: string } | undefined;
  const description = body?.content
    ? (body.contentType === 'html' ? body.content.replace(/<[^>]+>/g, '').trim() : body.content)
    : null;

  const start = event.start as { dateTime?: string; timeZone?: string } | undefined;
  const end = event.end as { dateTime?: string; timeZone?: string } | undefined;
  if (!start?.dateTime || !end?.dateTime) return null;

  // Graph returns naive datetime + timeZone. Treat as UTC when timezone is 'UTC'
  // (the API respects our `Prefer: outlook.timezone` header — we set it to UTC below).
  const toIso = (dt: string) => (dt.endsWith('Z') ? dt : `${dt}Z`);

  const location = event.location as { displayName?: string } | undefined;
  const onlineMeeting = event.onlineMeeting as { joinUrl?: string } | undefined;
  const isOnlineMeeting = event.isOnlineMeeting === true;

  const attendeesRaw = (event.attendees as Array<{
    emailAddress?: { address?: string; name?: string };
    type?: string;
  }>) || [];
  const attendees = attendeesRaw
    .filter((a) => a.emailAddress?.address)
    .map((a) => ({
      email: a.emailAddress!.address as string,
      name: a.emailAddress!.name,
      is_optional: a.type === 'optional',
    }));

  // Map Graph's showAs → our status
  const showAs = event.showAs as string | undefined;
  const isCancelled = event.isCancelled === true;
  const status = isCancelled ? 'cancelled'
    : showAs === 'tentative' ? 'tentative'
    : 'scheduled';

  return {
    org_id: orgId,
    created_by: userId,
    title: subject,
    description,
    start_time: toIso(start.dateTime),
    end_time: toIso(end.dateTime),
    timezone: start.timeZone || 'UTC',
    is_all_day: event.isAllDay === true,
    location_type: isOnlineMeeting || onlineMeeting?.joinUrl ? 'virtual' : (location?.displayName ? 'in_person' : 'virtual'),
    location: location?.displayName || null,
    video_conference_url: onlineMeeting?.joinUrl || null,
    meeting_type: 'other',
    attendees,
    is_recurring: event.recurrence != null,
    status,
    external_event_id: id,
    external_calendar_provider: 'microsoft',
    external_calendar_id: 'primary',
    last_synced_at: new Date().toISOString(),
    metadata: {
      source: 'outlook-import',
      iCalUId: event.iCalUId ?? null,
    },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Pull events from Microsoft Graph's calendarView endpoint (handles recurring
 * expansion server-side, which /me/events does not) and upsert into meetings.
 */
async function fetchMicrosoftCalendarView(
  accessToken: string,
  startIso: string,
  endIso: string,
): Promise<Record<string, unknown>[]> {
  const events: Record<string, unknown>[] = [];
  let url: string | null = `https://graph.microsoft.com/v1.0/me/calendarView`
    + `?startDateTime=${encodeURIComponent(startIso)}`
    + `&endDateTime=${encodeURIComponent(endIso)}`
    + `&$top=100`
    + `&$orderby=start/dateTime`;

  // Safety cap to avoid runaway pagination.
  for (let page = 0; page < 20 && url; page++) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Ask Graph to return start/end.dateTime in UTC so we can normalize.
        Prefer: 'outlook.timezone="UTC"',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph calendarView failed: ${res.status} ${text.slice(0, 300)}`);
    }

    const json: { value?: Record<string, unknown>[]; '@odata.nextLink'?: string } = await res.json();
    if (json.value) events.push(...json.value);
    url = json['@odata.nextLink'] ?? null;
  }

  return events;
}

export async function importMicrosoftCalendarEvents(
  userId: string,
  orgId: string,
): Promise<ImportResult> {
  const supabase = getAdminClient();

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('integration_type', 'calendar')
    .eq('provider', 'microsoft')
    .eq('status', 'active')
    .maybeSingle();

  if (!integration) {
    return { provider: 'microsoft', success: false, imported: 0, updated: 0, error: 'No active Microsoft integration' };
  }

  const updateTokenFn = async (newToken: string, expiresAt: string, newRefreshToken?: string) => {
    const updateData: Record<string, string> = {
      access_token: newToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (newRefreshToken) updateData.refresh_token = newRefreshToken;
    await supabase.from('integrations').update(updateData).eq('id', integration.id);
  };

  const accessToken = await getValidAccessToken(
    {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_expires_at: integration.token_expires_at,
      provider: 'microsoft',
    },
    updateTokenFn,
  );

  if (!accessToken) {
    const err = 'Failed to obtain valid Microsoft access token';
    await recordSyncError(supabase, integration.id, err);
    return { provider: 'microsoft', success: false, imported: 0, updated: 0, error: err };
  }

  const { startIso, endIso } = getImportWindow();
  let rawEvents: Record<string, unknown>[];
  try {
    rawEvents = await fetchMicrosoftCalendarView(accessToken, startIso, endIso);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await recordSyncError(supabase, integration.id, msg);
    return { provider: 'microsoft', success: false, imported: 0, updated: 0, error: msg };
  }

  let imported = 0;
  let updated = 0;

  for (const raw of rawEvents) {
    const row = mapMicrosoftEvent(raw, orgId, userId);
    if (!row) continue;

    // Check if this external event already exists to distinguish insert vs update
    const { data: existing } = await supabase
      .from('meetings')
      .select('id')
      .eq('org_id', orgId)
      .eq('external_calendar_provider', 'microsoft')
      .eq('external_event_id', row.external_event_id as string)
      .maybeSingle();

    if (existing?.id) {
      // Preserve the original created_by — don't overwrite with the syncing user
      delete (row as Record<string, unknown>).created_by;
      const { error } = await supabase
        .from('meetings')
        .update(row)
        .eq('id', existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from('meetings')
        .insert({ ...row, created_at: new Date().toISOString() });
      if (!error) imported++;
    }
  }

  await recordSyncError(supabase, integration.id, null);

  return { provider: 'microsoft', success: true, imported, updated };
}

/**
 * Google Calendar event → meetings row.
 */
function mapGoogleEvent(event: Record<string, unknown>, orgId: string, userId: string): Record<string, unknown> | null {
  const id = typeof event.id === 'string' ? event.id : null;
  if (!id) return null;

  const summary = (event.summary as string | undefined) || '(No title)';
  const description = (event.description as string | undefined) || null;

  const start = event.start as { dateTime?: string; date?: string; timeZone?: string } | undefined;
  const end = event.end as { dateTime?: string; date?: string; timeZone?: string } | undefined;
  if (!start || !end) return null;

  const isAllDay = !start.dateTime && !!start.date;
  const startIso = isAllDay
    ? new Date(`${start.date}T00:00:00Z`).toISOString()
    : (start.dateTime as string);
  const endIso = isAllDay
    ? new Date(`${end.date}T00:00:00Z`).toISOString()
    : (end.dateTime as string);

  const location = (event.location as string | undefined) || null;
  const hangoutLink = (event.hangoutLink as string | undefined) || null;
  const conferenceData = event.conferenceData as { entryPoints?: Array<{ uri?: string; entryPointType?: string }> } | undefined;
  const videoEntry = conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  const videoUrl = hangoutLink || videoEntry?.uri || null;

  const attendeesRaw = (event.attendees as Array<{
    email?: string;
    displayName?: string;
    optional?: boolean;
  }>) || [];
  const attendees = attendeesRaw
    .filter((a) => a.email)
    .map((a) => ({ email: a.email as string, name: a.displayName, is_optional: a.optional === true }));

  const statusRaw = (event.status as string | undefined) || 'confirmed';
  const status = statusRaw === 'cancelled' ? 'cancelled'
    : statusRaw === 'tentative' ? 'tentative'
    : 'scheduled';

  return {
    org_id: orgId,
    created_by: userId,
    title: summary,
    description,
    start_time: startIso,
    end_time: endIso,
    timezone: start.timeZone || 'UTC',
    is_all_day: isAllDay,
    location_type: videoUrl ? 'virtual' : (location ? 'in_person' : 'virtual'),
    location,
    video_conference_url: videoUrl,
    meeting_type: 'other',
    attendees,
    is_recurring: Array.isArray(event.recurrence) && (event.recurrence as unknown[]).length > 0,
    status,
    external_event_id: id,
    external_calendar_provider: 'google',
    external_calendar_id: 'primary',
    last_synced_at: new Date().toISOString(),
    metadata: {
      source: 'google-import',
      iCalUID: event.iCalUID ?? null,
    },
    updated_at: new Date().toISOString(),
  };
}

async function fetchGoogleCalendarEvents(
  accessToken: string,
  startIso: string,
  endIso: string,
): Promise<Record<string, unknown>[]> {
  const events: Record<string, unknown>[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      timeMin: startIso,
      timeMax: endIso,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google events.list failed: ${res.status} ${text.slice(0, 300)}`);
    }

    const json: { items?: Record<string, unknown>[]; nextPageToken?: string } = await res.json();
    if (json.items) events.push(...json.items);
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}

export async function importGoogleCalendarEvents(
  userId: string,
  orgId: string,
): Promise<ImportResult> {
  const supabase = getAdminClient();

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('integration_type', 'calendar')
    .eq('provider', 'google')
    .eq('status', 'active')
    .maybeSingle();

  if (!integration) {
    return { provider: 'google', success: false, imported: 0, updated: 0, error: 'No active Google integration' };
  }

  const updateTokenFn = async (newToken: string, expiresAt: string, newRefreshToken?: string) => {
    const updateData: Record<string, string> = {
      access_token: newToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (newRefreshToken) updateData.refresh_token = newRefreshToken;
    await supabase.from('integrations').update(updateData).eq('id', integration.id);
  };

  const accessToken = await getValidAccessToken(
    {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_expires_at: integration.token_expires_at,
      provider: 'google',
    },
    updateTokenFn,
  );

  if (!accessToken) {
    const err = 'Failed to obtain valid Google access token';
    await recordSyncError(supabase, integration.id, err);
    return { provider: 'google', success: false, imported: 0, updated: 0, error: err };
  }

  const { startIso, endIso } = getImportWindow();
  let rawEvents: Record<string, unknown>[];
  try {
    rawEvents = await fetchGoogleCalendarEvents(accessToken, startIso, endIso);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await recordSyncError(supabase, integration.id, msg);
    return { provider: 'google', success: false, imported: 0, updated: 0, error: msg };
  }

  let imported = 0;
  let updated = 0;

  for (const raw of rawEvents) {
    const row = mapGoogleEvent(raw, orgId, userId);
    if (!row) continue;

    const { data: existing } = await supabase
      .from('meetings')
      .select('id')
      .eq('org_id', orgId)
      .eq('external_calendar_provider', 'google')
      .eq('external_event_id', row.external_event_id as string)
      .maybeSingle();

    if (existing?.id) {
      delete (row as Record<string, unknown>).created_by;
      const { error } = await supabase
        .from('meetings')
        .update(row)
        .eq('id', existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from('meetings')
        .insert({ ...row, created_at: new Date().toISOString() });
      if (!error) imported++;
    }
  }

  await recordSyncError(supabase, integration.id, null);
  return { provider: 'google', success: true, imported, updated };
}

/**
 * Import events from every active calendar integration the user has.
 */
export async function importAllExternalCalendarEvents(
  userId: string,
  orgId: string,
): Promise<ImportResult[]> {
  const supabase = getAdminClient();
  const integrations = await getActiveCalendarIntegrations(supabase, userId, orgId);

  const results: ImportResult[] = [];
  for (const integration of integrations) {
    if (integration.provider === 'microsoft') {
      results.push(await importMicrosoftCalendarEvents(userId, orgId));
    } else if (integration.provider === 'google') {
      results.push(await importGoogleCalendarEvents(userId, orgId));
    }
  }
  return results;
}
