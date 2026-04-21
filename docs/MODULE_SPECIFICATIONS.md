# JeniferAI - Module Specifications

> **Detailed specifications for each application module, including features, data requirements, and AI integration points**

---

## Table of Contents

1. [Dashboard Module](#1-dashboard-module)
2. [Scheduling Module](#2-scheduling-module)
3. [Task Hub Module](#3-task-hub-module)
4. [Key Dates Module](#4-key-dates-module)
5. [Reports Module](#5-reports-module)
6. [Team Module](#6-team-module)
7. [Contacts Module](#7-contacts-module)
8. [Concierge Module](#8-concierge-module)
9. [Settings Module](#9-settings-module)
10. [Ask Jenifer Module](#10-ask-jenifer-module)

---

## 1. Dashboard Module

### 1.1 Overview

**Path:** `/dashboard`  
**Purpose:** Central hub showing today's priorities, schedule overview, and quick actions.

### 1.2 Features

| Feature | Description | Data Source |
|---------|-------------|-------------|
| Today's Schedule | Timeline of meetings | `meetings` table |
| Priority Tasks | Top tasks by priority/due date | `tasks` table |
| Pending Approvals | Count and quick access | `approvals` table |
| AI Insights | Proactive suggestions | `ai_insights` table |
| Quick Actions | Add task, schedule meeting | N/A |
| Metrics Cards | Meetings, tasks, approvals counts | Aggregated |

### 1.3 Data Requirements

```typescript
interface DashboardData {
  // Today's meetings
  todaysMeetings: Meeting[];
  
  // Priority tasks (top 5)
  priorityTasks: Task[];
  
  // Pending approvals count
  pendingApprovalsCount: number;
  
  // Active insights
  activeInsights: AIInsight[];
  
  // Metrics
  metrics: {
    meetingsToday: number;
    meetingsThisWeek: number;
    tasksCompleted: number;
    tasksPending: number;
    approvalsProcessed: number;
  };
  
  // Upcoming key dates (next 7 days)
  upcomingKeyDates: KeyDate[];
}
```

### 1.4 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | GET | Get all dashboard data |
| `/api/dashboard/metrics` | GET | Get metrics only |
| `/api/dashboard/insights` | GET | Get active AI insights |

### 1.5 AI Integration Points

| Trigger | AI Action |
|---------|-----------|
| Page load | Fetch active insights |
| Meeting approaching | Show traffic/prep alerts |
| Task overdue | Show reminder |
| Key date approaching | Show suggestions |

### 1.6 Component Structure

```
/dashboard
├── page.tsx                    # Main dashboard page
├── _components/
│   ├── schedule-timeline.tsx   # Today's meeting timeline
│   ├── priority-tasks.tsx      # Priority tasks list
│   ├── metrics-cards.tsx       # Stats cards
│   ├── ai-insights-panel.tsx   # AI suggestions
│   ├── quick-actions.tsx       # Action buttons
│   └── upcoming-dates.tsx      # Key dates preview
```

---

## 2. Scheduling Module

### 2.1 Overview

**Path:** `/scheduling/*`  
**Purpose:** Calendar management, meeting scheduling, and route planning.

### 2.2 Sub-Pages

| Page | Path | Description |
|------|------|-------------|
| Calendar | `/scheduling/calendar` | Full calendar view |
| Meeting Log | `/scheduling/meeting-log` | Searchable meeting history |
| Route Planner | `/scheduling/route-planner` | Travel route optimization |

### 2.3 Calendar Page

**Features:**
- Month/Week/Day views
- Connected calendars sidebar
- New meeting/event creation
- Meeting details slideout
- Drag-and-drop rescheduling

**Data Requirements:**
```typescript
interface CalendarPageData {
  meetings: Meeting[];
  connectedCalendars: Integration[];
  executivePreferences: SchedulingPreferences;
  weekStats: {
    totalMeetings: number;
    videoCalls: number;
    inPerson: number;
    totalAttendees: number;
  };
}
```

**AI Integration:**
- Conflict detection on meeting create/update
- Optimal time suggestions
- Meeting brief generation
- Travel time alerts

### 2.4 Meeting Log Page

**Features:**
- Searchable meeting table
- Tabs: Upcoming, Past, All
- Filters: Type, Executive, Date range
- Export functionality

**Data Requirements:**
```typescript
interface MeetingLogData {
  meetings: Meeting[];
  filters: {
    status: 'upcoming' | 'past' | 'all';
    executiveId?: string;
    meetingType?: string;
    dateRange?: { start: Date; end: Date };
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### 2.5 Route Planner Page

**Features:**
- Map view with route
- Day's out-of-office meetings
- Optimized route calculation
- Travel time estimates
- Alternative routes

**Data Requirements:**
```typescript
interface RoutePlannerData {
  date: Date;
  meetings: Meeting[]; // In-person only
  startLocation: string; // Office or home
  endLocation: string;
  route: {
    waypoints: Location[];
    totalDistance: number;
    totalDuration: number;
    legs: RouteLeg[];
  };
}
```

**AI Integration:**
- Traffic-aware departure times
- Route optimization suggestions
- Alternative route recommendations

### 2.6 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meetings` | GET | List meetings with filters |
| `/api/meetings` | POST | Create meeting |
| `/api/meetings/[id]` | GET | Get meeting details |
| `/api/meetings/[id]` | PATCH | Update meeting |
| `/api/meetings/[id]` | DELETE | Delete meeting |
| `/api/meetings/[id]/brief` | GET | Get AI meeting brief |
| `/api/scheduling/availability` | POST | Check availability |
| `/api/scheduling/suggest-times` | POST | Get AI time suggestions |
| `/api/scheduling/route` | POST | Calculate route |

---

## 3. Task Hub Module

### 3.1 Overview

**Path:** `/tasks/*`  
**Purpose:** Task management, approvals workflow, and delegation.

### 3.2 Sub-Pages

| Page | Path | Description |
|------|------|-------------|
| To-Do | `/tasks/todo` | Task management |
| Approvals | `/tasks/approvals` | Approval requests |
| Delegations | `/tasks/delegations` | Delegated tasks |

### 3.3 To-Do Page

**Features:**
- Multiple views: Board (Kanban), List, Table
- Filters: Priority, Category, Executive, Status
- Search functionality
- Drag-and-drop status changes
- Task detail slideout
- Subtasks support

**Data Requirements:**
```typescript
interface TodoPageData {
  tasks: Task[];
  filters: {
    status?: TaskStatus[];
    priority?: Priority[];
    category?: string;
    executiveId?: string;
    assignedTo?: string;
    search?: string;
  };
  view: 'board' | 'list' | 'table';
  groupBy?: 'status' | 'priority' | 'category' | 'executive';
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  executive_id?: string;
  assigned_to?: string;
  due_date?: Date;
  subtasks: Subtask[];
  tags: string[];
  attachments: Attachment[];
  ai_suggested_priority?: string;
  created_at: Date;
  updated_at: Date;
}
```

**AI Integration:**
- Duplicate detection on create
- Priority suggestions
- Due date recommendations
- Related task suggestions

### 3.4 Approvals Page

**Features:**
- Tabs: Pending, Approved, Rejected, All
- Approval detail view
- Approve/Reject/Request Info actions
- Amount and category filters
- Urgency indicators

**Data Requirements:**
```typescript
interface ApprovalsPageData {
  approvals: Approval[];
  filters: {
    status: ApprovalStatus;
    type?: ApprovalType;
    urgency?: Urgency;
    executiveId?: string;
  };
  counts: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface Approval {
  id: string;
  title: string;
  description: string;
  approval_type: 'expense' | 'calendar' | 'document' | 'travel' | 'purchase' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  amount?: number;
  currency?: string;
  executive_id: string;
  submitted_by: string;
  decided_by?: string;
  decision_notes?: string;
  attachments: Attachment[];
  ai_risk_score?: number;
  ai_recommendation?: string;
  created_at: Date;
  decided_at?: Date;
}
```

**AI Integration:**
- Anomaly detection (unusual amounts)
- Risk scoring
- Approval recommendations
- Pattern-based suggestions

### 3.5 Delegations Page

**Features:**
- Delegated tasks list
- Delegation status tracking
- Accept/Reject delegations
- Completion tracking

**Data Requirements:**
```typescript
interface DelegationsPageData {
  delegatedByMe: Delegation[];
  delegatedToMe: Delegation[];
  filters: {
    status?: DelegationStatus;
    direction: 'from_me' | 'to_me' | 'all';
  };
}
```

### 3.6 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET | List tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/[id]` | GET | Get task |
| `/api/tasks/[id]` | PATCH | Update task |
| `/api/tasks/[id]` | DELETE | Delete task |
| `/api/tasks/[id]/complete` | POST | Mark complete |
| `/api/approvals` | GET | List approvals |
| `/api/approvals` | POST | Create approval |
| `/api/approvals/[id]` | GET | Get approval |
| `/api/approvals/[id]/approve` | POST | Approve |
| `/api/approvals/[id]/reject` | POST | Reject |
| `/api/approvals/[id]/request-info` | POST | Request info |
| `/api/delegations` | GET | List delegations |
| `/api/delegations` | POST | Create delegation |
| `/api/delegations/[id]/accept` | POST | Accept |
| `/api/delegations/[id]/complete` | POST | Complete |

---

## 4. Key Dates Module

### 4.1 Overview

**Path:** `/key-dates`  
**Purpose:** Track important dates like birthdays, anniversaries, deadlines.

### 4.2 Features

- Multiple views: List, Card, Calendar
- Category tabs with counts
- Search and filter
- Add/Edit date slideout
- Reminder configuration
- Related person linking

### 4.3 Data Requirements

```typescript
interface KeyDatesPageData {
  keyDates: KeyDate[];
  filters: {
    category?: KeyDateCategory;
    executiveId?: string;
    search?: string;
    dateRange?: { start: Date; end: Date };
  };
  view: 'list' | 'card' | 'calendar';
  categoryCounts: Record<KeyDateCategory, number>;
}

interface KeyDate {
  id: string;
  title: string;
  description?: string;
  date: Date;
  end_date?: Date;
  category: 'birthday' | 'anniversary' | 'deadline' | 'milestone' | 
            'travel' | 'financial' | 'team' | 'personal' | 'vip' | 
            'expiration' | 'holiday' | 'other';
  related_person?: string;
  related_contact_id?: string;
  related_family_member_id?: string;
  executive_id?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  reminder_days: number[];
  tags: string[];
  ai_suggested_actions?: SuggestedAction[];
}

type KeyDateCategory = 
  | 'birthday' | 'anniversary' | 'deadline' | 'milestone'
  | 'travel' | 'financial' | 'team' | 'personal' | 'vip'
  | 'expiration' | 'holiday' | 'other';
```

### 4.4 AI Integration

| Trigger | AI Action |
|---------|-----------|
| Date approaching | Generate preparation suggestions |
| Birthday | Suggest gift ideas, restaurant reservations |
| Anniversary | Suggest celebration plans |
| Deadline | Check related tasks, send reminders |
| Expiration | Alert for renewals |

### 4.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/key-dates` | GET | List key dates |
| `/api/key-dates` | POST | Create key date |
| `/api/key-dates/[id]` | GET | Get key date |
| `/api/key-dates/[id]` | PATCH | Update key date |
| `/api/key-dates/[id]` | DELETE | Delete key date |
| `/api/key-dates/upcoming` | GET | Get upcoming dates |
| `/api/key-dates/[id]/suggestions` | GET | Get AI suggestions |

---

## 5. Reports Module

### 5.1 Overview

**Path:** `/reports/*`  
**Purpose:** Analytics and insights on calendar, inbox, and productivity.

### 5.2 Sub-Pages

| Page | Path | Description |
|------|------|-------------|
| Calendar Insights | `/reports/calendar-insights` | Meeting analytics |
| Inbox Insights | `/reports/inbox-insights` | Email analytics |
| Throughput | `/reports/throughput` | Productivity metrics |

### 5.3 Calendar Insights Page

**Metrics:**
- Average meetings per week
- Internal vs External ratio
- Time in meetings (% of work hours)
- Drive time per week
- Meeting distribution by day/hour
- Top meeting contacts
- Department breakdown

**Data Requirements:**
```typescript
interface CalendarInsightsData {
  dateRange: { start: Date; end: Date };
  executiveId?: string;
  
  metrics: {
    avgMeetingsPerWeek: number;
    internalMeetings: number;
    externalMeetings: number;
    totalMeetingHours: number;
    percentOfWorkHours: number;
    avgDriveTimePerWeek: number;
  };
  
  charts: {
    meetingsByDay: { day: string; count: number }[];
    meetingsByHour: { hour: number; count: number }[];
    meetingsByType: { type: string; count: number }[];
    topContacts: { name: string; count: number }[];
  };
}
```

### 5.4 Throughput Page

**Metrics:**
- Tasks completed per week
- Average task completion time
- Approval turnaround time
- Productivity trends

**Data Requirements:**
```typescript
interface ThroughputData {
  dateRange: { start: Date; end: Date };
  
  metrics: {
    tasksCompletedThisWeek: number;
    tasksCompletedLastWeek: number;
    avgCompletionDays: number;
    approvalsProcessed: number;
    avgApprovalTurnaround: number;
  };
  
  trends: {
    weeklyTaskCompletion: { week: string; count: number }[];
    tasksByCategory: { category: string; count: number }[];
  };
}
```

### 5.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/calendar-insights` | GET | Calendar analytics |
| `/api/reports/inbox-insights` | GET | Email analytics |
| `/api/reports/throughput` | GET | Productivity metrics |

---

## 6. Team Module

### 6.1 Overview

**Path:** `/team/*`  
**Purpose:** Manage executive profiles and their information.

### 6.2 Sub-Pages

| Page | Path | Description |
|------|------|-------------|
| Executives | `/team/executives` | Executive list |
| Executive Profile | `/team/executives/[id]` | Executive details |

### 6.3 Executives List Page

**Features:**
- Grid/List view of executives
- Search functionality
- Add executive slideout
- Quick status indicators

**Data Requirements:**
```typescript
interface ExecutivesPageData {
  executives: ExecutiveProfile[];
  search?: string;
}
```

### 6.4 Executive Profile Page

**Features:**
- Profile header with contact info
- Tabs: Overview, Direct Reports, Family, Memberships
- Edit profile functionality
- Preference management

**Tabs:**

| Tab | Content | Data Source |
|-----|---------|-------------|
| Overview | Bio, contact, preferences | `executive_profiles` |
| Direct Reports | Team members | `direct_reports` |
| Family | Family members | `family_members` |
| Memberships | Loyalty programs | `memberships` |

**Data Requirements:**
```typescript
interface ExecutiveProfilePageData {
  executive: ExecutiveProfile;
  directReports: DirectReport[];
  familyMembers: FamilyMember[];
  memberships: Membership[];
  
  stats: {
    meetingsThisMonth: number;
    pendingTasks: number;
    pendingApprovals: number;
  };
}

interface ExecutiveProfile {
  id: string;
  full_name: string;
  title: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  office_location?: string;
  timezone: string;
  bio?: string;
  
  scheduling_preferences: {
    meeting_buffer_minutes: number;
    preferred_meeting_times: string[];
    max_meetings_per_day?: number;
    working_hours: { start: string; end: string };
  };
  
  dietary_preferences: {
    restrictions: string[];
    allergies: string[];
    favorites: string[];
  };
  
  travel_preferences: {
    preferred_airlines: string[];
    seat_preference: string;
    class_preference: string;
    hotel_preferences: string[];
  };
}
```

### 6.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/executives` | GET | List executives |
| `/api/executives` | POST | Create executive |
| `/api/executives/[id]` | GET | Get executive |
| `/api/executives/[id]` | PATCH | Update executive |
| `/api/executives/[id]` | DELETE | Delete executive |
| `/api/executives/[id]/direct-reports` | GET | Get direct reports |
| `/api/executives/[id]/family` | GET | Get family members |
| `/api/executives/[id]/memberships` | GET | Get memberships |

---

## 7. Contacts Module

### 7.1 Overview

**Path:** `/contacts`  
**Purpose:** Contact directory with categorization and relationship tracking.  
**Tier:** Professional+

### 7.2 Features

- Contact table with search
- Category tabs: All, VIP, Clients, Vendors, Partners, Personal
- Contact detail slideout
- Add/Edit contact
- Relationship notes
- Last contacted tracking

### 7.3 Data Requirements

```typescript
interface ContactsPageData {
  contacts: Contact[];
  filters: {
    category?: ContactCategory;
    search?: string;
    executiveId?: string;
  };
  categoryCounts: Record<ContactCategory, number>;
  sortBy: 'name' | 'company' | 'last_contacted';
  sortOrder: 'asc' | 'desc';
}

interface Contact {
  id: string;
  full_name: string;
  title?: string;
  company: string;
  email: string;
  phone?: string;
  mobile?: string;
  
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  
  category: 'vip' | 'client' | 'vendor' | 'partner' | 'personal' | 'other';
  tags: string[];
  
  relationship_notes?: string;
  relationship_strength?: number; // 1-5
  
  assistant_name?: string;
  assistant_email?: string;
  assistant_phone?: string;
  
  linkedin_url?: string;
  
  last_contacted_at?: Date;
  next_followup_at?: Date;
  
  executive_id?: string;
}
```

### 7.4 AI Integration

- Contact enrichment (LinkedIn, company info)
- Relationship strength suggestions
- Follow-up reminders
- Meeting prep with contact info

### 7.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contacts` | GET | List contacts |
| `/api/contacts` | POST | Create contact |
| `/api/contacts/[id]` | GET | Get contact |
| `/api/contacts/[id]` | PATCH | Update contact |
| `/api/contacts/[id]` | DELETE | Delete contact |
| `/api/contacts/[id]/enrich` | POST | AI enrich contact |
| `/api/contacts/search` | GET | Search contacts |

---

## 8. Concierge Module

### 8.1 Overview

**Path:** `/concierge`  
**Purpose:** Service provider directory and vendor management.  
**Tier:** Professional+

### 8.2 Features

- Service provider cards
- Category filtering
- Favorites
- Search
- Add/Edit service
- Usage tracking

### 8.3 Data Requirements

```typescript
interface ConciergePageData {
  services: ConciergeService[];
  filters: {
    category?: ServiceCategory;
    search?: string;
    favoritesOnly?: boolean;
  };
  categoryCounts: Record<ServiceCategory, number>;
}

interface ConciergeService {
  id: string;
  name: string;
  description?: string;
  
  category: 'restaurant' | 'hotel' | 'transportation' | 'venue' | 
            'gift' | 'florist' | 'catering' | 'entertainment' | 'other';
  subcategory?: string;
  
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  rating?: number;
  
  notes?: string;
  special_instructions?: string;
  tags: string[];
  
  is_favorite: boolean;
  times_used: number;
  last_used_at?: Date;
}
```

### 8.4 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/concierge` | GET | List services |
| `/api/concierge` | POST | Create service |
| `/api/concierge/[id]` | GET | Get service |
| `/api/concierge/[id]` | PATCH | Update service |
| `/api/concierge/[id]` | DELETE | Delete service |
| `/api/concierge/[id]/favorite` | POST | Toggle favorite |

---

## 9. Settings Module

### 9.1 Overview

**Path:** `/settings`  
**Purpose:** User, organization, and integration settings.

### 9.2 Tabs

| Tab | Path | Description | Access |
|-----|------|-------------|--------|
| Profile | `/settings?tab=profile` | User profile | All |
| Organization | `/settings?tab=organization` | Org settings | Admin |
| Integrations | `/settings?tab=integrations` | Connected apps | All |
| Team | `/settings?tab=team` | Team members | Admin |
| Billing | `/settings?tab=billing` | Subscription | Admin |
| Audit Log | `/settings?tab=audit` | Activity log | Admin |

### 9.3 Profile Tab

**Fields:**
- Full name
- Email
- Job title
- Phone
- Timezone
- Avatar

### 9.4 Organization Tab

**Fields:**
- Organization name
- Logo
- Website
- Industry
- Company size
- AI settings (proactive suggestions, learning)

### 9.5 Integrations Tab

**Available Integrations:**
- Google Calendar
- Microsoft Outlook
- Gmail
- Slack
- Zoom
- Microsoft Teams

### 9.6 Team Tab

**Features:**
- Team member list
- Invite member
- Edit roles
- Remove member

### 9.7 Billing Tab

**Features:**
- Current plan display
- Plan comparison
- Payment method
- Billing history
- Upgrade/downgrade

### 9.8 Audit Log Tab

**Features:**
- Activity table
- Filters: Action, User, Date
- Export

### 9.9 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings/profile` | GET | Get profile |
| `/api/settings/profile` | PATCH | Update profile |
| `/api/settings/organization` | GET | Get org settings |
| `/api/settings/organization` | PATCH | Update org |
| `/api/settings/team` | GET | List team |
| `/api/settings/team/invite` | POST | Invite member |
| `/api/settings/team/[id]` | DELETE | Remove member |
| `/api/settings/audit-log` | GET | Get audit log |

---

## 10. Ask Jenifer Module

### 10.1 Overview

**Path:** `/ask-jenifer`  
**Purpose:** Chat interface for direct AI interaction.

### 10.2 Features

- Chat interface with message history
- Context-aware responses
- Tool execution (search, create suggestions)
- Conversation history
- Executive context selection

### 10.3 Data Requirements

```typescript
interface AskJeniferPageData {
  conversations: AIConversation[];
  currentConversation?: AIConversation;
  messages: AIMessage[];
  selectedExecutiveId?: string;
}

interface AIConversation {
  id: string;
  title: string;
  executive_id?: string;
  created_at: Date;
  last_message_at: Date;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
  created_at: Date;
}
```

### 10.4 Chat Capabilities

| Capability | Example Query |
|------------|---------------|
| Meeting lookup | "What meetings do I have tomorrow?" |
| Task management | "Show me high priority tasks" |
| Contact search | "Find John Smith's contact info" |
| Key date check | "Any birthdays coming up?" |
| Email drafting | "Draft an email to reschedule the board meeting" |
| Scheduling help | "Find a time for a 1-hour meeting with Sarah" |
| General questions | "What's the status of the Acme project?" |

### 10.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Send message (streaming) |
| `/api/ai/conversations` | GET | List conversations |
| `/api/ai/conversations` | POST | Create conversation |
| `/api/ai/conversations/[id]` | GET | Get conversation |
| `/api/ai/conversations/[id]/messages` | GET | Get messages |

---

## Module Dependencies

```
Dashboard
├── depends on: meetings, tasks, approvals, key_dates, ai_insights
└── provides: quick overview, navigation

Scheduling
├── depends on: meetings, integrations, executive_profiles
└── provides: calendar management, meeting creation

Task Hub
├── depends on: tasks, approvals, delegations, users
└── provides: task management, approval workflow

Key Dates
├── depends on: key_dates, contacts, family_members
└── provides: date tracking, reminders

Reports
├── depends on: meetings, tasks, approvals (aggregated)
└── provides: analytics, insights

Team
├── depends on: executive_profiles, direct_reports, family_members, memberships
└── provides: executive management

Contacts
├── depends on: contacts
└── provides: contact directory

Concierge
├── depends on: concierge_services
└── provides: vendor management

Settings
├── depends on: users, organizations, integrations, audit_log
└── provides: configuration

Ask Jenifer
├── depends on: all modules (read access)
└── provides: AI chat interface
```

---

**Next Document: INTEGRATIONS.md** - Third-party integration specifications.
