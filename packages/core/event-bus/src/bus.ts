/**
 * Event Bus
 * Central hub for event-driven communication between modules
 */

import type { DomainEvent, EventHandler, EventMiddleware, EventSubscription } from './types';

class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();
  private middlewares: EventMiddleware[] = [];
  private eventLog: DomainEvent[] = [];

  /**
   * Subscribe to an event type
   */
  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): EventSubscription {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.subscribers.set(eventType, handlers);

    return {
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => this.unsubscribe(eventType, handler as EventHandler),
    };
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add middleware to the event bus
   */
  use(middleware: EventMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    let processedEvent = event as DomainEvent;

    // Run before middlewares
    for (const middleware of this.middlewares) {
      if (middleware.before) {
        processedEvent = await middleware.before(processedEvent);
      }
    }

    const handlers = this.subscribers.get(event.type) || [];

    // Execute all handlers (non-blocking)
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(processedEvent))
    );

    // Handle errors
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
        for (const middleware of this.middlewares) {
          if (middleware.onError) {
            await middleware.onError(processedEvent, error);
          }
        }
      }
    }

    // Run after middlewares
    for (const middleware of this.middlewares) {
      if (middleware.after) {
        await middleware.after(processedEvent);
      }
    }

    // Persist to event log
    await this.persistEvent(processedEvent);
  }

  /**
   * Persist event to log for auditing
   */
  private async persistEvent(event: DomainEvent): Promise<void> {
    this.eventLog.push(event);
    // In production, this would persist to database
  }

  /**
   * Get event log (for debugging/auditing)
   */
  getEventLog(): DomainEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.subscribers.keys());
  }
}

export const eventBus = new EventBus();
export { EventBus };
