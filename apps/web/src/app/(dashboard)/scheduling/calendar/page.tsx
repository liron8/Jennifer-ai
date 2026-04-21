"use client";

/**
 * Calendar Page
 * Full calendar view with day/week/month views, mini calendar sidebar, and meeting management
 * Connected to real database via /api/meetings
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Users01, 
  VideoRecorder, 
  MarkerPin01,
  CalendarPlus01,
  Link01,
  Building02,
  Briefcase01,
  User01,
  TrendUp01,
  CheckCircle,
  Clock,
  Plane,
  BarChartSquare01,
  RefreshCcw01,
} from "@untitledui/icons";
import { Calendar, type CalendarEvent } from "@/components/application/calendar/calendar";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { NewMeetingSlideout, type MeetingFormData } from "../_components/new-meeting-slideout";
import { AddEventSlideout, type EventFormData } from "../_components/add-event-slideout";
import { EditMeetingSlideout, type MeetingData } from "../_components/edit-meeting-slideout";
import { ProposeTimesPanel } from "../_components/propose-times-panel";
import { ShareAvailabilityModal } from "../_components/share-availability-modal";
import { CreatePollModal } from "../_components/create-poll-modal";
import { useCalendarMeetings, type CalendarMeeting } from "@/hooks/useDashboard";
import { notify } from "@/lib/notifications";

// Helper function to map meeting type to calendar color
const getMeetingColor = (meetingType: string, locationType: string): CalendarEvent['color'] => {
  // Map meeting types to colors
  const typeColorMap: Record<string, CalendarEvent['color']> = {
    'internal': 'blue',
    'external': 'purple',
    'client': 'purple',
    'one_on_one': 'blue',
    'team': 'green',
    'interview': 'orange',
    'other': 'gray',
  };
  
  // Travel/in-person meetings get special colors
  if (locationType === 'in_person') {
    return 'orange';
  }
  
  return typeColorMap[meetingType] || 'blue';
};

// Helper function to convert database meeting to calendar event
const convertToCalendarEvent = (meeting: CalendarMeeting): CalendarEvent => ({
  id: meeting.id,
  title: meeting.status === 'pending' || meeting.status === 'tentative' ? `⏳ ${meeting.title}` : meeting.title,
  start: new Date(meeting.start_time),
  end: new Date(meeting.end_time),
  color: meeting.status === 'pending' || meeting.status === 'tentative'
    ? 'gray'
    : meeting.status === 'cancelled'
    ? 'gray'
    : getMeetingColor(meeting.meeting_type, meeting.location_type),
  dot: meeting.location_type === 'in_person',
  // Extended properties for edit functionality
  location: meeting.location,
  description: meeting.description,
  meetingType: meeting.meeting_type,
  locationType: meeting.location_type,
});

// Connected calendars - TODO: Wire to integrations API
// For now, show empty state until calendar integrations are implemented
interface ConnectedCalendar {
  id: string;
  name: string;
  provider: string;
  color: string;
  enabled: boolean;
}

export default function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditMeetingOpen, setIsEditMeetingOpen] = useState(false);
  const [isProposeTimesOpen, setIsProposeTimesOpen] = useState(false);
  const [isShareAvailabilityOpen, setIsShareAvailabilityOpen] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch meetings from database
  const { meetings, stats, isLoading, refetch } = useCalendarMeetings();

  // Sync all local-only meetings to the user's connected external calendars
  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/meetings/sync?all=1', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        notify.error('Sync failed', errorData.error?.message || 'Please try again.');
        return;
      }
      const result = await response.json();
      const d = result.data ?? result;

      // Summarise both inbound (import) and outbound (push) counts
      const parts: string[] = [];
      if (d.imported > 0) parts.push(`imported ${d.imported} new event${d.imported === 1 ? '' : 's'}`);
      if (d.updated > 0) parts.push(`updated ${d.updated}`);
      if (d.synced > 0) parts.push(`pushed ${d.synced}`);

      const hasImportErrors = Array.isArray(d.import_errors) && d.import_errors.length > 0;

      if (parts.length === 0 && !hasImportErrors) {
        notify.success('Everything in sync', 'Your calendar is already up to date.');
      } else if (d.failed > 0 || hasImportErrors) {
        notify.error(
          'Sync completed with errors',
          [parts.join(', '), hasImportErrors ? `Import errors: ${d.import_errors.join('; ')}` : '']
            .filter(Boolean).join(' — '),
        );
      } else {
        notify.success('Calendar synced', parts.join(', '));
      }
      refetch();
    } catch (err) {
      console.error('Sync failed:', err);
      notify.error('Sync failed', 'An unexpected error occurred.');
    } finally {
      setIsSyncing(false);
    }
  }, [refetch]);

  // Handle event click to open edit slideout
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // Find the full meeting data from the meetings array
    const meeting = meetings.find(m => m.id === event.id);
    if (meeting) {
      setSelectedMeeting({
        id: meeting.id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meeting_type: meeting.meeting_type,
        location_type: meeting.location_type,
        location: meeting.location,
        location_details: (meeting as any).location_details,
        video_link: (meeting as any).video_link,
        description: meeting.description,
        status: meeting.status,
      });
      setIsEditMeetingOpen(true);
    }
  }, [meetings]);

  // Handle meeting update
  const handleUpdateMeeting = useCallback(async (id: string, data: Partial<MeetingData>) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        notify.success('Meeting updated', 'Your changes have been saved.');
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to update meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to update meeting:", err);
      notify.error('Failed to update meeting', 'An unexpected error occurred.');
    }
  }, [refetch]);

  // Handle meeting delete
  const handleDeleteMeeting = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notify.success('Meeting deleted', 'The meeting has been removed from your calendar.');
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to delete meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to delete meeting:", err);
      notify.error('Failed to delete meeting', 'An unexpected error occurred.');
    }
  }, [refetch]);
  
  // Connected calendars - fetched from integrations API
  const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);

  useEffect(() => {
    async function fetchCalendarIntegrations() {
      try {
        const response = await fetch('/api/integrations');
        if (!response.ok) return;
        const result = await response.json();
        const integrations = result.data?.data ?? result.data ?? [];
        if (Array.isArray(integrations)) {
          const colorMap: Record<string, string> = {
            google_calendar: '#4285F4',
            outlook_calendar: '#0078D4',
            apple_calendar: '#FF3B30',
          };
          setConnectedCalendars(
            integrations
              .filter((i: any) => i.integration_type === 'calendar' && i.status === 'active')
              .map((i: any) => ({
                id: i.id,
                name: i.provider_email || i.provider,
                provider: i.provider,
                color: colorMap[i.provider] || '#6B7280',
                enabled: true,
              })),
          );
        }
      } catch {
        // Silently fail - calendars sidebar is non-critical
      }
    }
    fetchCalendarIntegrations();
  }, []);

  // Convert database meetings to calendar events
  const calendarEvents = useMemo(() => {
    return meetings.map(convertToCalendarEvent);
  }, [meetings]);

  // Helper function to map meeting type from slideout to API schema
  const mapMeetingType = (type?: string): 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other' => {
    const typeMap: Record<string, 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other'> = {
      'internal': 'internal',
      'external': 'external',
      'personal': 'other',
      'travel': 'other',
      'focus': 'other',
    };
    return typeMap[type || ''] || 'other';
  };

  // Helper function to parse attendees string into array of attendee objects
  const parseAttendees = (attendeesStr: string): Array<{ email: string; name?: string; is_optional: boolean }> => {
    if (!attendeesStr.trim()) return [];
    return attendeesStr.split(',').map(email => ({
      email: email.trim(),
      is_optional: false,
    })).filter(a => a.email.includes('@'));
  };

  // Helper function to map recurrence pattern to RRULE
  const mapRecurrenceRule = (pattern?: string): string | undefined => {
    const ruleMap: Record<string, string> = {
      'daily': 'FREQ=DAILY',
      'weekly': 'FREQ=WEEKLY',
      'biweekly': 'FREQ=WEEKLY;INTERVAL=2',
      'monthly': 'FREQ=MONTHLY',
      'yearly': 'FREQ=YEARLY',
    };
    return ruleMap[pattern || ''] || undefined;
  };

  // Map the slideout's wider eventType list to our stricter meeting_type enum.
  // Unknown UI values fall back to 'other' but we preserve the original selection
  // in metadata.event_subtype for future display.
  const mapEventTypeToMeetingType = (eventType?: string):
    'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other' => {
    switch (eventType) {
      case 'team': return 'team';
      case 'conference':
      case 'workshop':
      case 'deadline':
      case 'holiday':
      case 'ooo':
      case 'personal':
      case 'other':
      default: return 'other';
    }
  };

  const handleCreateMeeting = async (meetingFormData: MeetingFormData) => {
    try {
      // Parse the date and times to create ISO datetime strings
      const dateStr = meetingFormData.date;
      const startTimeStr = meetingFormData.startTime || '09:00';
      const endTimeStr = meetingFormData.endTime || '10:00';
      
      const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
      const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

      // Map the "calendar" select (e.g. "{executive_id}-work") to executive_id
      const executiveId = meetingFormData.calendar && meetingFormData.calendar !== 'default'
        ? meetingFormData.calendar.replace(/-work$/, '')
        : undefined;

      // Reminder: convert minutes-string to a number (or omit)
      const reminderMinutes = meetingFormData.reminder && meetingFormData.reminder !== 'none'
        ? Number.parseInt(meetingFormData.reminder, 10)
        : undefined;

      const apiMeetingData = {
        title: meetingFormData.title,
        description: meetingFormData.description || '',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_all_day: meetingFormData.isAllDay || false,
        location_type: meetingFormData.videoLink ? 'virtual' as const : (meetingFormData.location ? 'in_person' as const : 'virtual' as const),
        location: meetingFormData.location || undefined,
        video_conference_url: meetingFormData.videoLink || undefined,
        meeting_type: mapMeetingType(meetingFormData.meetingType),
        attendees: meetingFormData.attendees ? parseAttendees(meetingFormData.attendees) : [],
        executive_id: executiveId && /^[0-9a-f-]{36}$/i.test(executiveId) ? executiveId : undefined,
        is_recurring: meetingFormData.isRecurring || false,
        recurrence_rule: meetingFormData.isRecurring ? mapRecurrenceRule(meetingFormData.recurrencePattern) : undefined,
        reminder_minutes: reminderMinutes,
        metadata: {
          meeting_subtype: meetingFormData.meetingType,
          source: 'new-meeting-slideout',
        },
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiMeetingData),
        credentials: 'include',
      });
      
      if (response.ok) {
        notify.success('Meeting scheduled', `"${meetingFormData.title}" has been added to your calendar.`);
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to schedule meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to schedule meeting:", err);
      notify.error('Failed to schedule meeting', 'An unexpected error occurred.');
    }
  };

  const handleAddEvent = async (eventFormData: EventFormData) => {
    try {
      // Parse dates for event
      const startDateStr = eventFormData.startDate;
      const endDateStr = eventFormData.endDate || eventFormData.startDate;
      const startTimeStr = eventFormData.isAllDay ? '00:00' : (eventFormData.startTime || '09:00');
      const endTimeStr = eventFormData.isAllDay ? '23:59' : (eventFormData.endTime || '17:00');
      
      const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`);
      const endDateTime = new Date(`${endDateStr}T${endTimeStr}:00`);

      // Map the UI's "calendar" select (e.g. "{executive_id}-work") to executive_id
      const executiveId = eventFormData.calendar && eventFormData.calendar !== 'default'
        ? eventFormData.calendar.replace(/-work$/, '')
        : undefined;

      // Reminder: convert minutes-string from the UI to a number (or omit if none)
      const reminderMinutes = eventFormData.reminder && eventFormData.reminder !== 'none'
        ? Number.parseInt(eventFormData.reminder, 10)
        : undefined;

      const apiEventData = {
        title: eventFormData.title,
        description: eventFormData.description || '',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_all_day: eventFormData.isAllDay || false,
        location_type: eventFormData.location ? 'in_person' as const : 'virtual' as const,
        location: eventFormData.location || undefined,
        meeting_type: mapEventTypeToMeetingType(eventFormData.eventType),
        attendees: eventFormData.attendees ? parseAttendees(eventFormData.attendees) : [],
        executive_id: executiveId && /^[0-9a-f-]{36}$/i.test(executiveId) ? executiveId : undefined,
        is_recurring: eventFormData.isRecurring || false,
        recurrence_rule: eventFormData.isRecurring ? mapRecurrenceRule(eventFormData.recurrencePattern) : undefined,
        reminder_minutes: reminderMinutes,
        metadata: {
          event_subtype: eventFormData.eventType,
          color: eventFormData.color,
          source: 'add-event-slideout',
        },
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiEventData),
        credentials: 'include',
      });
      
      if (response.ok) {
        notify.success('Event created', `"${eventFormData.title}" has been added to your calendar.`);
        refetch();
      } else {
        const errorData = await response.json();
        notify.error('Failed to create event', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to create event:", err);
      notify.error('Failed to create event', 'An unexpected error occurred.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Calendar</h1>
          <p className="text-sm text-tertiary">Manage schedules for your executives</p>
        </div>
        <div className="flex gap-3">
          <Button size="md" color="secondary" iconLeading={Clock} onClick={() => setIsProposeTimesOpen(true)}>
            Propose Times
          </Button>
          <Button size="md" color="secondary" iconLeading={Link01} onClick={() => setIsShareAvailabilityOpen(true)}>
            Share Availability
          </Button>
          <Button size="md" color="secondary" iconLeading={BarChartSquare01} onClick={() => setIsPollOpen(true)}>
            Create Poll
          </Button>
          <Button size="md" color="secondary" iconLeading={Plus} onClick={() => setIsNewMeetingOpen(true)}>
            New Meeting
          </Button>
          <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddEventOpen(true)}>
            Add event
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-6">
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden w-72 flex-col gap-5 lg:flex">
          {/* Connected Calendars Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md dark:from-gray-900 dark:to-gray-950 dark:ring-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FeaturedIcon icon={Link01} size="sm" color="brand" theme="light" />
                <h3 className="text-sm font-semibold text-primary">Connected</h3>
              </div>
              {connectedCalendars.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-50 px-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {connectedCalendars.length}
                </span>
              )}
            </div>
            
            {connectedCalendars.length > 0 ? (
              <div className="space-y-2.5">
                {connectedCalendars.map((cal) => (
                  <label 
                    key={cal.id} 
                    className="group/item flex cursor-pointer items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        defaultChecked={cal.enabled}
                        className="peer sr-only"
                      />
                      <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-gray-200 bg-white transition-all peer-checked:border-brand-600 peer-checked:bg-brand-600 dark:border-gray-700 dark:bg-gray-800">
                        <CheckCircle className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                      </div>
                    </div>
                    <div 
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm dark:ring-gray-900"
                      style={{ 
                        backgroundColor: cal.color === 'blue' ? '#3B82F6' : cal.color === 'green' ? '#22C55E' : '#A855F7'
                      }} 
                    />
                    <span className="flex-1 truncate text-sm font-medium text-secondary group-hover/item:text-primary">{cal.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-sm text-tertiary">No calendars connected yet</p>
                <p className="mt-1 text-xs text-quaternary">Connect your Google or Outlook calendar to sync events</p>
              </div>
            )}
            
            {connectedCalendars.length > 0 && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCcw01 className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}

            <button 
              onClick={() => router.push('/settings?tab=integrations')}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white/40 py-2.5 text-sm font-medium text-tertiary transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400">
              <CalendarPlus01 className="h-4 w-4" />
              Connect Calendar
            </button>
          </div>

          {/* This Week Stats Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md dark:from-gray-900 dark:to-gray-950 dark:ring-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FeaturedIcon icon={TrendUp01} size="sm" color="success" theme="light" />
                <h3 className="text-sm font-semibold text-primary">This Week</h3>
              </div>
              {stats.total_meetings > 0 && (
                <span className="text-xs font-medium text-success-600 dark:text-success-400">+12%</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
                    <CalendarIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.total_meetings}</span>
                <span className="text-xs text-tertiary">Meetings</span>
              </div>
              
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                    <VideoRecorder className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.video_calls}</span>
                <span className="text-xs text-tertiary">Video Calls</span>
              </div>
              
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                    <MarkerPin01 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.in_person}</span>
                <span className="text-xs text-tertiary">In-Person</span>
              </div>
              
              <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-3 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <Users01 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <span className="mt-1 text-xl font-semibold text-primary">{stats.total_attendees}</span>
                <span className="text-xs text-tertiary">Attendees</span>
              </div>
            </div>
          </div>

          {/* Meeting Types Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md dark:from-gray-900 dark:to-gray-950 dark:ring-white/[0.04]">
            <div className="mb-4 flex items-center gap-3">
              <FeaturedIcon icon={Briefcase01} size="sm" color="gray" theme="light" />
              <h3 className="text-sm font-semibold text-primary">Meeting Types</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                  <Building02 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Internal</span>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                  <Briefcase01 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">External / Client</span>
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                  <User01 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Personal</span>
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 transition-all hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-500/10">
                  <Plane className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Travel</span>
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Calendar View */}
        <div className="flex-1">
          <Calendar 
            events={calendarEvents} 
            view={view} 
            className="h-full" 
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {/* New Meeting Slideout */}
      <NewMeetingSlideout
        isOpen={isNewMeetingOpen}
        onOpenChange={setIsNewMeetingOpen}
        onSubmit={handleCreateMeeting}
      />

      {/* Add Event Slideout */}
      <AddEventSlideout
        isOpen={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        onSubmit={handleAddEvent}
      />

      {/* Edit Meeting Slideout */}
      <EditMeetingSlideout
        isOpen={isEditMeetingOpen}
        onOpenChange={setIsEditMeetingOpen}
        meeting={selectedMeeting}
        onUpdate={handleUpdateMeeting}
        onDelete={handleDeleteMeeting}
      />

      {/* Propose Times Panel */}
      <ProposeTimesPanel
        isOpen={isProposeTimesOpen}
        onClose={() => setIsProposeTimesOpen(false)}
      />

      {/* Share Availability Modal */}
      <ShareAvailabilityModal
        isOpen={isShareAvailabilityOpen}
        onClose={() => setIsShareAvailabilityOpen(false)}
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={isPollOpen}
        onClose={() => setIsPollOpen(false)}
      />
    </div>
  );
}
