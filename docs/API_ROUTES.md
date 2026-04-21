# JeniferAI - API Routes Specification

> **Complete API endpoint specifications for all modules**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Dashboard API](#3-dashboard-api)
4. [Meetings API](#4-meetings-api)
5. [Tasks API](#5-tasks-api)
6. [Approvals API](#6-approvals-api)
7. [Key Dates API](#7-key-dates-api)
8. [Executives API](#8-executives-api)
9. [Contacts API](#9-contacts-api)
10. [Concierge API](#10-concierge-api)
11. [AI API](#11-ai-api)
12. [Settings API](#12-settings-api)
13. [Integrations API](#13-integrations-api)

---

## 1. Overview

### 1.1 Base URL

```
Development: http://localhost:3000/api
Production: https://app.jeniferai.com/api
```

### 1.2 Response Format

All responses follow this structure:

```typescript
// Success response
{
  "data": T,
  "meta"?: {
    "page": number,
    "pageSize": number,
    "total": number,
    "totalPages": number
  }
}

// Error response
{
  "error": {
    "code": string,
    "message": string,
    "details"?: any
  }
}
```

### 1.3 Common Headers

```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
X-Executive-Id: <executive_id>  // Optional, for executive-scoped requests
```

### 1.4 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource conflict |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 2. Authentication

### 2.1 Supabase Auth

Authentication is handled by Supabase Auth. The API uses the Supabase session token.

```typescript
// apps/web/src/lib/api/client.ts

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new APIError(error);
  }
  
  return response.json();
}
```

### 2.2 API Route Authentication Middleware

```typescript
// apps/web/src/lib/api/middleware.ts

import { createClient } from '@/lib/supabase/server';

export async function withAuth(
  handler: (req: Request, context: AuthContext) => Promise<Response>
) {
  return async (req: Request) => {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return Response.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    
    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single();
    
    const context: AuthContext = {
      user: userData,
      org: userData.organizations,
      supabase
    };
    
    return handler(req, context);
  };
}
```

---

## 3. Dashboard API

### GET /api/dashboard

Get all dashboard data for the current user.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `date` | string | Date for schedule (default: today) |

**Response:**
```typescript
{
  "data": {
    "todaysMeetings": Meeting[],
    "priorityTasks": Task[],
    "pendingApprovalsCount": number,
    "activeInsights": AIInsight[],
    "metrics": {
      "meetingsToday": number,
      "meetingsThisWeek": number,
      "tasksCompleted": number,
      "tasksPending": number
    },
    "upcomingKeyDates": KeyDate[]
  }
}
```

### GET /api/dashboard/metrics

Get metrics only.

**Response:**
```typescript
{
  "data": {
    "meetingsToday": number,
    "meetingsThisWeek": number,
    "tasksCompleted": number,
    "tasksPending": number,
    "approvalsProcessed": number
  }
}
```

---

## 4. Meetings API

### GET /api/meetings

List meetings with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `startDate` | string | Start of date range (ISO) |
| `endDate` | string | End of date range (ISO) |
| `status` | string | `upcoming`, `past`, `all` |
| `type` | string | Meeting type filter |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20) |

**Response:**
```typescript
{
  "data": Meeting[],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### POST /api/meetings

Create a new meeting.

**Request Body:**
```typescript
{
  "title": string,
  "description"?: string,
  "startTime": string,      // ISO datetime
  "endTime": string,        // ISO datetime
  "timezone"?: string,
  "isAllDay"?: boolean,
  "locationType": "virtual" | "in_person" | "phone",
  "location"?: string,
  "createVideoConference"?: boolean,
  "videoConferenceProvider"?: "zoom" | "teams" | "google_meet",
  "meetingType"?: string,
  "attendees"?: { email: string, name?: string }[],
  "executiveId"?: string,
  "isRecurring"?: boolean,
  "recurrenceRule"?: string
}
```

**Response:**
```typescript
{
  "data": Meeting
}
```

### GET /api/meetings/[id]

Get a single meeting.

**Response:**
```typescript
{
  "data": Meeting
}
```

### PATCH /api/meetings/[id]

Update a meeting.

**Request Body:** Same as POST (all fields optional)

**Response:**
```typescript
{
  "data": Meeting
}
```

### DELETE /api/meetings/[id]

Delete a meeting.

**Response:**
```typescript
{
  "data": { "success": true }
}
```

### GET /api/meetings/[id]/brief

Get AI-generated meeting brief.

**Response:**
```typescript
{
  "data": {
    "content": string,
    "attendeeInfo": AttendeeInfo[],
    "previousMeetings": Meeting[],
    "relatedTasks": Task[],
    "generatedAt": string
  }
}
```

### POST /api/scheduling/availability

Check calendar availability.

**Request Body:**
```typescript
{
  "date": string,
  "startTime": string,
  "endTime": string,
  "executiveId"?: string,
  "attendeeEmails"?: string[]
}
```

**Response:**
```typescript
{
  "data": {
    "isAvailable": boolean,
    "conflicts": Meeting[],
    "suggestedTimes"?: { start: string, end: string }[]
  }
}
```

### POST /api/scheduling/suggest-times

Get AI-suggested meeting times.

**Request Body:**
```typescript
{
  "duration": number,       // minutes
  "attendeeEmails": string[],
  "preferredDateRange": {
    "start": string,
    "end": string
  },
  "executiveId"?: string
}
```

**Response:**
```typescript
{
  "data": {
    "suggestions": {
      "start": string,
      "end": string,
      "score": number,
      "reason": string
    }[]
  }
}
```

---

## 5. Tasks API

### GET /api/tasks

List tasks with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `status` | string | `todo`, `in_progress`, `waiting`, `done` |
| `priority` | string | `low`, `medium`, `high`, `urgent` |
| `category` | string | Category filter |
| `assignedTo` | string | User ID |
| `search` | string | Search in title/description |
| `dueBefore` | string | Due date filter |
| `page` | number | Page number |
| `pageSize` | number | Items per page |

**Response:**
```typescript
{
  "data": Task[],
  "meta": { ... }
}
```

### POST /api/tasks

Create a new task.

**Request Body:**
```typescript
{
  "title": string,
  "description"?: string,
  "status"?: "todo" | "in_progress" | "waiting" | "done",
  "priority"?: "low" | "medium" | "high" | "urgent",
  "category"?: string,
  "dueDate"?: string,
  "dueTime"?: string,
  "executiveId"?: string,
  "assignedTo"?: string,
  "tags"?: string[],
  "subtasks"?: { title: string, completed: boolean }[],
  "relatedMeetingId"?: string
}
```

**Response:**
```typescript
{
  "data": Task
}
```

### GET /api/tasks/[id]

Get a single task.

### PATCH /api/tasks/[id]

Update a task.

### DELETE /api/tasks/[id]

Delete a task.

### POST /api/tasks/[id]/complete

Mark task as complete.

**Response:**
```typescript
{
  "data": {
    "task": Task,
    "suggestedFollowUps"?: Task[]  // AI suggestions
  }
}
```

### POST /api/tasks/[id]/delegate

Delegate a task.

**Request Body:**
```typescript
{
  "delegateTo": string,     // User ID
  "notes"?: string,
  "dueDate"?: string
}
```

---

## 6. Approvals API

### GET /api/approvals

List approvals.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `status` | string | `pending`, `approved`, `rejected`, `info_requested` |
| `type` | string | Approval type |
| `urgency` | string | `low`, `medium`, `high`, `urgent` |

**Response:**
```typescript
{
  "data": Approval[],
  "meta": { ... }
}
```

### POST /api/approvals

Create an approval request.

**Request Body:**
```typescript
{
  "title": string,
  "description": string,
  "approvalType": "expense" | "calendar" | "document" | "travel" | "purchase" | "other",
  "urgency"?: "low" | "medium" | "high" | "urgent",
  "amount"?: number,
  "currency"?: string,
  "dueDate"?: string,
  "executiveId": string,
  "attachments"?: { name: string, url: string, type: string }[]
}
```

### GET /api/approvals/[id]

Get approval details.

### POST /api/approvals/[id]/approve

Approve the request.

**Request Body:**
```typescript
{
  "notes"?: string
}
```

### POST /api/approvals/[id]/reject

Reject the request.

**Request Body:**
```typescript
{
  "reason": string
}
```

### POST /api/approvals/[id]/request-info

Request more information.

**Request Body:**
```typescript
{
  "questions": string
}
```

---

## 7. Key Dates API

### GET /api/key-dates

List key dates.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `category` | string | Category filter |
| `startDate` | string | Start of date range |
| `endDate` | string | End of date range |
| `search` | string | Search query |

### POST /api/key-dates

Create a key date.

**Request Body:**
```typescript
{
  "title": string,
  "description"?: string,
  "date": string,
  "endDate"?: string,
  "category": KeyDateCategory,
  "relatedPerson"?: string,
  "relatedContactId"?: string,
  "executiveId"?: string,
  "isRecurring"?: boolean,
  "recurrenceRule"?: string,
  "reminderDays"?: number[],
  "tags"?: string[]
}
```

### GET /api/key-dates/[id]

Get key date details.

### PATCH /api/key-dates/[id]

Update key date.

### DELETE /api/key-dates/[id]

Delete key date.

### GET /api/key-dates/upcoming

Get upcoming key dates.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `days` | number | Days ahead (default: 30) |

### GET /api/key-dates/[id]/suggestions

Get AI suggestions for a key date.

**Response:**
```typescript
{
  "data": {
    "suggestions": {
      "type": string,
      "title": string,
      "description": string,
      "actions": SuggestedAction[]
    }[]
  }
}
```

---

## 8. Executives API

### GET /api/executives

List executives.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name |
| `isActive` | boolean | Filter by active status |

### POST /api/executives

Create an executive profile.

**Request Body:**
```typescript
{
  "fullName": string,
  "title"?: string,
  "email"?: string,
  "phone"?: string,
  "officeLocation"?: string,
  "timezone"?: string,
  "bio"?: string,
  "schedulingPreferences"?: SchedulingPreferences,
  "dietaryPreferences"?: DietaryPreferences,
  "travelPreferences"?: TravelPreferences
}
```

### GET /api/executives/[id]

Get executive profile with all related data.

**Response:**
```typescript
{
  "data": {
    "executive": ExecutiveProfile,
    "directReports": DirectReport[],
    "familyMembers": FamilyMember[],
    "memberships": Membership[],
    "stats": {
      "meetingsThisMonth": number,
      "pendingTasks": number,
      "pendingApprovals": number
    }
  }
}
```

### PATCH /api/executives/[id]

Update executive profile.

### DELETE /api/executives/[id]

Delete executive profile.

### GET /api/executives/[id]/direct-reports

List direct reports.

### POST /api/executives/[id]/direct-reports

Add direct report.

### GET /api/executives/[id]/family

List family members.

### POST /api/executives/[id]/family

Add family member.

### GET /api/executives/[id]/memberships

List memberships.

### POST /api/executives/[id]/memberships

Add membership.

---

## 9. Contacts API

### GET /api/contacts

List contacts.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `category` | string | `vip`, `client`, `vendor`, `partner`, `personal` |
| `search` | string | Search query |
| `sortBy` | string | `name`, `company`, `last_contacted` |
| `sortOrder` | string | `asc`, `desc` |

### POST /api/contacts

Create contact.

**Request Body:**
```typescript
{
  "fullName": string,
  "title"?: string,
  "company": string,
  "email": string,
  "phone"?: string,
  "mobile"?: string,
  "address"?: Address,
  "category": ContactCategory,
  "tags"?: string[],
  "relationshipNotes"?: string,
  "executiveId"?: string,
  "assistantName"?: string,
  "assistantEmail"?: string,
  "linkedinUrl"?: string
}
```

### GET /api/contacts/[id]

Get contact details.

### PATCH /api/contacts/[id]

Update contact.

### DELETE /api/contacts/[id]

Delete contact.

### POST /api/contacts/[id]/enrich

AI-enrich contact data.

**Response:**
```typescript
{
  "data": {
    "enrichedData": {
      "company": CompanyInfo,
      "socialProfiles": SocialProfile[],
      "recentNews": NewsItem[]
    }
  }
}
```

### GET /api/contacts/search

Quick search contacts.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query |
| `limit` | number | Max results (default: 10) |

---

## 10. Concierge API

### GET /api/concierge

List concierge services.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Service category |
| `search` | string | Search query |
| `favoritesOnly` | boolean | Only favorites |

### POST /api/concierge

Create service.

**Request Body:**
```typescript
{
  "name": string,
  "description"?: string,
  "category": ServiceCategory,
  "subcategory"?: string,
  "contactName"?: string,
  "phone"?: string,
  "email"?: string,
  "website"?: string,
  "address"?: string,
  "city"?: string,
  "priceRange"?: "$" | "$$" | "$$$" | "$$$$",
  "rating"?: number,
  "notes"?: string,
  "tags"?: string[]
}
```

### GET /api/concierge/[id]

Get service details.

### PATCH /api/concierge/[id]

Update service.

### DELETE /api/concierge/[id]

Delete service.

### POST /api/concierge/[id]/favorite

Toggle favorite status.

---

## 11. AI API

### POST /api/ai/chat

Chat with Jenifer AI (streaming).

**Request Body:**
```typescript
{
  "messages": {
    "role": "user" | "assistant",
    "content": string
  }[],
  "executiveId"?: string,
  "conversationId"?: string
}
```

**Response:** Server-Sent Events stream

### GET /api/ai/conversations

List chat conversations.

### GET /api/ai/conversations/[id]

Get conversation with messages.

### POST /api/ai/conversations

Create new conversation.

### GET /api/ai/insights

Get active AI insights.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `executiveId` | string | Filter by executive |
| `type` | string | Insight type |
| `priority` | string | Priority filter |
| `status` | string | `active`, `dismissed` |

### POST /api/ai/insights/[id]/dismiss

Dismiss an insight.

### POST /api/ai/insights/[id]/action

Execute suggested action.

**Request Body:**
```typescript
{
  "actionType": string,
  "payload": any
}
```

### POST /api/ai/analyze

Request AI analysis.

**Request Body:**
```typescript
{
  "type": "meeting" | "task" | "approval" | "schedule",
  "entityId": string,
  "executiveId"?: string
}
```

### POST /api/ai/generate

Generate content with AI.

**Request Body:**
```typescript
{
  "type": "email" | "brief" | "summary" | "response",
  "input": any,
  "executiveId"?: string
}
```

**Response:**
```typescript
{
  "data": {
    "content": string,
    "type": string
  }
}
```

---

## 12. Settings API

### GET /api/settings/profile

Get current user profile.

### PATCH /api/settings/profile

Update user profile.

**Request Body:**
```typescript
{
  "fullName"?: string,
  "phone"?: string,
  "jobTitle"?: string,
  "timezone"?: string,
  "avatarUrl"?: string,
  "preferences"?: UserPreferences
}
```

### GET /api/settings/organization

Get organization settings.

### PATCH /api/settings/organization

Update organization settings (admin only).

**Request Body:**
```typescript
{
  "name"?: string,
  "logoUrl"?: string,
  "website"?: string,
  "industry"?: string,
  "size"?: string,
  "settings"?: OrgSettings,
  "aiSettings"?: AISettings
}
```

### GET /api/settings/team

List team members.

### POST /api/settings/team/invite

Invite team member.

**Request Body:**
```typescript
{
  "email": string,
  "role": "admin" | "user"
}
```

### PATCH /api/settings/team/[id]

Update team member role.

### DELETE /api/settings/team/[id]

Remove team member.

### GET /api/settings/audit-log

Get audit log (admin only).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `action` | string | Filter by action |
| `userId` | string | Filter by user |
| `startDate` | string | Start date |
| `endDate` | string | End date |
| `page` | number | Page number |

---

## 13. Integrations API

### GET /api/integrations

List user's integrations.

### GET /api/integrations/google

Initiate Google OAuth.

### GET /api/integrations/google/callback

Google OAuth callback.

### GET /api/integrations/microsoft

Initiate Microsoft OAuth.

### GET /api/integrations/microsoft/callback

Microsoft OAuth callback.

### GET /api/integrations/slack

Initiate Slack OAuth.

### GET /api/integrations/slack/callback

Slack OAuth callback.

### DELETE /api/integrations/[id]

Disconnect integration.

### POST /api/integrations/[id]/sync

Trigger manual sync.

### GET /api/integrations/[id]/calendars

List calendars for integration.

### PATCH /api/integrations/[id]/calendars/[calendarId]

Update calendar settings.

**Request Body:**
```typescript
{
  "isEnabled": boolean,
  "color"?: string
}
```

---

## API Route Implementation Template

```typescript
// apps/web/src/app/api/[resource]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const createSchema = z.object({
  title: z.string().min(1),
  // ... other fields
});

// GET - List resources
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }
  
  // Get user's org
  const { data: userData } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();
  
  // Parse query params
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  
  // Query database
  const { data, count, error } = await supabase
    .from('resources')
    .select('*', { count: 'exact' })
    .eq('org_id', userData.org_id)
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    data,
    meta: {
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  });
}

// POST - Create resource
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }
  
  // Parse and validate body
  const body = await req.json();
  const validation = createSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: validation.error.errors } },
      { status: 400 }
    );
  }
  
  // Get user's org
  const { data: userData } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();
  
  // Create resource
  const { data, error } = await supabase
    .from('resources')
    .insert({
      ...validation.data,
      org_id: userData.org_id,
      created_by: user.id
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ data }, { status: 201 });
}
```

---

**Next Document: IMPLEMENTATION_GUIDE.md** - Step-by-step setup and development guide.
