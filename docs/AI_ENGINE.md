# JeniferAI - AI Engine Specification

> **Complete technical specification for the Jenifer AI intelligent assistant engine**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Core Components](#3-core-components)
4. [Intelligence Modules](#4-intelligence-modules)
5. [Proactive Features](#5-proactive-features)
6. [Tool Definitions](#6-tool-definitions)
7. [Chat Interface](#7-chat-interface)
8. [Pattern Learning](#8-pattern-learning)
9. [Implementation Guide](#9-implementation-guide)

---

## 1. Overview

### 1.1 What is the Jenifer Engine?

The Jenifer Engine is an AI-powered intelligent assistant that:
- **Observes** all data across the platform (meetings, tasks, contacts, etc.)
- **Analyzes** patterns, detects anomalies, and identifies opportunities
- **Suggests** proactive recommendations to help EAs work more efficiently
- **Assists** through a chat interface for direct questions and requests
- **Learns** from user behavior to improve suggestions over time

### 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Suggestion-First** | Always suggest, rarely auto-execute. Respect human decision-making. |
| **Context-Aware** | Every suggestion considers the full context |
| **Proactive** | Don't wait to be asked. Surface important information before needed. |
| **Transparent** | Explain reasoning. Users should understand why suggestions are made. |
| **Privacy-Respecting** | Data stays within the organization. Learning is per-account/org. |

### 1.3 Technology Stack

```
SDK: Vercel AI SDK (ai package)
├── Streaming responses
├── Tool calling
├── Structured output (Zod schemas)
└── Multi-provider support

Primary Model: Claude 3.5 Sonnet (Anthropic)
├── Complex reasoning
├── Long context (200K tokens)
└── Excellent instruction following

Secondary Model: GPT-4o-mini (OpenAI)
├── Fast, cheap operations
├── Embeddings generation
└── Simple classifications

Vector Store: pgvector (Supabase)
├── Semantic search
└── Context retrieval

Background Jobs: Supabase Edge Functions + Cron
├── Scheduled analysis
└── Event-driven processing
```

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  Dashboard Insights | Chat Page | Notifications | AI Hints      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                         │
│  /api/ai/chat | /api/ai/analyze | /api/ai/suggest               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JENIFER ENGINE CORE                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  CONTEXT BUILDER                         │   │
│  │  - User & executive context                              │   │
│  │  - Recent meetings, tasks, approvals                     │   │
│  │  - Learned patterns & preferences                        │   │
│  │  - Related historical data (via embeddings)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  AI ORCHESTRATOR                         │   │
│  │  - Chat handler (conversational)                         │   │
│  │  - Analysis handler (insights generation)                │   │
│  │  - Action handler (tool execution)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          ▼                   ▼                   ▼              │
│    ┌──────────┐       ┌──────────┐       ┌──────────┐          │
│    │ DETECTOR │       │PREDICTOR │       │GENERATOR │          │
│    │Conflicts │       │ Traffic  │       │ Briefs   │          │
│    │Anomalies │       │ Needs    │       │ Emails   │          │
│    │Duplicates│       │ Risks    │       │Summaries │          │
│    └──────────┘       └──────────┘       └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKGROUND PROCESSORS                          │
│  Scheduled Jobs | Event Handlers | Learning Jobs                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow for Events

```
USER ACTION (e.g., creates meeting)
         │
         ▼
┌─────────────────┐
│  Event Emitted  │
│"meeting.created"│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Event Handler  │────►│ Context Builder │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │              Fetches: │
         │              - Executive preferences
         │              - Other meetings that day
         │              - Related contacts
         │              - Historical patterns
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│            AI ANALYSIS                   │
│  ✓ Conflicts with existing meetings?    │
│  ✓ Buffer time respected?               │
│  ✓ Travel time needed?                  │
│  ✓ Prep materials needed?               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         INSIGHT GENERATION               │
│  → Create ai_insights record             │
│  → Create notification                   │
│  → Suggest actions                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         USER NOTIFICATION                │
│  "⚠️ Meeting conflict detected"          │
│  [Reschedule] [Keep Both] [Dismiss]     │
└─────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Context Builder

**File:** `packages/core/src/ai/context-builder.ts`

```typescript
export interface AIContext {
  user: {
    id: string;
    name: string;
    role: string;
    preferences: UserPreferences;
  };
  organization: {
    id: string;
    name: string;
    settings: OrgSettings;
    aiSettings: AISettings;
  };
  executive?: {
    id: string;
    name: string;
    title: string;
    preferences: ExecutivePreferences;
    patterns: LearnedPatterns;
  };
  temporal: {
    currentTime: Date;
    timezone: string;
    todaysMeetings: Meeting[];
    upcomingTasks: Task[];
    pendingApprovals: Approval[];
    upcomingKeyDates: KeyDate[];
  };
  patterns: {
    meetingPreferences: MeetingPattern[];
    taskPatterns: TaskPattern[];
  };
}

export class ContextBuilder {
  async buildContext(userId: string, executiveId?: string): Promise<AIContext> {
    const [user, organization, executive, ...temporal] = await Promise.all([
      this.getUser(userId),
      this.getOrganization(userId),
      executiveId ? this.getExecutive(executiveId) : null,
      this.getTodaysMeetings(userId, executiveId),
      this.getUpcomingTasks(userId, executiveId),
      this.getPendingApprovals(userId, executiveId),
      this.getUpcomingKeyDates(userId, executiveId)
    ]);
    
    return { user, organization, executive, temporal, patterns };
  }
}
```

### 3.2 AI Orchestrator

**File:** `packages/core/src/ai/orchestrator.ts`

```typescript
import { generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export class AIOrchestrator {
  private contextBuilder: ContextBuilder;
  private tools: Map<string, AITool>;
  
  // Chat with streaming response
  async chat(userId: string, executiveId: string | undefined, messages: Message[]) {
    const context = await this.contextBuilder.buildContext(userId, executiveId);
    const systemPrompt = this.buildSystemPrompt(context);
    
    return streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: systemPrompt,
      messages,
      tools: this.getToolDefinitions(),
      maxSteps: 5
    });
  }
  
  // Analyze data and generate insights
  async analyze(userId: string, executiveId: string | undefined, type: string, data: any) {
    const context = await this.contextBuilder.buildContext(userId, executiveId);
    // ... analysis logic
  }
  
  // Generate content (emails, briefs, etc.)
  async generate(userId: string, executiveId: string | undefined, type: string, input: any) {
    const context = await this.contextBuilder.buildContext(userId, executiveId);
    // ... generation logic
  }
}
```

### 3.3 System Prompt Template

```typescript
buildSystemPrompt(context: AIContext): string {
  return `You are Jenifer, an intelligent AI assistant for Executive Assistants.

## Your Role
You help Executive Assistants manage their executives' schedules, tasks, and communications.

## Current Context
- Current Time: ${context.temporal.currentTime.toISOString()}
- Timezone: ${context.temporal.timezone}
- User: ${context.user.name} (${context.user.role})
${context.executive ? `- Managing Executive: ${context.executive.name}` : ''}

## Executive Preferences
${context.executive ? JSON.stringify(context.executive.preferences, null, 2) : 'No executive selected'}

## Today's Schedule
${context.temporal.todaysMeetings.map(m => `- ${m.start_time}: ${m.title}`).join('\n')}

## Pending Tasks (Top 5)
${context.temporal.upcomingTasks.slice(0, 5).map(t => `- [${t.priority}] ${t.title}`).join('\n')}

## Guidelines
1. Always be helpful and proactive
2. Consider the executive's preferences in all suggestions
3. Flag potential conflicts or issues
4. Provide specific, actionable suggestions
5. When unsure, ask clarifying questions`;
}
```

---

## 4. Intelligence Modules

### 4.1 Conflict Detector

**File:** `packages/core/src/ai/modules/conflict-detector.ts`

Detects:
- Meeting time overlaps
- Buffer time violations
- Travel time conflicts
- Task duplicates
- Overdue items

```typescript
export class ConflictDetector {
  async detectMeetingConflicts(
    newMeeting: Meeting,
    existingMeetings: Meeting[],
    preferences: ExecutivePreferences
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const bufferMinutes = preferences.scheduling_preferences?.meeting_buffer_minutes || 15;
    
    for (const existing of existingMeetings) {
      // Check for time overlap
      if (this.hasTimeOverlap(newMeeting, existing)) {
        conflicts.push({
          type: 'overlap',
          severity: 'high',
          message: `Overlaps with "${existing.title}"`,
          conflictingMeeting: existing
        });
      }
      
      // Check buffer violation
      if (this.hasBufferViolation(newMeeting, existing, bufferMinutes)) {
        conflicts.push({
          type: 'buffer_violation',
          severity: 'medium',
          message: `Less than ${bufferMinutes} minutes between meetings`
        });
      }
    }
    
    return conflicts;
  }
}
```

### 4.2 Traffic Predictor

**File:** `packages/core/src/ai/modules/traffic-predictor.ts`

Uses Google Maps API to:
- Predict travel time between locations
- Assess traffic conditions
- Suggest departure times
- Find alternative routes

```typescript
export class TrafficPredictor {
  async predictTravelTime(origin: string, destination: string, arrivalTime: Date) {
    const response = await this.mapsClient.directions({
      params: {
        origin,
        destination,
        departure_time: arrivalTime,
        traffic_model: 'best_guess',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    return {
      durationInTraffic: response.data.routes[0].legs[0].duration_in_traffic.value,
      trafficCondition: this.assessTrafficCondition(response),
      suggestedDepartureTime: this.calculateDepartureTime(arrivalTime, duration)
    };
  }
}
```

### 4.3 Meeting Brief Generator

**File:** `packages/core/src/ai/modules/meeting-brief-generator.ts`

Generates pre-meeting briefs including:
- Attendee information
- Previous meeting history
- Related pending tasks
- Suggested talking points

```typescript
export class MeetingBriefGenerator {
  async generateBrief(meeting: Meeting, context: AIContext): Promise<MeetingBrief> {
    const [attendeeInfo, previousMeetings, relatedTasks] = await Promise.all([
      this.getAttendeeInfo(meeting.attendees, context),
      this.getPreviousMeetings(meeting, context),
      this.getRelatedTasks(meeting, context)
    ]);
    
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt: this.buildBriefPrompt(meeting, attendeeInfo, previousMeetings, relatedTasks)
    });
    
    return { meetingId: meeting.id, content: text, generatedAt: new Date() };
  }
}
```

---

## 5. Proactive Features

### 5.1 Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Brief | 6 AM | Generate daily summary for each user |
| Traffic Check | Every 5 min | Check traffic for upcoming meetings |
| Key Date Scan | Midnight | Scan for upcoming important dates |
| Pattern Analysis | Weekly (Sun 8 PM) | Analyze patterns and update preferences |
| Calendar Sync | Every hour | Sync with external calendars |

```typescript
// Example: Daily Brief Job
export const dailyBriefJob = {
  schedule: '0 6 * * *',
  handler: async (orgId: string) => {
    const users = await getActiveUsers(orgId);
    
    for (const user of users) {
      const brief = await generateDailyBrief(user);
      await sendNotification(user.id, {
        type: 'ai_suggestion',
        title: '☀️ Your Daily Brief',
        body: brief.summary
      });
    }
  }
};
```

### 5.2 Event Handlers

| Event | Handler | Actions |
|-------|---------|---------|
| `meeting.created` | Check conflicts, generate brief | Create insights, notifications |
| `meeting.updated` | Re-check conflicts | Update insights |
| `task.created` | Check duplicates, suggest priority | Create insights |
| `approval.created` | Analyze for anomalies | Flag if unusual |
| `key_date.approaching` | Generate suggestions | Create reminders |

```typescript
// Example: Meeting Created Handler
export const meetingCreatedHandler = async (meeting: Meeting, context: AIContext) => {
  // Check for conflicts
  const conflicts = await conflictDetector.detectMeetingConflicts(
    meeting,
    context.temporal.todaysMeetings,
    context.executive?.preferences
  );
  
  if (conflicts.length > 0) {
    await createInsight({
      type: 'conflict_detected',
      priority: 'high',
      title: '⚠️ Meeting Conflict',
      description: conflicts[0].message,
      suggested_actions: [
        { action_type: 'reschedule', label: 'Reschedule Meeting' },
        { action_type: 'dismiss', label: 'Keep Both' }
      ]
    });
  }
};
```

---

## 6. Tool Definitions

### 6.1 Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_meetings` | Get meetings for date range | startDate, endDate, executiveId |
| `get_tasks` | Get tasks with filters | status, priority, executiveId |
| `check_availability` | Check calendar availability | date, startTime, endTime |
| `get_contacts` | Search contacts | query, category |
| `get_key_dates` | Get upcoming key dates | daysAhead, category |
| `get_traffic` | Get travel time | origin, destination, arrivalTime |
| `draft_email` | Draft an email | to, subject, context, tone |
| `create_task_suggestion` | Suggest new task | title, priority, dueDate |
| `create_meeting_suggestion` | Suggest new meeting | title, attendees, times |
| `search_similar` | Semantic search | query, type |

### 6.2 Tool Implementation Example

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const getMeetingsTool = tool({
  description: 'Get meetings for a specific date range',
  parameters: z.object({
    startDate: z.string().describe('Start date in ISO format'),
    endDate: z.string().describe('End date in ISO format'),
    executiveId: z.string().optional()
  }),
  execute: async ({ startDate, endDate, executiveId }, { context }) => {
    const { data } = await context.supabase
      .from('meetings')
      .select('*')
      .eq('org_id', context.orgId)
      .gte('start_time', startDate)
      .lte('start_time', endDate);
    
    return data;
  }
});
```

---

## 7. Chat Interface

### 7.1 Chat API Route

**File:** `apps/web/src/app/api/ai/chat/route.ts`

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { messages, executiveId } = await req.json();
  
  const context = await contextBuilder.buildContext(user.id, executiveId);
  
  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: buildSystemPrompt(context),
    messages,
    tools: getToolDefinitions(),
    maxSteps: 5
  });
  
  return result.toDataStreamResponse();
}
```

### 7.2 Chat UI Component

**File:** `apps/web/src/app/(dashboard)/ask-jenifer/page.tsx`

```typescript
'use client';

import { useChat } from 'ai/react';

export default function AskJeniferPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: { executiveId: selectedExecutiveId }
  });
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Jenifer anything..."
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

---

## 8. Pattern Learning

### 8.1 Pattern Types

| Pattern | What It Learns | How It's Used |
|---------|----------------|---------------|
| Meeting Time Preference | Preferred hours for meetings | Suggest optimal meeting times |
| Task Completion Pattern | How long tasks take | Estimate task duration |
| Approval Behavior | Typical approval amounts | Flag anomalies |
| Communication Style | Tone, length preferences | Draft emails |
| Scheduling Habits | Buffer preferences, max meetings | Prevent overload |

### 8.2 Pattern Learning Process

```typescript
export class PatternLearner {
  async analyzeWeeklyPatterns(orgId: string) {
    // Get last 4 weeks of data
    const meetings = await this.getMeetingsLastWeeks(orgId, 4);
    const tasks = await this.getTasksLastWeeks(orgId, 4);
    
    // Analyze meeting time preferences
    const meetingHours = meetings.map(m => new Date(m.start_time).getHours());
    const preferredHour = this.findMode(meetingHours);
    
    await this.savePattern({
      pattern_type: 'meeting_time_preference',
      pattern_key: 'preferred_hour',
      pattern_value: { hour: preferredHour, confidence: 0.8 },
      sample_size: meetings.length
    });
    
    // Analyze task completion patterns
    const completionTimes = tasks
      .filter(t => t.completed_at && t.created_at)
      .map(t => this.daysBetween(t.created_at, t.completed_at));
    
    const avgCompletionDays = this.average(completionTimes);
    
    await this.savePattern({
      pattern_type: 'task_completion_pattern',
      pattern_key: 'avg_completion_days',
      pattern_value: { days: avgCompletionDays },
      sample_size: completionTimes.length
    });
  }
}
```

---

## 9. Implementation Guide

### 9.1 Setup Steps

1. **Install Dependencies**
```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod
```

2. **Environment Variables**
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_MAPS_API_KEY=...
```

3. **Create AI Package Structure**
```
packages/core/src/ai/
├── context-builder.ts
├── orchestrator.ts
├── insight-generator.ts
├── notification-manager.ts
├── modules/
│   ├── conflict-detector.ts
│   ├── traffic-predictor.ts
│   └── meeting-brief-generator.ts
├── tools/
│   └── index.ts
├── jobs/
│   └── scheduled-jobs.ts
└── handlers/
    └── event-handlers.ts
```

4. **Create API Routes**
```
apps/web/src/app/api/ai/
├── chat/route.ts
├── analyze/route.ts
├── suggest/route.ts
└── insights/route.ts
```

### 9.2 Testing Locally

```bash
# Start the development server
npm run dev

# Test chat endpoint
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What meetings do I have today?"}]}'
```

---

**Next Document: EVENT_SYSTEM.md** - Event bus and cross-module communication specification.
