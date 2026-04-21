/**
 * Delegation Entity Types
 */

export type DelegationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Delegation {
  id: string;
  org_id: string;
  task_id: string;
  delegated_by: string;
  delegated_to: string;
  status: DelegationStatus;
  notes?: string;
  due_date?: string;
  accepted_at?: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DelegationCreateInput {
  task_id: string;
  delegated_to: string;
  notes?: string;
  due_date?: string;
}

export interface DelegationUpdateInput {
  notes?: string;
  due_date?: string;
}

export interface DelegationAccept {
  notes?: string;
}

export interface DelegationComplete {
  notes?: string;
}

export interface DelegationFilters {
  status?: DelegationStatus | DelegationStatus[];
  delegated_by?: string;
  delegated_to?: string;
  direction?: 'from_me' | 'to_me' | 'all';
}

export interface DelegationWithTask extends Delegation {
  task: {
    id: string;
    title: string;
    priority: string;
    status: string;
  };
}

export interface DelegationWithUsers extends Delegation {
  delegated_by_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  delegated_to_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}
