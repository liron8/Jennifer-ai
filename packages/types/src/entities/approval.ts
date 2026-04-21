/**
 * Approval Entity Types
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';
export type ApprovalType = 'expense' | 'calendar' | 'document' | 'travel' | 'purchase' | 'time_off' | 'other';
export type ApprovalUrgency = 'low' | 'medium' | 'high' | 'urgent';

export interface ApprovalAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ApprovalComment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface Approval {
  id: string;
  org_id: string;
  executive_id: string;
  title: string;
  description: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  urgency: ApprovalUrgency;
  amount?: number;
  currency?: string;
  due_date?: string;
  submitted_by: string;
  decided_by?: string;
  decision_notes?: string;
  decided_at?: string;
  attachments: ApprovalAttachment[];
  comments: ApprovalComment[];
  ai_risk_score?: number;
  ai_recommendation?: string;
  ai_flags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ApprovalCreateInput {
  title: string;
  description: string;
  approval_type: ApprovalType;
  urgency?: ApprovalUrgency;
  amount?: number;
  currency?: string;
  due_date?: string;
  executive_id: string;
  attachments?: Omit<ApprovalAttachment, 'id'>[];
}

export interface ApprovalUpdateInput {
  title?: string;
  description?: string;
  urgency?: ApprovalUrgency;
  amount?: number;
  currency?: string;
  due_date?: string;
}

export interface ApprovalDecision {
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface ApprovalInfoRequest {
  questions: string;
}

export interface ApprovalFilters {
  executive_id?: string;
  status?: ApprovalStatus | ApprovalStatus[];
  approval_type?: ApprovalType;
  urgency?: ApprovalUrgency | ApprovalUrgency[];
  submitted_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avg_turnaround_hours: number;
}
