/**
 * Reports Types
 */

export interface CalendarInsightsData {
  date_range: {
    start: string;
    end: string;
  };
  executive_id?: string;
  
  metrics: {
    avg_meetings_per_week: number;
    internal_meetings: number;
    external_meetings: number;
    total_meeting_hours: number;
    percent_of_work_hours: number;
    avg_drive_time_per_week: number;
  };
  
  charts: {
    meetings_by_day: { day: string; count: number }[];
    meetings_by_hour: { hour: number; count: number }[];
    meetings_by_type: { type: string; count: number }[];
    top_contacts: { name: string; count: number }[];
  };
}

export interface ThroughputData {
  date_range: {
    start: string;
    end: string;
  };
  
  metrics: {
    tasks_completed_this_week: number;
    tasks_completed_last_week: number;
    avg_completion_days: number;
    approvals_processed: number;
    avg_approval_turnaround_hours: number;
  };
  
  trends: {
    weekly_task_completion: { week: string; count: number }[];
    tasks_by_category: { category: string; count: number }[];
    tasks_by_priority: { priority: string; count: number }[];
  };
}

export interface InboxInsightsData {
  date_range: {
    start: string;
    end: string;
  };
  
  metrics: {
    emails_received: number;
    emails_sent: number;
    avg_response_time_hours: number;
    unread_count: number;
  };
  
  charts: {
    emails_by_day: { day: string; received: number; sent: number }[];
    top_senders: { email: string; count: number }[];
    emails_by_category: { category: string; count: number }[];
  };
}

export interface ReportFilters {
  date_range: {
    start: string;
    end: string;
  };
  executive_id?: string;
  comparison_period?: 'previous_period' | 'previous_year';
}
