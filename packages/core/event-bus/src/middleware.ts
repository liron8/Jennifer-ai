/**
 * Event Bus Middleware
 * Pre-built middleware for common event processing needs
 */

import type { DomainEvent, EventMiddleware } from './types';

/**
 * Logging middleware - logs all events
 */
export const loggingMiddleware: EventMiddleware = {
  before: (event: DomainEvent) => {
    console.log(`[EventBus] Publishing: ${event.type}`, {
      source: event.metadata.source,
      correlationId: event.metadata.correlationId,
    });
    return event;
  },
  after: (event: DomainEvent) => {
    console.log(`[EventBus] Completed: ${event.type}`);
  },
  onError: (event: DomainEvent, error: Error) => {
    console.error(`[EventBus] Error in ${event.type}:`, error);
  },
};

/**
 * Timestamp middleware - ensures timestamp is set
 */
export const timestampMiddleware: EventMiddleware = {
  before: (event: DomainEvent) => {
    if (!event.metadata.timestamp) {
      return {
        ...event,
        metadata: {
          ...event.metadata,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return event;
  },
};

/**
 * Correlation ID middleware - ensures correlation ID is set
 */
export const correlationIdMiddleware: EventMiddleware = {
  before: (event: DomainEvent) => {
    if (!event.metadata.correlationId) {
      return {
        ...event,
        metadata: {
          ...event.metadata,
          correlationId: crypto.randomUUID(),
        },
      };
    }
    return event;
  },
};

/**
 * Create a filtering middleware that only processes certain event types
 */
export function createFilterMiddleware(
  allowedTypes: string[],
  middleware: EventMiddleware
): EventMiddleware {
  return {
    before: (event: DomainEvent) => {
      if (allowedTypes.includes(event.type) && middleware.before) {
        return middleware.before(event);
      }
      return event;
    },
    after: (event: DomainEvent) => {
      if (allowedTypes.includes(event.type) && middleware.after) {
        return middleware.after(event);
      }
    },
    onError: (event: DomainEvent, error: Error) => {
      if (allowedTypes.includes(event.type) && middleware.onError) {
        return middleware.onError(event, error);
      }
    },
  };
}
