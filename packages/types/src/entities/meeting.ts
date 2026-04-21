/**
 * Meeting Entity Types
 */

export type MeetingStatus = 'scheduled' | 'confirmed' | 'tentative' | 'pending' | 'cancelled';
export type LocationType = 'virtual' | 'in_person' | 'phone' | 'hybrid';
export type MeetingType = 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other';
export type AttendeeStatus = 'accepted' | 'declined' | 'tentative' | 'needs_action';
export type VideoProvider = 'zoom' | 'teams' | 'google_meet' | 'webex' | 'other';

export interface Attendee {
  email: string;
  name?: string;
  status: AttendeeStatus;
  is_organizer: boolean;
  is_optional: boolean;
}

export interface Meeting {
  id: string;
  org_id: string;
  executive_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  is_all_day: boolean;
  status: MeetingStatus;
  location_type: LocationType;
  location?: string;
  location_address?: string;
  video_conference_url?: string;
  video_conference_provider?: VideoProvider;
  meeting_type: MeetingType;
  attendees: Attendee[];
  is_recurring: boolean;
  recurrence_rule?: string;
  recurring_meeting_id?: string;
  external_calendar_id?: string;
  external_event_id?: string;
  external_calendar_provider?: 'google' | 'microsoft';
  ai_brief_generated: boolean;
  ai_brief?: string;
  notes?: string;
  created_by: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingCreateInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  is_all_day?: boolean;
  location_type: LocationType;
  location?: string;
  location_address?: string;
  create_video_conference?: boolean;
  video_conference_provider?: VideoProvider;
  meeting_type?: MeetingType;
  attendees?: Omit<Attendee, 'status' | 'is_organizer'>[];
  executive_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface MeetingUpdateInput {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  is_all_day?: boolean;
  status?: MeetingStatus;
  location_type?: LocationType;
  location?: string;
  location_address?: string;
  video_conference_url?: string;
  meeting_type?: MeetingType;
  attendees?: Attendee[];
  notes?: string;
}

export interface MeetingBrief {
  meeting_id: string;
  content: string;
  attendee_info: {
    name: string;
    title?: string;
    company?: string;
    relationship_notes?: string;
    last_meeting?: string;
  }[];
  previous_meetings: {
    id: string;
    title: string;
    date: string;
    notes?: string;
  }[];
  related_tasks: {
    id: string;
    title: string;
    status: string;
  }[];
  generated_at: string;
}

export interface MeetingFilters {
  executive_id?: string;
  start_date?: string;
  end_date?: string;
  status?: MeetingStatus | 'upcoming' | 'past';
  meeting_type?: MeetingType;
  location_type?: LocationType;
  search?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  is_all_day: boolean;
  location?: string;
  attendees?: Attendee[];
  video_conference_url?: string;
  recurring_event_id?: string;
  status: 'confirmed' | 'tentative' | 'pending' | 'cancelled';
}
