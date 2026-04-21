# JeniferAI - Architecture & Business Logic Analysis

> **This document provides a deep analysis of the JeniferAI platform's business logic, user relationships, data flows, and entity relationships to guide backend/database implementation.**

---

## Table of Contents

1. [User Hierarchy & Relationships](#1-user-hierarchy--relationships)
2. [Authentication & Authorization Flow](#2-authentication--authorization-flow)
3. [Onboarding Flow & Data Collection](#3-onboarding-flow--data-collection)
4. [Core Entities & Relationships](#4-core-entities--relationships)
5. [Module-by-Module Analysis](#5-module-by-module-analysis)
6. [Cross-Module Data Dependencies](#6-cross-module-data-dependencies)
7. [Actions & Events Matrix](#7-actions--events-matrix)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Backend Implementation Priorities](#9-backend-implementation-priorities)

---

## 1. User Hierarchy & Relationships

### 1.1 User Types & Roles

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORGANIZATION (Tenant)                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     ADMIN (Company Owner)                     │   │
│  │  - Signs up for the company                                   │   │
│  │  - Manages billing & subscription                             │   │
│  │  - Invites team members (EAs)                                 │   │
│  │  - Full access to all settings                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EA / USER (Executive Assistant)            │   │
│  │  - Primary platform user                                      │   │
│  │  - Manages assigned executives                                │   │
│  │  - Creates tasks, meetings, approvals                         │   │
│  │  - Access based on assigned executives                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EXECUTIVE PROFILES                         │   │
│  │  - NOT users (they don't log in - Phase 1)                   │   │
│  │  - Data entities managed by EAs                               │   │
│  │  - Have preferences, calendars, contacts                      │   │
│  │  - Multiple EAs can support same executive                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Relationship Rules

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| Organization → Users | 1:N | One org has many users (admins + EAs) |
| Organization → Executives | 1:N | One org has many executive profiles |
| User → Executives | N:M | One EA can support multiple executives; one executive can have multiple EAs |
| User → Tasks | 1:N | Tasks are created by and assigned to users |
| Executive → Meetings | 1:N | Meetings belong to executives |
| Executive → Approvals | 1:N | Approvals are for specific executives |
| Executive → Contacts | 1:N | Contacts are associated with executives |
| Executive → Key Dates | 1:N | Key dates relate to executives |

### 1.3 Typical Usage Scenario

```
1. COMPANY SIGNS UP
   └── Admin creates account (becomes org owner)
   └── Completes onboarding (company info, their role, adds executives)
   └── Connects calendar integrations

2. ADMIN INVITES TEAM
   └── Settings → Team → Invite Member
   └── New EA receives invite email
   └── EA creates account (joins existing org)
   └── EA completes abbreviated onboarding

3. DAILY OPERATIONS
   └── EA logs in → sees Dashboard
   └── EA selects which executive to manage (if multiple)
   └── EA manages calendar, tasks, approvals for that executive
   └── All data is scoped to org_id + executive_id
```

---

## 2. Authentication & Authorization Flow

### 2.1 Auth Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   /login     │     │   /signup    │     │  OAuth       │
│   (Email)    │     │   (New Org)  │     │  (Google/MS) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Supabase Auth  │
                   │ (Session)      │
                   └────────┬───────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  Middleware    │
                   │  Check         │
                   └────────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
     ┌────────────────┐          ┌────────────────┐
     │ onboarding_    │          │ onboarding_    │
     │ completed=false│          │ completed=true │
     └────────┬───────┘          └────────┬───────┘
              │                           │
              ▼                           ▼
     ┌────────────────┐          ┌────────────────┐
     │  /onboarding   │          │  /dashboard    │
     └────────────────┘          └────────────────┘
```

### 2.2 Middleware Logic (Current Implementation)

```typescript
// From middleware.ts - Key routing logic:

1. No Supabase configured → Allow all (dev mode)
2. Public routes: /, /login, /signup, /forgot-password, /reset-password, /verify
3. Protected routes: /dashboard, /scheduling, /tasks, etc.

IF not logged in AND accessing protected route:
  → Redirect to / (landing/login)

IF logged in:
  - Check users.onboarding_completed
  
  IF on public route:
    IF !onboarding_completed → /onboarding
    ELSE → /dashboard
    
  IF on protected route AND !onboarding_completed:
    → /onboarding
    
  IF onboarding_completed AND on /onboarding:
    → /dashboard
```

### 2.3 Required Database Tables for Auth

```sql
-- users table (extends Supabase auth.users)
users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user',  -- 'admin' | 'user'
  job_title VARCHAR(255),
  phone VARCHAR(50),
  timezone VARCHAR(100),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 3. Onboarding Flow & Data Collection

### 3.1 Onboarding Steps

```
STEP 1: Welcome
├── Display: Welcome message, feature highlights
├── Collects: Nothing
└── Action: "Get started" → Step 2

STEP 2: Company Details
├── Display: Company information form
├── Collects:
│   ├── companyName (required)
│   ├── companySize (required): 1-10, 11-50, 51-200, 201-500, 500+
│   ├── industry (required): Technology, Finance, Healthcare, etc.
│   └── companyWebsite (optional)
└── Action: Creates/updates organizations table

STEP 3: Your Role
├── Display: Personal information form
├── Collects:
│   ├── fullName (required)
│   ├── jobTitle (required)
│   ├── role (required): executive_assistant, chief_of_staff, office_manager, executive, other
│   └── phoneNumber (required) - for MFA
└── Action: Updates users table

STEP 4: Add Executives
├── Display: Executive profile form (can add multiple)
├── Collects (per executive):
│   ├── fullName (required)
│   ├── title (required)
│   └── email (optional)
└── Action: Creates executive_profiles records

STEP 5: Connect Tools
├── Display: Integration connection buttons
├── Collects:
│   ├── Google Calendar connection
│   └── Outlook Calendar connection
└── Action: OAuth flow → creates integrations records

STEP 6: Finalization
├── Display: Animated setup progress
├── Actions:
│   ├── "Setting up your workspace..."
│   ├── "Connecting your calendars..."
│   ├── "Fetching your data..."
│   ├── "Configuring AI assistant..."
│   └── "Finalizing your environment..."
└── Final: Sets onboarding_completed=true, redirects to /dashboard
```

### 3.2 Data Created During Onboarding

```
organizations (1 record)
├── name: companyName
├── industry: industry
├── size: companySize
├── website: companyWebsite
└── subscription_tier: 'trial'

users (1 record - the signing up user)
├── org_id: → organizations.id
├── full_name: fullName
├── job_title: jobTitle
├── role: 'admin' (first user is admin)
├── phone: phoneNumber
└── onboarding_completed: true (after step 6)

executive_profiles (1+ records)
├── org_id: → organizations.id
├── full_name: executive.fullName
├── title: executive.title
└── email: executive.email

user_executive_assignments (1+ records)
├── user_id: → users.id
├── executive_id: → executive_profiles.id
└── is_primary: true (for first executive)

integrations (0-2 records)
├── org_id: → organizations.id
├── user_id: → users.id
├── provider: 'google' | 'microsoft'
├── type: 'calendar'
└── access_token, refresh_token, etc.
```

---

## 4. Core Entities & Relationships

### 4.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │     users       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ org_id (FK)     │
│ name            │       │ id (PK)         │
│ slug            │       │ email           │
│ industry        │       │ full_name       │
│ size            │       │ role            │
│ subscription_   │       │ onboarding_     │
│   tier          │       │   completed     │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │                         │
         ▼                         │
┌─────────────────┐                │
│executive_profiles│               │
├─────────────────┤                │
│ id (PK)         │◄───────────────┤
│ org_id (FK)     │                │
│ full_name       │                │
│ title           │      ┌─────────┴─────────┐
│ email           │      │user_executive_    │
│ preferences     │      │  assignments      │
└────────┬────────┘      ├───────────────────┤
         │               │ user_id (FK)      │
         │               │ executive_id (FK) │
         │               │ is_primary        │
         │               └───────────────────┘
         │
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    meetings     │  │     tasks       │  │   approvals     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ org_id (FK)     │  │ org_id (FK)     │  │ org_id (FK)     │
│ executive_id(FK)│  │ executive_id(FK)│  │ executive_id(FK)│
│ title           │  │ title           │  │ title           │
│ start_time      │  │ status          │  │ type            │
│ end_time        │  │ priority        │  │ status          │
│ attendees       │  │ due_date        │  │ amount          │
│ location        │  │ assigned_to     │  │ submitted_by    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   key_dates     │  │    contacts     │  │  integrations   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ org_id (FK)     │  │ org_id (FK)     │  │ org_id (FK)     │
│ executive_id(FK)│  │ executive_id(FK)│  │ user_id (FK)    │
│ title           │  │ name            │  │ provider        │
│ date            │  │ email           │  │ type            │
│ category        │  │ company         │  │ access_token    │
│ related_person  │  │ category        │  │ refresh_token   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 4.2 Executive Profile - Detailed Structure

The Executive Profile is the **central entity** that most features revolve around:

```typescript
interface ExecutiveProfile {
  // Core Identity
  id: string;
  org_id: string;
  full_name: string;
  title: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  
  // Location & Time
  main_office_location?: string;
  home_address?: string;
  timezone?: string;
  
  // Preferences (JSONB)
  scheduling_preferences: {
    meetingBuffer: number;        // minutes between meetings
    preferredMeetingTimes: string[];  // "Morning", "Afternoon"
    maxMeetingsPerDay?: number;
    focusTimeBlocks?: string[];   // blocked times
  };
  
  dietary_preferences: {
    restrictions: string[];       // "Vegetarian", "Gluten-free"
    allergies: string[];
    favorites: string[];
  };
  
  travel_preferences: {
    preferredAirlines: string[];
    seatPreference: string;       // "Window", "Aisle"
    classPreference: string;      // "Business", "First"
    hotelPreferences: string[];
  };
  
  dining_preferences: {
    cuisinePreferences: string[];
    favoriteRestaurants: string[];
  };
  
  // Related Data (separate tables)
  direct_reports: DirectReport[];
  family_members: FamilyMember[];
  memberships: Membership[];      // Airlines, Hotels, Lounges
  fleet_info: Vehicle[];
}
```

---

## 5. Module-by-Module Analysis

### 5.1 Dashboard Module

**Path:** `/dashboard`

**Purpose:** Central hub showing today's priorities, schedule, and quick actions.

**Data Displayed:**
- Today's meetings (from `meetings` table, filtered by date)
- Priority tasks (from `tasks` table, filtered by status/priority)
- Pending approvals count (from `approvals` table, status='pending')
- Executives managed count (from `user_executive_assignments`)
- Meeting activity chart (aggregated from `meetings`)

**Actions Available:**
| Action | Creates/Updates | Related Tables |
|--------|-----------------|----------------|
| "New Task" button | New task | `tasks` |
| "Schedule Meeting" button | New meeting | `meetings` |
| Edit meeting | Update meeting | `meetings` |
| Delete meeting | Delete meeting | `meetings` |

**Data Dependencies:**
```
Dashboard
├── meetings (today's schedule)
├── tasks (priority tasks)
├── approvals (pending count)
├── user_executive_assignments (executives count)
└── executive_profiles (executive names/avatars)
```

---

### 5.2 Scheduling Module

#### 5.2.1 Calendar Page (`/scheduling/calendar`)

**Purpose:** Full calendar view with day/week/month views.

**Data Displayed:**
- Calendar events from connected calendars
- Connected calendars list (from `integrations`)
- This week stats (aggregated meetings)
- Meeting types legend

**Actions Available:**
| Action | Creates/Updates | Related Tables |
|--------|-----------------|----------------|
| "New Meeting" | New meeting | `meetings` |
| "Add Event" | New event | `meetings` (type='event') |
| "Connect Calendar" | OAuth flow | `integrations` |
| Toggle calendar visibility | UI state only | - |
| Click event | View/edit | `meetings` |

**Data Dependencies:**
```
Calendar
├── meetings (all events)
├── integrations (connected calendars)
├── executive_profiles (for executive filter)
└── external_calendar_events (synced from Google/Outlook)
```

#### 5.2.2 Meeting Log (`/scheduling/meeting-log`)

**Purpose:** Searchable history of all meetings.

**Data Displayed:**
- Meeting table with columns: title, date, attendees, location, status
- Tabs: Upcoming, Past, All

**Actions:** Search, filter, view details, edit, delete

#### 5.2.3 Route Planner (`/scheduling/route-planner`)

**Purpose:** Optimize travel routes for out-of-office meetings.

**Data Displayed:**
- Today's out-of-office meetings
- Map with route
- Total drive time/distance

**Data Dependencies:**
```
Route Planner
├── meetings (filtered by date + location != office)
├── executive_profiles (home/office addresses)
└── Google Maps API (directions)
```

---

### 5.3 Task Hub Module

#### 5.3.1 To-Do Page (`/tasks/todo`)

**Purpose:** Task management with Kanban, List, and Table views.

**Data Displayed:**
- Tasks organized by status: To Do, In Progress, Approval, Done
- Filters: Priority, Category, Search
- Task counts per status

**Task Entity:**
```typescript
interface Task {
  id: string;
  org_id: string;
  executive_id?: string;
  created_by: string;        // user who created
  assigned_to?: string;      // user assigned to
  
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'approval' | 'done';
  category: string;          // "Scheduling", "Travel", "Admin", etc.
  
  due_date?: Date;
  completed_at?: Date;
  
  // Relationships
  related_meeting_id?: string;
  related_approval_id?: string;
  
  tags: string[];
  attachments: Attachment[];
}
```

**Actions:**
| Action | Effect |
|--------|--------|
| Add Task | Creates task with status='todo' |
| Drag to column | Updates task.status |
| Toggle complete | Updates status to 'done' or back |
| Edit task | Opens detail panel |
| Delete task | Soft delete |

#### 5.3.2 Approvals Page (`/tasks/approvals`)

**Purpose:** Review and manage approval requests.

**Approval Entity:**
```typescript
interface Approval {
  id: string;
  org_id: string;
  executive_id: string;      // approval is FOR this executive
  created_by: string;        // who submitted
  
  title: string;
  description: string;
  type: 'expense' | 'calendar' | 'document' | 'travel' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'info-requested';
  
  amount?: number;           // for expense approvals
  currency?: string;
  
  urgency: 'high' | 'medium' | 'low';
  category: string;
  
  due_date?: Date;
  decided_at?: Date;
  decision_notes?: string;
  
  attachments: Attachment[];
}
```

**Actions:**
| Action | Updates |
|--------|---------|
| Approve | status='approved', decided_at=now |
| Reject | status='rejected', decided_at=now |
| Request Info | status='info-requested' |

#### 5.3.3 Delegations Page (`/tasks/delegations`)

**Purpose:** Delegate tasks to other team members.

**Delegation Entity:**
```typescript
interface Delegation {
  id: string;
  org_id: string;
  task_id: string;           // the delegated task
  
  delegated_by: string;      // user who delegated
  delegated_to: string;      // user receiving delegation
  
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  notes?: string;
  
  due_date?: Date;
  completed_at?: Date;
}
```

---

### 5.4 Key Dates Module (`/key-dates`)

**Purpose:** Track important dates (birthdays, anniversaries, deadlines, etc.)

**Key Date Entity:**
```typescript
interface KeyDate {
  id: string;
  org_id: string;
  executive_id?: string;     // optional - can be org-wide
  
  title: string;
  description?: string;
  date: Date;
  
  category: 'birthdays' | 'anniversaries' | 'deadlines' | 'milestones' | 
            'travel' | 'financial' | 'team' | 'personal' | 'vip' | 
            'expirations' | 'holidays' | 'other';
  
  related_person?: string;   // whose birthday/anniversary
  is_recurring: boolean;
  recurrence_rule?: string;  // RRULE format
  
  reminder_days?: number[];  // days before to remind
  tags: string[];
}
```

**Views:** List (grouped by month), Card grid, Calendar

---

### 5.5 Reports Module (`/reports/*`)

#### 5.5.1 Calendar Insights (`/reports/calendar-insights`)

**Metrics Displayed:**
- Avg meetings per week
- Internal vs External ratio
- Time in meetings (% of work hours)
- Drive time per week
- Meeting distribution chart
- Peak meeting hours heatmap
- Top meeting contacts
- Department breakdown

**Data Source:** Aggregated from `meetings` table

#### 5.5.2 Inbox Insights (`/reports/inbox-insights`)

**Metrics:** Email volume, response times, top senders (requires email integration)

#### 5.5.3 Throughput (`/reports/throughput`)

**Metrics:** Tasks completed, approval turnaround, productivity trends

---

### 5.6 Team Module (`/team/*`)

#### 5.6.1 Executives List (`/team/executives`)

**Purpose:** Grid view of all executives the user supports.

**Actions:**
- Add Executive → Creates `executive_profiles` record
- Click card → Navigate to `/team/executives/[id]`
- Search/filter

#### 5.6.2 Executive Profile (`/team/executives/[id]`)

**Purpose:** Detailed view of single executive with tabs.

**Tabs:**
| Tab | Data Source |
|-----|-------------|
| Overview | `executive_profiles` (preferences, contact info) |
| Direct Reports | `direct_reports` table |
| Family | `family_members` table |
| Memberships | `memberships` table |

**Related Tables:**
```sql
direct_reports (
  id, org_id, executive_id,
  name, title, department, email
)

family_members (
  id, org_id, executive_id,
  name, relationship, birthday, notes
)

memberships (
  id, org_id, executive_id,
  category,           -- 'airlines', 'hotels', 'lounges', 'other'
  name,               -- "United MileagePlus"
  member_number,
  tier,               -- "Gold", "Platinum"
  expiration_date
)
```

---

### 5.7 Contacts Module (`/contacts`) - Pro Tier

**Purpose:** Contact directory with categories.

**Contact Entity:**
```typescript
interface Contact {
  id: string;
  org_id: string;
  executive_id?: string;     // can be org-wide or executive-specific
  
  name: string;
  title?: string;
  company: string;
  email: string;
  phone?: string;
  
  category: 'vip' | 'client' | 'vendor' | 'partner' | 'personal';
  
  address?: string;
  notes?: string;
  tags: string[];
  
  // Relationship tracking
  last_contacted?: Date;
  relationship_strength?: number;  // 1-5
}
```

---

### 5.8 Concierge Module (`/concierge`) - Pro Tier

**Purpose:** Service directory and vendor management.

**Service Entity:**
```typescript
interface ConciergeService {
  id: string;
  org_id: string;
  
  name: string;
  category: 'restaurants' | 'travel' | 'gifts' | 'venues' | 'services' | 'other';
  
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  
  notes?: string;
  rating?: number;
  tags: string[];
  
  is_favorite: boolean;
}
```

---

### 5.9 Settings Module (`/settings/*`)

#### Settings Tabs & Data

| Tab | Data Source | Actions |
|-----|-------------|---------|
| Profile | `users` | Update user info |
| Organization | `organizations` | Update org info (admin only) |
| Integrations | `integrations` | Connect/disconnect services |
| Team | `users` (same org) | Invite/remove members (admin only) |
| Billing | `subscriptions`, Stripe | Manage subscription (admin only) |
| Audit Log | `audit_log` | View activity (read-only) |

---

## 6. Cross-Module Data Dependencies

### 6.1 Shared Data Access Pattern

```
                    ┌─────────────────┐
                    │  organizations  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌─────────┐        ┌─────────┐
    │  users  │        │executives│       │settings │
    └────┬────┘        └────┬────┘        └─────────┘
         │                  │
         │    ┌─────────────┼─────────────┐
         │    │             │             │
         ▼    ▼             ▼             ▼
    ┌─────────────┐   ┌─────────┐   ┌─────────┐
    │   tasks     │   │meetings │   │approvals│
    └─────────────┘   └─────────┘   └─────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐  ┌─────────┐  ┌─────────┐
         │key_dates│  │contacts │  │concierge│
         └─────────┘  └─────────┘  └─────────┘
```

### 6.2 Executive Context

Most pages need to know **which executive** the user is currently managing:

```typescript
// Executive context flows through the app
const { selectedExecutive } = useSelectedExecutive();

// All queries are scoped:
const tasks = await supabase
  .from('tasks')
  .select('*')
  .eq('org_id', user.org_id)
  .eq('executive_id', selectedExecutive.id);
```

### 6.3 Data Sharing Between Modules

| From Module | To Module | Shared Data |
|-------------|-----------|-------------|
| Tasks | Dashboard | Priority tasks, counts |
| Meetings | Dashboard | Today's schedule |
| Approvals | Dashboard | Pending count |
| Meetings | Tasks | Create follow-up task from meeting |
| Tasks | Approvals | Task requiring approval |
| Contacts | Meetings | Attendee selection |
| Key Dates | Dashboard | Upcoming dates |
| Executives | All modules | Executive context |

---

## 7. Actions & Events Matrix

### 7.1 User Actions → Database Operations

| Page | Action | Operation | Tables Affected |
|------|--------|-----------|-----------------|
| Dashboard | New Task | INSERT | tasks |
| Dashboard | Schedule Meeting | INSERT | meetings |
| Calendar | New Meeting | INSERT | meetings |
| Calendar | Add Event | INSERT | meetings |
| Calendar | Connect Calendar | INSERT | integrations |
| Tasks/Todo | Add Task | INSERT | tasks |
| Tasks/Todo | Update Status | UPDATE | tasks |
| Tasks/Todo | Complete Task | UPDATE | tasks |
| Tasks/Todo | Delete Task | DELETE | tasks |
| Approvals | Approve | UPDATE | approvals |
| Approvals | Reject | UPDATE | approvals |
| Approvals | Request Info | UPDATE | approvals |
| Key Dates | Add Date | INSERT | key_dates |
| Key Dates | Edit Date | UPDATE | key_dates |
| Key Dates | Delete Date | DELETE | key_dates |
| Executives | Add Executive | INSERT | executive_profiles, user_executive_assignments |
| Executives | Edit Profile | UPDATE | executive_profiles |
| Contacts | Add Contact | INSERT | contacts |
| Contacts | Edit Contact | UPDATE | contacts |
| Settings/Team | Invite Member | INSERT | invitations, (later) users |
| Settings/Profile | Update Profile | UPDATE | users |
| Settings/Org | Update Org | UPDATE | organizations |

### 7.2 Event Bus Events (for cross-module communication)

```typescript
// Events that modules publish
const EVENTS = {
  // Task events
  'task.created': { taskId, executiveId },
  'task.completed': { taskId, executiveId },
  'task.status_changed': { taskId, oldStatus, newStatus },
  
  // Meeting events
  'meeting.created': { meetingId, executiveId },
  'meeting.updated': { meetingId },
  'meeting.deleted': { meetingId },
  'meeting.reminder': { meetingId, minutesBefore },
  
  // Approval events
  'approval.created': { approvalId, executiveId },
  'approval.approved': { approvalId },
  'approval.rejected': { approvalId },
  
  // Executive events
  'executive.created': { executiveId },
  'executive.updated': { executiveId },
  
  // Integration events
  'integration.connected': { provider, type },
  'integration.disconnected': { provider, type },
  'calendar.synced': { integrationId, eventsCount },
};
```

---

## 8. Data Flow Diagrams

### 8.1 Task Creation Flow

```
User clicks "New Task"
        │
        ▼
┌─────────────────┐
│ AddTaskSlideout │
│ (Form UI)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate with   │
│ Zod schema      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/v1/   │
│ tasks           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Insert into     │
│ tasks table     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Publish event:  │
│ task.created    │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ Dashboard       │  │ Audit Log       │
│ updates count   │  │ records action  │
└─────────────────┘  └─────────────────┘
```

### 8.2 Meeting Creation with Calendar Sync

```
User creates meeting
        │
        ▼
┌─────────────────┐
│ Save to local   │
│ meetings table  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check connected │
│ integrations    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────┐
│Google │  │Outlook│
│Cal API│  │Cal API│
└───┬───┘  └───┬───┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│ Store external  │
│ event IDs       │
└─────────────────┘
```

---

## 9. Backend Implementation Priorities

### 9.1 Phase 1: Core Authentication & Data (Week 1-2)

**Priority: CRITICAL**

```
1. Database Setup
   ├── organizations table
   ├── users table (extends auth.users)
   ├── executive_profiles table
   └── user_executive_assignments table

2. Auth Flow
   ├── Supabase Auth configuration
   ├── OAuth providers (Google, Microsoft)
   ├── Middleware auth checks
   └── Session management

3. Onboarding Data Persistence
   ├── Save company info → organizations
   ├── Save user info → users
   ├── Save executives → executive_profiles
   └── Set onboarding_completed flag
```

### 9.2 Phase 2: Core Modules (Week 3-4)

**Priority: HIGH**

```
1. Tasks Module
   ├── tasks table
   ├── CRUD API routes
   └── Real-time subscriptions

2. Meetings Module
   ├── meetings table
   ├── CRUD API routes
   └── Calendar integration prep

3. Approvals Module
   ├── approvals table
   ├── CRUD API routes
   └── Status workflow

4. Key Dates Module
   ├── key_dates table
   └── CRUD API routes
```

### 9.3 Phase 3: Executive Features (Week 5-6)

**Priority: MEDIUM**

```
1. Executive Profile Extensions
   ├── direct_reports table
   ├── family_members table
   └── memberships table

2. Contacts Module
   ├── contacts table
   └── CRUD API routes

3. Concierge Module
   ├── concierge_services table
   └── CRUD API routes
```

### 9.4 Phase 4: Integrations & Advanced (Week 7-8)

**Priority: MEDIUM**

```
1. Calendar Integrations
   ├── Google Calendar OAuth
   ├── Outlook Calendar OAuth
   └── Two-way sync logic

2. Reports & Analytics
   ├── Aggregation queries
   └── Dashboard metrics

3. Audit Log
   ├── audit_log table
   └── Automatic logging
```

### 9.5 Phase 5: Real-time & Polish (Week 9-10)

**Priority: LOW**

```
1. Real-time Features
   ├── Supabase Realtime subscriptions
   ├── Executive status indicator
   └── Live notifications

2. Event Bus Implementation
   ├── Cross-module events
   └── Background jobs

3. Feature Flags
   ├── feature_flags table
   └── Per-tenant overrides
```

---

## Quick Reference: Database Tables Needed

### Core Tables (Phase 1)
- `organizations`
- `users`
- `executive_profiles`
- `user_executive_assignments`
- `integrations`

### Module Tables (Phase 2-3)
- `tasks`
- `meetings`
- `approvals`
- `delegations`
- `key_dates`
- `contacts`
- `concierge_services`
- `direct_reports`
- `family_members`
- `memberships`

### System Tables (Phase 4-5)
- `audit_log`
- `feature_flags`
- `org_feature_overrides`
- `notifications`
- `invitations`

---

**This document should be referenced when implementing the backend. Each module's data requirements and relationships are documented to ensure consistent implementation.**
