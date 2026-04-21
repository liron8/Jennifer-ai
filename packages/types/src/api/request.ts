/**
 * API Request Types
 */

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SearchParams {
  search?: string;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface BaseQueryParams extends PaginationParams, SortParams, SearchParams {}

export interface MeetingQueryParams extends BaseQueryParams, DateRangeParams {
  executive_id?: string;
  status?: string;
  meeting_type?: string;
  location_type?: string;
}

export interface TaskQueryParams extends BaseQueryParams {
  executive_id?: string;
  status?: string | string[];
  priority?: string | string[];
  category?: string;
  assigned_to?: string;
  due_before?: string;
  due_after?: string;
  tags?: string[];
}

export interface ApprovalQueryParams extends BaseQueryParams {
  executive_id?: string;
  status?: string | string[];
  approval_type?: string;
  urgency?: string | string[];
  submitted_by?: string;
}

export interface KeyDateQueryParams extends BaseQueryParams, DateRangeParams {
  executive_id?: string;
  category?: string | string[];
  tags?: string[];
}

export interface ContactQueryParams extends BaseQueryParams {
  executive_id?: string;
  category?: string | string[];
  tags?: string[];
  has_followup?: boolean;
}

export interface ConciergeQueryParams extends BaseQueryParams {
  category?: string | string[];
  city?: string;
  price_range?: string | string[];
  favorites_only?: boolean;
  tags?: string[];
}

export interface AuditLogQueryParams extends BaseQueryParams, DateRangeParams {
  user_id?: string;
  action?: string | string[];
  resource?: string | string[];
  resource_id?: string;
}

export interface NotificationQueryParams extends BaseQueryParams {
  type?: string | string[];
  is_read?: boolean;
  priority?: string;
}

export interface InsightQueryParams extends BaseQueryParams {
  executive_id?: string;
  type?: string | string[];
  priority?: string | string[];
  status?: string;
}
