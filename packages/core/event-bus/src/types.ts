/**
 * Event Bus Types
 * Defines the structure for event-driven communication between modules
 */

export interface EventMetadata {
  timestamp: string;
  source: string;
  orgId: string;
  userId: string;
  correlationId: string;
}

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  metadata: EventMetadata;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  unsubscribe: () => void;
}

export interface EventMiddleware {
  before?: (event: DomainEvent) => Promise<DomainEvent> | DomainEvent;
  after?: (event: DomainEvent) => Promise<void> | void;
  onError?: (event: DomainEvent, error: Error) => Promise<void> | void;
}
