/**
 * Key Date Entity Types
 */

export type KeyDateCategory = 
  | 'birthday'
  | 'anniversary'
  | 'deadline'
  | 'milestone'
  | 'travel'
  | 'financial'
  | 'team'
  | 'personal'
  | 'vip'
  | 'expiration'
  | 'holiday'
  | 'other';

export interface KeyDate {
  id: string;
  org_id: string;
  executive_id?: string;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  category: KeyDateCategory;
  related_person?: string;
  related_contact_id?: string;
  related_family_member_id?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  reminder_days: number[];
  tags: string[];
  ai_suggested_actions?: KeyDateSuggestedAction[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KeyDateSuggestedAction {
  id: string;
  type: 'task' | 'meeting' | 'reminder' | 'purchase' | 'reservation';
  title: string;
  description?: string;
  suggested_date?: string;
  metadata?: Record<string, unknown>;
}

export interface KeyDateCreateInput {
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  category: KeyDateCategory;
  related_person?: string;
  related_contact_id?: string;
  related_family_member_id?: string;
  executive_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  reminder_days?: number[];
  tags?: string[];
}

export interface KeyDateUpdateInput {
  title?: string;
  description?: string;
  date?: string;
  end_date?: string;
  category?: KeyDateCategory;
  related_person?: string;
  related_contact_id?: string;
  related_family_member_id?: string;
  executive_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  reminder_days?: number[];
  tags?: string[];
}

export interface KeyDateFilters {
  executive_id?: string;
  category?: KeyDateCategory | KeyDateCategory[];
  start_date?: string;
  end_date?: string;
  search?: string;
  tags?: string[];
}

export interface KeyDateWithDaysUntil extends KeyDate {
  days_until: number;
}
