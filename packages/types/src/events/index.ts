/**
 * Event System Types
 */

export type EventCategory = 
  | 'meeting'
  | 'task'
  | 'approval'
  | 'key_date'
  | 'executive'
  | 'integration'
  | 'system';

export interface BaseEvent {
  id: string;
  type: string;
  category: EventCategory;
  org_id: string;
  user_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MeetingCreatedEvent extends BaseEvent {
  type: 'meeting.created';
  category: 'meeting';
  payload: {
    meeting_id: string;
    title: string;
    start_time: string;
    executive_id?: string;
  };
}

export interface MeetingUpdatedEvent extends BaseEvent {
  type: 'meeting.updated';
  category: 'meeting';
  payload: {
    meeting_id: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  };
}

export interface MeetingDeletedEvent extends BaseEvent {
  type: 'meeting.deleted';
  category: 'meeting';
  payload: {
    meeting_id: string;
  };
}

export interface MeetingApproachingEvent extends BaseEvent {
  type: 'meeting.approaching';
  category: 'meeting';
  payload: {
    meeting_id: string;
    minutes_until: number;
  };
}

export interface TaskCreatedEvent extends BaseEvent {
  type: 'task.created';
  category: 'task';
  payload: {
    task_id: string;
    title: string;
    priority: string;
    executive_id?: string;
  };
}

export interface TaskUpdatedEvent extends BaseEvent {
  type: 'task.updated';
  category: 'task';
  payload: {
    task_id: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  };
}

export interface TaskCompletedEvent extends BaseEvent {
  type: 'task.completed';
  category: 'task';
  payload: {
    task_id: string;
  };
}

export interface TaskOverdueEvent extends BaseEvent {
  type: 'task.overdue';
  category: 'task';
  payload: {
    task_id: string;
    due_date: string;
  };
}

export interface ApprovalCreatedEvent extends BaseEvent {
  type: 'approval.created';
  category: 'approval';
  payload: {
    approval_id: string;
    title: string;
    urgency: string;
    executive_id: string;
  };
}

export interface ApprovalDecidedEvent extends BaseEvent {
  type: 'approval.decided';
  category: 'approval';
  payload: {
    approval_id: string;
    decision: 'approved' | 'rejected';
    decided_by: string;
  };
}

export interface KeyDateApproachingEvent extends BaseEvent {
  type: 'key_date.approaching';
  category: 'key_date';
  payload: {
    key_date_id: string;
    days_until: number;
    category: string;
  };
}

export interface IntegrationSyncedEvent extends BaseEvent {
  type: 'integration.synced';
  category: 'integration';
  payload: {
    integration_id: string;
    provider: string;
    items_synced: number;
  };
}

export interface IntegrationErrorEvent extends BaseEvent {
  type: 'integration.error';
  category: 'integration';
  payload: {
    integration_id: string;
    provider: string;
    error: string;
  };
}

export type AppEvent = 
  | MeetingCreatedEvent
  | MeetingUpdatedEvent
  | MeetingDeletedEvent
  | MeetingApproachingEvent
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskCompletedEvent
  | TaskOverdueEvent
  | ApprovalCreatedEvent
  | ApprovalDecidedEvent
  | KeyDateApproachingEvent
  | IntegrationSyncedEvent
  | IntegrationErrorEvent;

export interface EventHandler<T extends BaseEvent = BaseEvent> {
  event_type: string;
  handler: (event: T) => Promise<void>;
}

export interface EventSubscription {
  id: string;
  event_types: string[];
  callback: (event: AppEvent) => void;
  unsubscribe: () => void;
}
