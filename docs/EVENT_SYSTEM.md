# JeniferAI - Event System Specification

> **Event bus, triggers, and cross-module communication architecture**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Event Architecture](#2-event-architecture)
3. [Event Catalog](#3-event-catalog)
4. [Event Handlers](#4-event-handlers)
5. [Supabase Realtime](#5-supabase-realtime)
6. [Background Jobs](#6-background-jobs)
7. [Implementation](#7-implementation)

---

## 1. Overview

### 1.1 Purpose

The Event System enables:
- **Decoupled communication** between modules
- **Real-time updates** across the application
- **AI triggers** for proactive analysis
- **Audit logging** of all important actions
- **Background processing** of async tasks

### 1.2 Event Flow

```
USER ACTION
     │
     ▼
┌─────────────┐
│  API Route  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Database   │────►│ DB Trigger  │
│  Operation  │     └──────┬──────┘
└─────────────┘            │
                           ▼
                    ┌─────────────┐
                    │ Event Queue │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  AI Engine  │   │  Realtime   │   │  Audit Log  │
│  Analysis   │   │  Broadcast  │   │  Recording  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 2. Event Architecture

### 2.1 Event Structure

```typescript
interface JeniferEvent {
  id: string;                    // Unique event ID
  type: string;                  // Event type (e.g., 'meeting.created')
  timestamp: Date;               // When event occurred
  
  // Context
  org_id: string;                // Organization ID
  user_id: string;               // User who triggered event
  executive_id?: string;         // Related executive (if applicable)
  
  // Payload
  entity_type: string;           // 'meeting', 'task', 'approval', etc.
  entity_id: string;             // ID of the affected entity
  action: string;                // 'created', 'updated', 'deleted'
  
  // Data
  data: {
    before?: Record<string, any>;  // Previous state (for updates)
    after: Record<string, any>;    // Current state
    changes?: string[];            // List of changed fields
  };
  
  // Metadata
  metadata: {
    source: string;              // 'web', 'api', 'sync', 'system'
    ip_address?: string;
    user_agent?: string;
  };
}
```

### 2.2 Event Categories

| Category | Events | Description |
|----------|--------|-------------|
| **Meetings** | meeting.* | Calendar and scheduling events |
| **Tasks** | task.* | Task management events |
| **Approvals** | approval.* | Approval workflow events |
| **Contacts** | contact.* | Contact management events |
| **Key Dates** | keydate.* | Important date events |
| **Executives** | executive.* | Executive profile events |
| **Integrations** | integration.* | Third-party integration events |
| **System** | system.* | System-level events |

---

## 3. Event Catalog

### 3.1 Meeting Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `meeting.created` | New meeting added | Full meeting object | Check conflicts, generate brief |
| `meeting.updated` | Meeting modified | Before/after states | Re-check conflicts |
| `meeting.deleted` | Meeting removed | Deleted meeting | Clean up related items |
| `meeting.reminder` | X minutes before | Meeting + time until | Send notification |
| `meeting.started` | Meeting time reached | Meeting object | Log attendance |
| `meeting.ended` | Meeting end time | Meeting object | Suggest follow-up tasks |

### 3.2 Task Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `task.created` | New task added | Full task object | Check duplicates, suggest priority |
| `task.updated` | Task modified | Before/after states | Track progress |
| `task.status_changed` | Status changed | Old/new status | Update metrics |
| `task.completed` | Task marked done | Task object | Suggest related tasks |
| `task.overdue` | Past due date | Task object | Send reminder |
| `task.assigned` | Task assigned | Task + assignee | Notify assignee |

### 3.3 Approval Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `approval.created` | New approval submitted | Full approval | Analyze for anomalies |
| `approval.approved` | Approval granted | Approval + decision | Create follow-up task |
| `approval.rejected` | Approval denied | Approval + reason | Notify submitter |
| `approval.info_requested` | More info needed | Approval + request | Notify submitter |

### 3.4 Key Date Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `keydate.created` | New date added | Full key date | Schedule reminders |
| `keydate.approaching` | X days until date | Date + days until | Generate suggestions |
| `keydate.today` | Date is today | Key date object | Send notification |
| `keydate.passed` | Date has passed | Key date object | Archive or reschedule |

### 3.5 Executive Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `executive.created` | New executive added | Executive profile | Initialize patterns |
| `executive.updated` | Profile modified | Before/after states | Update AI context |
| `executive.preferences_changed` | Preferences updated | Changed preferences | Re-learn patterns |

### 3.6 Integration Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `integration.connected` | OAuth completed | Integration details | Start initial sync |
| `integration.disconnected` | Integration removed | Integration ID | Clean up synced data |
| `integration.sync_completed` | Sync finished | Sync stats | Update local data |
| `integration.sync_failed` | Sync error | Error details | Notify user |

### 3.7 System Events

| Event | Trigger | Payload | AI Actions |
|-------|---------|---------|------------|
| `system.user_login` | User logs in | User + session | Update last_seen |
| `system.user_logout` | User logs out | User ID | End session |
| `system.daily_digest` | Scheduled (6 AM) | Org ID | Generate daily brief |
| `system.weekly_analysis` | Scheduled (Sunday) | Org ID | Run pattern analysis |

---

## 4. Event Handlers

### 4.1 Handler Registry

```typescript
// packages/core/src/events/handler-registry.ts

type EventHandler = (event: JeniferEvent, context: EventContext) => Promise<void>;

class EventHandlerRegistry {
  private handlers: Map<string, EventHandler[]> = new Map();
  
  register(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  async dispatch(event: JeniferEvent, context: EventContext) {
    const handlers = this.handlers.get(event.type) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    
    await Promise.all([
      ...handlers.map(h => h(event, context)),
      ...wildcardHandlers.map(h => h(event, context))
    ]);
  }
}

export const eventRegistry = new EventHandlerRegistry();
```

### 4.2 Registering Handlers

```typescript
// packages/core/src/events/handlers/meeting-handlers.ts

import { eventRegistry } from '../handler-registry';
import { conflictDetector } from '../../ai/modules/conflict-detector';
import { meetingBriefGenerator } from '../../ai/modules/meeting-brief-generator';

// Meeting created handler
eventRegistry.register('meeting.created', async (event, context) => {
  const meeting = event.data.after as Meeting;
  
  // 1. Check for conflicts
  const conflicts = await conflictDetector.detectMeetingConflicts(
    meeting,
    await getMeetingsForDay(meeting.start_time, context),
    await getExecutivePreferences(meeting.executive_id)
  );
  
  if (conflicts.length > 0) {
    await createInsight({
      org_id: event.org_id,
      executive_id: event.executive_id,
      user_id: event.user_id,
      insight_type: 'conflict_detected',
      priority: 'high',
      title: '⚠️ Meeting Conflict Detected',
      description: conflicts[0].message,
      related_entity_type: 'meeting',
      related_entity_id: meeting.id,
      suggested_actions: [
        { action_type: 'reschedule', label: 'Reschedule', payload: { meeting_id: meeting.id } },
        { action_type: 'dismiss', label: 'Keep Both', payload: {} }
      ]
    });
  }
  
  // 2. Generate meeting brief if within 24 hours
  const hoursUntil = (new Date(meeting.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil <= 24 && hoursUntil > 0) {
    const brief = await meetingBriefGenerator.generateBrief(meeting, context);
    await updateMeetingBrief(meeting.id, brief.content);
  }
  
  // 3. Check travel time if in-person
  if (meeting.location_type === 'in_person' && meeting.location) {
    await checkTravelTime(meeting, context);
  }
});

// Meeting updated handler
eventRegistry.register('meeting.updated', async (event, context) => {
  const before = event.data.before as Meeting;
  const after = event.data.after as Meeting;
  
  // Re-check conflicts if time changed
  if (before.start_time !== after.start_time || before.end_time !== after.end_time) {
    await eventRegistry.dispatch({
      ...event,
      type: 'meeting.created',
      data: { after }
    }, context);
  }
});

// Meeting reminder handler
eventRegistry.register('meeting.reminder', async (event, context) => {
  const meeting = event.data.after as Meeting;
  const minutesUntil = event.data.minutesUntil;
  
  await createNotification({
    user_id: event.user_id,
    org_id: event.org_id,
    title: `📅 Meeting in ${minutesUntil} minutes`,
    body: meeting.title,
    notification_type: 'info',
    category: 'meeting',
    action_url: `/scheduling/calendar?meeting=${meeting.id}`
  });
});
```

### 4.3 Task Handlers

```typescript
// packages/core/src/events/handlers/task-handlers.ts

eventRegistry.register('task.created', async (event, context) => {
  const task = event.data.after as Task;
  
  // 1. Check for duplicates
  const existingTasks = await getTasksForExecutive(task.executive_id, context);
  const duplicates = findPotentialDuplicates(task, existingTasks);
  
  if (duplicates.length > 0) {
    await createInsight({
      org_id: event.org_id,
      insight_type: 'anomaly',
      priority: 'low',
      title: '🔄 Possible Duplicate Task',
      description: `"${task.title}" may be similar to existing tasks`,
      related_entity_type: 'task',
      related_entity_id: task.id
    });
  }
  
  // 2. Suggest priority if not set
  if (!task.priority || task.priority === 'medium') {
    const suggestedPriority = await suggestTaskPriority(task, context);
    if (suggestedPriority !== task.priority) {
      await updateTask(task.id, { ai_suggested_priority: suggestedPriority });
    }
  }
});

eventRegistry.register('task.overdue', async (event, context) => {
  const task = event.data.after as Task;
  
  await createNotification({
    user_id: task.assigned_to || task.created_by,
    org_id: event.org_id,
    title: '⏰ Task Overdue',
    body: `"${task.title}" was due ${formatRelativeTime(task.due_date)}`,
    notification_type: 'warning',
    category: 'task',
    action_url: `/tasks/todo?task=${task.id}`
  });
});
```

### 4.4 Key Date Handlers

```typescript
// packages/core/src/events/handlers/keydate-handlers.ts

eventRegistry.register('keydate.approaching', async (event, context) => {
  const keyDate = event.data.after as KeyDate;
  const daysUntil = event.data.daysUntil;
  
  // Generate suggestions based on category
  const suggestions = await generateKeyDateSuggestions(keyDate, daysUntil, context);
  
  await createInsight({
    org_id: event.org_id,
    executive_id: keyDate.executive_id,
    insight_type: 'reminder',
    priority: daysUntil <= 1 ? 'high' : 'medium',
    title: `📅 ${keyDate.title} in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
    description: suggestions.summary,
    related_entity_type: 'key_date',
    related_entity_id: keyDate.id,
    suggested_actions: suggestions.actions
  });
});

async function generateKeyDateSuggestions(keyDate: KeyDate, daysUntil: number, context: EventContext) {
  switch (keyDate.category) {
    case 'birthday':
      return {
        summary: `${keyDate.related_person}'s birthday is coming up. Consider preparing a gift or celebration.`,
        actions: [
          { action_type: 'create_task', label: 'Create Gift Task', payload: { title: `Buy gift for ${keyDate.related_person}` } },
          { action_type: 'search_concierge', label: 'Find Gift Ideas', payload: { category: 'gift' } }
        ]
      };
    
    case 'anniversary':
      return {
        summary: `Anniversary coming up. Consider making dinner reservations.`,
        actions: [
          { action_type: 'search_concierge', label: 'Find Restaurants', payload: { category: 'restaurant' } },
          { action_type: 'create_task', label: 'Plan Celebration', payload: {} }
        ]
      };
    
    case 'deadline':
      return {
        summary: `Deadline approaching. Review related tasks and ensure everything is on track.`,
        actions: [
          { action_type: 'view_tasks', label: 'View Related Tasks', payload: {} },
          { action_type: 'create_reminder', label: 'Set Final Reminder', payload: {} }
        ]
      };
    
    default:
      return {
        summary: `${keyDate.title} is coming up.`,
        actions: [{ action_type: 'dismiss', label: 'Dismiss', payload: {} }]
      };
  }
}
```

---

## 5. Supabase Realtime

### 5.1 Database Triggers

```sql
-- Function to emit events on table changes
CREATE OR REPLACE FUNCTION emit_table_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
  payload JSONB;
BEGIN
  -- Determine event type
  event_type := TG_TABLE_NAME || '.' || LOWER(TG_OP);
  IF TG_OP = 'UPDATE' THEN
    event_type := TG_TABLE_NAME || '.updated';
  ELSIF TG_OP = 'INSERT' THEN
    event_type := TG_TABLE_NAME || '.created';
  ELSIF TG_OP = 'DELETE' THEN
    event_type := TG_TABLE_NAME || '.deleted';
  END IF;
  
  -- Build payload
  payload := jsonb_build_object(
    'type', event_type,
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    'timestamp', NOW()
  );
  
  -- Notify via pg_notify for Supabase Realtime
  PERFORM pg_notify('table_changes', payload::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables
CREATE TRIGGER meetings_events
  AFTER INSERT OR UPDATE OR DELETE ON meetings
  FOR EACH ROW EXECUTE FUNCTION emit_table_event();

CREATE TRIGGER tasks_events
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION emit_table_event();

CREATE TRIGGER approvals_events
  AFTER INSERT OR UPDATE OR DELETE ON approvals
  FOR EACH ROW EXECUTE FUNCTION emit_table_event();

CREATE TRIGGER key_dates_events
  AFTER INSERT OR UPDATE OR DELETE ON key_dates
  FOR EACH ROW EXECUTE FUNCTION emit_table_event();

CREATE TRIGGER contacts_events
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION emit_table_event();

CREATE TRIGGER executive_profiles_events
  AFTER INSERT OR UPDATE OR DELETE ON executive_profiles
  FOR EACH ROW EXECUTE FUNCTION emit_table_event();
```

### 5.2 Client-Side Subscription

```typescript
// packages/core/src/events/realtime-client.ts

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeEventClient {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  subscribeToTable(
    table: string,
    orgId: string,
    callback: (event: JeniferEvent) => void
  ): () => void {
    const channelName = `${table}:${orgId}`;
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          const event: JeniferEvent = {
            id: crypto.randomUUID(),
            type: `${table}.${payload.eventType.toLowerCase()}`,
            timestamp: new Date(),
            org_id: orgId,
            user_id: payload.new?.created_by || payload.old?.created_by,
            entity_type: table,
            entity_id: payload.new?.id || payload.old?.id,
            action: payload.eventType.toLowerCase(),
            data: {
              before: payload.old,
              after: payload.new
            },
            metadata: { source: 'realtime' }
          };
          
          callback(event);
        }
      )
      .subscribe();
    
    this.channels.set(channelName, channel);
    
    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }
  
  subscribeToAll(orgId: string, callback: (event: JeniferEvent) => void) {
    const tables = ['meetings', 'tasks', 'approvals', 'key_dates', 'contacts'];
    const unsubscribes = tables.map(t => this.subscribeToTable(t, orgId, callback));
    
    return () => unsubscribes.forEach(unsub => unsub());
  }
}
```

### 5.3 React Hook for Realtime

```typescript
// apps/web/src/hooks/use-realtime-events.ts

import { useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { RealtimeEventClient } from '@/lib/events/realtime-client';

export function useRealtimeEvents(
  table: string,
  orgId: string,
  onEvent: (event: JeniferEvent) => void
) {
  const supabase = useSupabase();
  
  useEffect(() => {
    const client = new RealtimeEventClient(supabase);
    const unsubscribe = client.subscribeToTable(table, orgId, onEvent);
    
    return unsubscribe;
  }, [supabase, table, orgId, onEvent]);
}

// Usage in component
function TaskList() {
  const { orgId } = useOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const handleEvent = useCallback((event: JeniferEvent) => {
    if (event.type === 'tasks.created') {
      setTasks(prev => [...prev, event.data.after as Task]);
    } else if (event.type === 'tasks.updated') {
      setTasks(prev => prev.map(t => 
        t.id === event.entity_id ? event.data.after as Task : t
      ));
    } else if (event.type === 'tasks.deleted') {
      setTasks(prev => prev.filter(t => t.id !== event.entity_id));
    }
  }, []);
  
  useRealtimeEvents('tasks', orgId, handleEvent);
  
  return <TaskListUI tasks={tasks} />;
}
```

---

## 6. Background Jobs

### 6.1 Job Scheduler

```typescript
// packages/core/src/jobs/scheduler.ts

interface ScheduledJob {
  name: string;
  schedule: string;  // Cron expression
  handler: (context: JobContext) => Promise<void>;
  enabled: boolean;
}

export const scheduledJobs: ScheduledJob[] = [
  {
    name: 'daily-brief',
    schedule: '0 6 * * *',  // 6 AM daily
    handler: dailyBriefJob,
    enabled: true
  },
  {
    name: 'traffic-check',
    schedule: '*/5 * * * *',  // Every 5 minutes
    handler: trafficCheckJob,
    enabled: true
  },
  {
    name: 'key-date-scan',
    schedule: '0 0 * * *',  // Midnight daily
    handler: keyDateScanJob,
    enabled: true
  },
  {
    name: 'meeting-reminders',
    schedule: '* * * * *',  // Every minute
    handler: meetingReminderJob,
    enabled: true
  },
  {
    name: 'overdue-task-check',
    schedule: '0 9 * * *',  // 9 AM daily
    handler: overdueTaskCheckJob,
    enabled: true
  },
  {
    name: 'calendar-sync',
    schedule: '0 * * * *',  // Every hour
    handler: calendarSyncJob,
    enabled: true
  },
  {
    name: 'weekly-pattern-analysis',
    schedule: '0 20 * * 0',  // Sunday 8 PM
    handler: weeklyPatternAnalysisJob,
    enabled: true
  },
  {
    name: 'cleanup-old-notifications',
    schedule: '0 3 * * *',  // 3 AM daily
    handler: cleanupNotificationsJob,
    enabled: true
  }
];
```

### 6.2 Job Implementations

```typescript
// packages/core/src/jobs/handlers/daily-brief.ts

export async function dailyBriefJob(context: JobContext) {
  const organizations = await getActiveOrganizations();
  
  for (const org of organizations) {
    const users = await getActiveUsers(org.id);
    
    for (const user of users) {
      const executives = await getUserExecutives(user.id);
      
      for (const executive of executives) {
        const brief = await generateDailyBrief(user, executive, context);
        
        await createNotification({
          user_id: user.id,
          org_id: org.id,
          title: `☀️ Daily Brief: ${executive.full_name}`,
          body: brief.summary,
          notification_type: 'ai_suggestion',
          category: 'ai',
          action_url: '/dashboard'
        });
      }
    }
  }
}

async function generateDailyBrief(user: User, executive: Executive, context: JobContext) {
  const today = new Date();
  
  const [meetings, tasks, approvals, keyDates] = await Promise.all([
    getMeetingsForDate(executive.id, today),
    getPendingTasks(executive.id),
    getPendingApprovals(executive.id),
    getKeyDatesForWeek(executive.id)
  ]);
  
  return {
    summary: `Today: ${meetings.length} meetings, ${tasks.length} tasks, ${approvals.length} approvals pending`,
    meetings,
    tasks: tasks.slice(0, 5),
    approvals,
    keyDates
  };
}
```

```typescript
// packages/core/src/jobs/handlers/traffic-check.ts

export async function trafficCheckJob(context: JobContext) {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  // Get all in-person meetings starting in the next hour
  const meetings = await supabase
    .from('meetings')
    .select('*, executive_profiles(*)')
    .eq('location_type', 'in_person')
    .gte('start_time', now.toISOString())
    .lte('start_time', oneHourFromNow.toISOString())
    .is('deleted_at', null);
  
  for (const meeting of meetings.data || []) {
    const executive = meeting.executive_profiles;
    const origin = executive?.office_address || 'Current Location';
    
    const traffic = await trafficPredictor.predictTravelTime(
      origin,
      meeting.location,
      new Date(meeting.start_time)
    );
    
    if (traffic.trafficCondition === 'heavy' || traffic.trafficCondition === 'severe') {
      // Check if we already sent an alert for this meeting
      const existingAlert = await getExistingInsight(meeting.id, 'traffic_alert');
      if (existingAlert) continue;
      
      await createInsight({
        org_id: meeting.org_id,
        executive_id: meeting.executive_id,
        insight_type: 'reminder',
        priority: traffic.trafficCondition === 'severe' ? 'urgent' : 'high',
        title: '🚗 Traffic Alert',
        description: `Heavy traffic to ${meeting.title}. Leave by ${traffic.suggestedDepartureTime.toLocaleTimeString()} to arrive on time.`,
        related_entity_type: 'meeting',
        related_entity_id: meeting.id
      });
    }
  }
}
```

```typescript
// packages/core/src/jobs/handlers/key-date-scan.ts

export async function keyDateScanJob(context: JobContext) {
  const today = new Date();
  const reminderDays = [14, 7, 3, 1];  // Days before to send reminders
  
  for (const days of reminderDays) {
    const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const keyDates = await supabase
      .from('key_dates')
      .select('*')
      .eq('date', dateStr);
    
    for (const keyDate of keyDates.data || []) {
      // Check if reminder already sent
      const reminderKey = `keydate_reminder_${keyDate.id}_${days}`;
      const alreadySent = await checkReminderSent(reminderKey);
      if (alreadySent) continue;
      
      // Emit approaching event
      await eventRegistry.dispatch({
        id: crypto.randomUUID(),
        type: 'keydate.approaching',
        timestamp: new Date(),
        org_id: keyDate.org_id,
        user_id: keyDate.created_by,
        executive_id: keyDate.executive_id,
        entity_type: 'key_date',
        entity_id: keyDate.id,
        action: 'approaching',
        data: {
          after: keyDate,
          daysUntil: days
        },
        metadata: { source: 'system' }
      }, context);
      
      await markReminderSent(reminderKey);
    }
  }
}
```

### 6.3 Supabase Edge Function for Jobs

```typescript
// supabase/functions/scheduled-jobs/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { job_name } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const context = { supabase };
  
  switch (job_name) {
    case 'daily-brief':
      await dailyBriefJob(context);
      break;
    case 'traffic-check':
      await trafficCheckJob(context);
      break;
    case 'key-date-scan':
      await keyDateScanJob(context);
      break;
    // ... other jobs
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 7. Implementation

### 7.1 File Structure

```
packages/core/src/events/
├── types.ts                 # Event type definitions
├── handler-registry.ts      # Event handler registry
├── realtime-client.ts       # Supabase realtime client
├── event-emitter.ts         # Server-side event emitter
└── handlers/
    ├── meeting-handlers.ts
    ├── task-handlers.ts
    ├── approval-handlers.ts
    ├── keydate-handlers.ts
    └── integration-handlers.ts

packages/core/src/jobs/
├── scheduler.ts             # Job definitions
├── runner.ts                # Job execution logic
└── handlers/
    ├── daily-brief.ts
    ├── traffic-check.ts
    ├── key-date-scan.ts
    ├── meeting-reminders.ts
    ├── calendar-sync.ts
    └── pattern-analysis.ts

supabase/
├── migrations/
│   └── 20240101_event_triggers.sql
└── functions/
    └── scheduled-jobs/
        └── index.ts
```

### 7.2 Setup Checklist

1. **Database Triggers**
   - [ ] Create `emit_table_event()` function
   - [ ] Apply triggers to all relevant tables
   - [ ] Test pg_notify is working

2. **Event Handlers**
   - [ ] Implement all event handlers
   - [ ] Register handlers in registry
   - [ ] Test handler execution

3. **Realtime Subscriptions**
   - [ ] Enable Supabase Realtime
   - [ ] Implement client-side subscriptions
   - [ ] Test real-time updates

4. **Background Jobs**
   - [ ] Deploy Edge Functions
   - [ ] Configure cron triggers
   - [ ] Test job execution

---

**Next Document: MODULE_SPECIFICATIONS.md** - Detailed specifications for each application module.
