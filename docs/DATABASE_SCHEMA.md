# JeniferAI Database Schema

> **Complete PostgreSQL database schema for Supabase implementation**
> 
> This document defines all tables, relationships, indexes, RLS policies, and triggers needed for the JeniferAI platform.

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Core Tables](#2-core-tables)
3. [Module Tables](#3-module-tables)
4. [AI Engine Tables](#4-ai-engine-tables)
5. [Integration Tables](#5-integration-tables)
6. [System Tables](#6-system-tables)
7. [Indexes](#7-indexes)
8. [Row Level Security (RLS)](#8-row-level-security-rls)
9. [Triggers & Functions](#9-triggers--functions)
10. [Migration Order](#10-migration-order)

---

## 1. Database Overview

### 1.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organizations  │◄──────│     users       │───────►│  integrations   │
└────────┬────────┘       └────────┬────────┘       └─────────────────┘
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│executive_profiles│◄─────│user_executive_  │
└────────┬────────┘       │  assignments    │
         │                └─────────────────┘
         │
         ├──────────────────┬──────────────────┬──────────────────┐
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    meetings     │ │     tasks       │ │   approvals     │ │   key_dates     │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
         │
         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    contacts     │ │concierge_services│ │  ai_insights    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 1.2 Naming Conventions

- **Tables**: `snake_case`, plural (e.g., `users`, `meetings`)
- **Columns**: `snake_case` (e.g., `created_at`, `org_id`)
- **Primary Keys**: `id` (UUID)
- **Foreign Keys**: `{table_singular}_id` (e.g., `user_id`, `org_id`)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`
- **Booleans**: `is_` or `has_` prefix (e.g., `is_active`, `has_completed`)

### 1.3 Common Column Types

```sql
-- UUID for all IDs
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Timestamps
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
deleted_at TIMESTAMPTZ  -- For soft deletes

-- Foreign key to organization (multi-tenancy)
org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE

-- JSONB for flexible data
metadata JSONB DEFAULT '{}'::jsonb
preferences JSONB DEFAULT '{}'::jsonb
```

---

## 2. Core Tables

### 2.1 organizations

The root tenant table. All data is scoped to an organization.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  website VARCHAR(255),
  
  -- Company Details
  industry VARCHAR(100),
  size VARCHAR(50), -- '1-10', '11-50', '51-200', '201-500', '500+'
  
  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'trial', -- 'trial', 'starter', 'professional', 'enterprise'
  subscription_status VARCHAR(50) DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'paused'
  trial_ends_at TIMESTAMPTZ,
  
  -- Stripe Integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Settings
  settings JSONB DEFAULT '{
    "timezone": "America/Los_Angeles",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h",
    "week_starts_on": "sunday"
  }'::jsonb,
  
  -- AI Settings
  ai_settings JSONB DEFAULT '{
    "proactive_suggestions": true,
    "auto_conflict_detection": true,
    "learning_enabled": true,
    "notification_frequency": "realtime"
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_tier, subscription_status);
```

### 2.2 users

Extends Supabase auth.users with application-specific data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Profile
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  job_title VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  
  -- Role & Permissions
  role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user'
  permissions JSONB DEFAULT '[]'::jsonb,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  onboarding_data JSONB DEFAULT '{}'::jsonb,
  
  -- Preferences
  preferences JSONB DEFAULT '{
    "theme": "system",
    "notifications": {
      "email": true,
      "push": true,
      "slack": false
    },
    "dashboard": {
      "default_view": "today",
      "widgets": ["meetings", "tasks", "approvals"]
    }
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(org_id, email)
);

-- Indexes
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(org_id, role);
```

### 2.3 executive_profiles

The central entity that most features revolve around.

```sql
CREATE TABLE executive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Info
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  
  -- Location
  office_location VARCHAR(255),
  office_address TEXT,
  home_address TEXT,
  timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  
  -- Bio
  bio TEXT,
  
  -- Scheduling Preferences
  scheduling_preferences JSONB DEFAULT '{
    "meeting_buffer_minutes": 15,
    "preferred_meeting_times": ["morning", "afternoon"],
    "max_meetings_per_day": null,
    "focus_time_blocks": [],
    "preferred_meeting_duration": 30,
    "avoid_days": [],
    "working_hours": {
      "start": "09:00",
      "end": "18:00"
    }
  }'::jsonb,
  
  -- Communication Preferences
  communication_preferences JSONB DEFAULT '{
    "preferred_contact_method": "email",
    "response_time_expectation": "same_day",
    "cc_on_emails": true
  }'::jsonb,
  
  -- Dietary Preferences
  dietary_preferences JSONB DEFAULT '{
    "restrictions": [],
    "allergies": [],
    "favorites": [],
    "dislikes": []
  }'::jsonb,
  
  -- Travel Preferences
  travel_preferences JSONB DEFAULT '{
    "preferred_airlines": [],
    "seat_preference": "aisle",
    "class_preference": "business",
    "hotel_preferences": [],
    "loyalty_programs": [],
    "tsa_precheck": false,
    "global_entry": false,
    "passport_expiry": null
  }'::jsonb,
  
  -- Dining Preferences
  dining_preferences JSONB DEFAULT '{
    "cuisine_preferences": [],
    "favorite_restaurants": [],
    "price_range": "high"
  }'::jsonb,
  
  -- Gift Preferences
  gift_preferences JSONB DEFAULT '{
    "interests": [],
    "favorite_brands": [],
    "sizes": {},
    "avoid": []
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_executive_profiles_org ON executive_profiles(org_id);
CREATE INDEX idx_executive_profiles_active ON executive_profiles(org_id, is_active);
```

### 2.4 user_executive_assignments

Many-to-many relationship between users (EAs) and executives.

```sql
CREATE TABLE user_executive_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES executive_profiles(id) ON DELETE CASCADE,
  
  -- Assignment Details
  is_primary BOOLEAN DEFAULT FALSE, -- Primary EA for this executive
  role VARCHAR(50) DEFAULT 'assistant', -- 'assistant', 'backup', 'delegate'
  
  -- Permissions for this executive
  permissions JSONB DEFAULT '{
    "calendar": ["read", "write"],
    "tasks": ["read", "write"],
    "approvals": ["read", "write"],
    "contacts": ["read", "write"],
    "settings": ["read"]
  }'::jsonb,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, executive_id)
);

-- Indexes
CREATE INDEX idx_user_exec_assignments_user ON user_executive_assignments(user_id);
CREATE INDEX idx_user_exec_assignments_exec ON user_executive_assignments(executive_id);
CREATE INDEX idx_user_exec_assignments_primary ON user_executive_assignments(executive_id, is_primary);
```

### 2.5 direct_reports

People who report to an executive.

```sql
CREATE TABLE direct_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES executive_profiles(id) ON DELETE CASCADE,
  
  -- Report Info
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  department VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_direct_reports_exec ON direct_reports(executive_id);
```

### 2.6 family_members

Family members of executives (for key dates, gifts, etc.).

```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES executive_profiles(id) ON DELETE CASCADE,
  
  -- Member Info
  full_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'other'
  birthday DATE,
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Preferences (for gifts, etc.)
  preferences JSONB DEFAULT '{
    "interests": [],
    "sizes": {},
    "favorites": []
  }'::jsonb,
  
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_members_exec ON family_members(executive_id);
```

### 2.7 memberships

Loyalty programs, club memberships, etc.

```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES executive_profiles(id) ON DELETE CASCADE,
  
  -- Membership Info
  category VARCHAR(50) NOT NULL, -- 'airlines', 'hotels', 'car_rental', 'lounges', 'clubs', 'other'
  provider_name VARCHAR(255) NOT NULL,
  program_name VARCHAR(255),
  member_number VARCHAR(255),
  tier VARCHAR(100), -- 'Gold', 'Platinum', 'Diamond', etc.
  
  -- Dates
  enrolled_at DATE,
  expires_at DATE,
  
  -- Additional Info
  benefits TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memberships_exec ON memberships(executive_id);
CREATE INDEX idx_memberships_category ON memberships(executive_id, category);
CREATE INDEX idx_memberships_expiry ON memberships(expires_at) WHERE expires_at IS NOT NULL;
```

---

## 3. Module Tables

### 3.1 meetings

Calendar events and meetings.

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Basic Info
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- Location
  location_type VARCHAR(50) DEFAULT 'virtual', -- 'virtual', 'in_person', 'phone', 'hybrid'
  location VARCHAR(500), -- Physical address or video link
  location_details TEXT,
  
  -- Virtual Meeting
  video_conference_url TEXT,
  video_conference_provider VARCHAR(50), -- 'zoom', 'teams', 'google_meet', 'other'
  video_conference_id VARCHAR(255),
  
  -- Meeting Type
  meeting_type VARCHAR(50) DEFAULT 'internal', -- 'internal', 'external', 'personal', 'travel', 'focus_time'
  category VARCHAR(100), -- 'client_call', 'team_meeting', 'interview', etc.
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- RRULE format
  recurrence_parent_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'confirmed', -- 'tentative', 'confirmed', 'cancelled'
  
  -- Attendees (stored as JSONB for flexibility)
  attendees JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "email": "", "name": "", "status": "accepted|declined|tentative", "is_organizer": bool }]
  
  -- External Calendar Sync
  external_calendar_id VARCHAR(255),
  external_event_id VARCHAR(255),
  external_calendar_provider VARCHAR(50), -- 'google', 'outlook'
  last_synced_at TIMESTAMPTZ,
  
  -- AI-Generated Content
  ai_meeting_brief TEXT,
  ai_suggested_prep JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_meetings_org ON meetings(org_id);
CREATE INDEX idx_meetings_exec ON meetings(executive_id);
CREATE INDEX idx_meetings_time ON meetings(org_id, start_time, end_time);
CREATE INDEX idx_meetings_date ON meetings(org_id, DATE(start_time));
CREATE INDEX idx_meetings_external ON meetings(external_calendar_id, external_event_id);
CREATE INDEX idx_meetings_recurring ON meetings(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
```

### 3.2 tasks

Task management with multiple statuses and priorities.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  
  -- Ownership
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Basic Info
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Status & Priority
  status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'waiting', 'done', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Categorization
  category VARCHAR(100), -- 'scheduling', 'travel', 'admin', 'communication', 'research', 'other'
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Dates
  due_date TIMESTAMPTZ,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Related Items
  related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  related_approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
  related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Subtasks (stored as JSONB)
  subtasks JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "id": "", "title": "", "completed": bool }]
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "id": "", "name": "", "url": "", "type": "", "size": 0 }]
  
  -- AI Suggestions
  ai_suggested_priority VARCHAR(20),
  ai_suggested_due_date TIMESTAMPTZ,
  ai_notes TEXT,
  
  -- Position for board view
  position INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_org ON tasks(org_id);
CREATE INDEX idx_tasks_exec ON tasks(executive_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(org_id, status);
CREATE INDEX idx_tasks_due ON tasks(org_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_priority ON tasks(org_id, priority, status);
```

### 3.3 approvals

Approval requests and workflow.

```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES executive_profiles(id) ON DELETE CASCADE,
  
  -- Ownership
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Basic Info
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Type & Category
  approval_type VARCHAR(50) NOT NULL, -- 'expense', 'calendar', 'document', 'travel', 'purchase', 'time_off', 'other'
  category VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'info_requested', 'cancelled'
  urgency VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Financial (for expense approvals)
  amount DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Dates
  due_date TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  
  -- Decision
  decision_notes TEXT,
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Related Items
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- AI Analysis
  ai_risk_score INTEGER, -- 0-100
  ai_recommendation VARCHAR(50), -- 'approve', 'review', 'reject'
  ai_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approvals_org ON approvals(org_id);
CREATE INDEX idx_approvals_exec ON approvals(executive_id);
CREATE INDEX idx_approvals_status ON approvals(org_id, status);
CREATE INDEX idx_approvals_submitted ON approvals(submitted_by);
CREATE INDEX idx_approvals_pending ON approvals(org_id, executive_id, status) WHERE status = 'pending';
```

### 3.4 delegations

Task delegations between team members.

```sql
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Delegation Details
  delegated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegated_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed', 'cancelled'
  
  -- Notes
  delegation_notes TEXT,
  completion_notes TEXT,
  
  -- Dates
  due_date TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delegations_task ON delegations(task_id);
CREATE INDEX idx_delegations_from ON delegations(delegated_by);
CREATE INDEX idx_delegations_to ON delegations(delegated_to);
CREATE INDEX idx_delegations_status ON delegations(org_id, status);
```

### 3.5 key_dates

Important dates to track and remember.

```sql
CREATE TABLE key_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Date
  date DATE NOT NULL,
  time TIME,
  end_date DATE, -- For multi-day events
  
  -- Categorization
  category VARCHAR(50) NOT NULL, -- 'birthday', 'anniversary', 'deadline', 'milestone', 'travel', 'financial', 'team', 'personal', 'vip', 'expiration', 'holiday', 'other'
  
  -- Related Person
  related_person VARCHAR(255),
  related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  related_family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- RRULE format
  
  -- Reminders
  reminder_days JSONB DEFAULT '[7, 1]'::jsonb, -- Days before to remind
  
  -- Tags
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- AI Suggestions
  ai_suggested_actions JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "action": "book_restaurant", "details": "..." }]
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_key_dates_org ON key_dates(org_id);
CREATE INDEX idx_key_dates_exec ON key_dates(executive_id);
CREATE INDEX idx_key_dates_date ON key_dates(org_id, date);
CREATE INDEX idx_key_dates_category ON key_dates(org_id, category);
CREATE INDEX idx_key_dates_upcoming ON key_dates(date) WHERE date >= CURRENT_DATE;
```

### 3.6 contacts

Contact directory.

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  
  -- Contact Details
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  
  -- Categorization
  category VARCHAR(50) DEFAULT 'other', -- 'vip', 'client', 'vendor', 'partner', 'personal', 'other'
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Relationship
  relationship_notes TEXT,
  relationship_strength INTEGER DEFAULT 3, -- 1-5
  
  -- Social
  linkedin_url VARCHAR(500),
  twitter_handle VARCHAR(100),
  
  -- Assistant Info (if they have an EA)
  assistant_name VARCHAR(255),
  assistant_email VARCHAR(255),
  assistant_phone VARCHAR(50),
  
  -- Preferences
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Interaction Tracking
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  
  -- AI Enrichment
  ai_enriched_data JSONB DEFAULT '{}'::jsonb,
  ai_enriched_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_contacts_org ON contacts(org_id);
CREATE INDEX idx_contacts_exec ON contacts(executive_id);
CREATE INDEX idx_contacts_category ON contacts(org_id, category);
CREATE INDEX idx_contacts_company ON contacts(org_id, company);
CREATE INDEX idx_contacts_search ON contacts USING gin(to_tsvector('english', full_name || ' ' || COALESCE(company, '')));
```

### 3.7 concierge_services

Service providers and vendors.

```sql
CREATE TABLE concierge_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Categorization
  category VARCHAR(50) NOT NULL, -- 'restaurant', 'hotel', 'transportation', 'venue', 'gift', 'florist', 'catering', 'entertainment', 'other'
  subcategory VARCHAR(100),
  
  -- Contact
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  
  -- Details
  price_range VARCHAR(20), -- '$', '$$', '$$$', '$$$$'
  rating DECIMAL(2, 1), -- 0.0 - 5.0
  
  -- Notes
  notes TEXT,
  special_instructions TEXT,
  
  -- Tags
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Favorites
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Usage Tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_concierge_org ON concierge_services(org_id);
CREATE INDEX idx_concierge_category ON concierge_services(org_id, category);
CREATE INDEX idx_concierge_favorites ON concierge_services(org_id, is_favorite) WHERE is_favorite = TRUE;
```

---

## 4. AI Engine Tables

### 4.1 ai_insights

AI-generated insights and suggestions.

```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Insight Type
  insight_type VARCHAR(50) NOT NULL, 
  -- 'conflict_detected', 'pattern_found', 'reminder', 'suggestion', 
  -- 'anomaly', 'optimization', 'preparation', 'followup'
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Content
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Suggested Actions
  suggested_actions JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "action_type": "reschedule", "label": "Move to 2pm", "payload": {...} }]
  
  -- Related Entity
  related_entity_type VARCHAR(50), -- 'meeting', 'task', 'approval', 'key_date', 'contact'
  related_entity_id UUID,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'dismissed', 'acted_upon', 'expired'
  
  -- User Response
  user_action VARCHAR(50), -- 'accepted', 'dismissed', 'snoozed'
  user_action_at TIMESTAMPTZ,
  user_feedback TEXT,
  
  -- Validity
  valid_until TIMESTAMPTZ,
  
  -- AI Metadata
  confidence_score DECIMAL(3, 2), -- 0.00 - 1.00
  model_version VARCHAR(50),
  reasoning TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_insights_org ON ai_insights(org_id);
CREATE INDEX idx_ai_insights_exec ON ai_insights(executive_id);
CREATE INDEX idx_ai_insights_user ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_active ON ai_insights(org_id, status, priority) WHERE status = 'active';
CREATE INDEX idx_ai_insights_type ON ai_insights(org_id, insight_type);
```

### 4.2 ai_patterns

Learned patterns and preferences.

```sql
CREATE TABLE ai_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  
  -- Pattern Type
  pattern_type VARCHAR(50) NOT NULL,
  -- 'meeting_time_preference', 'task_completion_pattern', 'approval_behavior',
  -- 'communication_style', 'scheduling_habit', 'travel_preference'
  
  -- Pattern Data
  pattern_key VARCHAR(255) NOT NULL, -- e.g., 'preferred_meeting_hour'
  pattern_value JSONB NOT NULL,
  -- Format varies by type, e.g., { "hour": 10, "confidence": 0.85, "sample_size": 50 }
  
  -- Confidence
  confidence_score DECIMAL(3, 2), -- 0.00 - 1.00
  sample_size INTEGER DEFAULT 0,
  
  -- Validity
  first_observed_at TIMESTAMPTZ DEFAULT NOW(),
  last_observed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, executive_id, pattern_type, pattern_key)
);

-- Indexes
CREATE INDEX idx_ai_patterns_org ON ai_patterns(org_id);
CREATE INDEX idx_ai_patterns_exec ON ai_patterns(executive_id);
CREATE INDEX idx_ai_patterns_type ON ai_patterns(org_id, pattern_type);
CREATE INDEX idx_ai_patterns_active ON ai_patterns(org_id, is_active) WHERE is_active = TRUE;
```

### 4.3 ai_conversations

Chat history with Jenifer AI.

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE SET NULL,
  
  -- Conversation Metadata
  title VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_recent ON ai_conversations(user_id, last_message_at DESC);
```

### 4.4 ai_messages

Individual messages in AI conversations.

```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  -- Message Content
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  
  -- Tool Calls (if assistant used tools)
  tool_calls JSONB DEFAULT '[]'::jsonb,
  tool_results JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  model VARCHAR(100),
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);
```

### 4.5 ai_embeddings

Vector embeddings for semantic search.

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source
  source_type VARCHAR(50) NOT NULL, -- 'meeting', 'task', 'contact', 'note', 'email'
  source_id UUID NOT NULL,
  
  -- Content
  content_chunk TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  
  -- Embedding
  embedding vector(1536), -- OpenAI ada-002 dimension
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_embeddings_org ON ai_embeddings(org_id);
CREATE INDEX idx_ai_embeddings_source ON ai_embeddings(source_type, source_id);
CREATE INDEX idx_ai_embeddings_vector ON ai_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 5. Integration Tables

### 5.1 integrations

Connected third-party services.

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Integration Type
  provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft', 'slack', 'zoom'
  integration_type VARCHAR(50) NOT NULL, -- 'calendar', 'email', 'messaging', 'video'
  
  -- OAuth Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Scopes
  scopes JSONB DEFAULT '[]'::jsonb,
  
  -- Provider-specific IDs
  provider_user_id VARCHAR(255),
  provider_email VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked', 'error'
  last_error TEXT,
  
  -- Sync Status
  last_synced_at TIMESTAMPTZ,
  sync_cursor TEXT, -- For incremental sync
  
  -- Settings
  settings JSONB DEFAULT '{
    "sync_enabled": true,
    "sync_direction": "bidirectional",
    "sync_interval_minutes": 5
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider, integration_type)
);

-- Indexes
CREATE INDEX idx_integrations_org ON integrations(org_id);
CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_integrations_provider ON integrations(provider, integration_type);
CREATE INDEX idx_integrations_sync ON integrations(status, last_synced_at) WHERE status = 'active';
```

### 5.2 calendar_sync_tokens

Sync tokens for calendar integrations.

```sql
CREATE TABLE calendar_sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  
  -- Calendar Identification
  calendar_id VARCHAR(255) NOT NULL,
  calendar_name VARCHAR(255),
  
  -- Sync Token
  sync_token TEXT,
  page_token TEXT,
  
  -- Settings
  is_primary BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  color VARCHAR(20),
  
  -- Timestamps
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(integration_id, calendar_id)
);

CREATE INDEX idx_calendar_sync_integration ON calendar_sync_tokens(integration_id);
```

---

## 6. System Tables

### 6.1 audit_log

Track all important actions for compliance and debugging.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action Details
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'export', etc.
  entity_type VARCHAR(50), -- 'meeting', 'task', 'user', etc.
  entity_id UUID,
  
  -- Change Details
  old_values JSONB,
  new_values JSONB,
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_log_org ON audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(org_id, action, created_at DESC);

-- Partition by month for performance (optional, for high-volume)
-- CREATE TABLE audit_log (...) PARTITION BY RANGE (created_at);
```

### 6.2 notifications

User notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Content
  title VARCHAR(255) NOT NULL,
  body TEXT,
  
  -- Type & Category
  notification_type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'success', 'error', 'ai_suggestion'
  category VARCHAR(50), -- 'meeting', 'task', 'approval', 'system', 'ai'
  
  -- Related Entity
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  -- Action
  action_url VARCHAR(500),
  action_label VARCHAR(100),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Delivery
  channels JSONB DEFAULT '["in_app"]'::jsonb, -- ['in_app', 'email', 'push', 'slack']
  delivered_channels JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
```

### 6.3 invitations

Team member invitations.

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Invitation Details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  
  -- Token
  token VARCHAR(255) UNIQUE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(org_id, email)
);

-- Indexes
CREATE INDEX idx_invitations_org ON invitations(org_id);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_email ON invitations(email);
```

### 6.4 feature_flags

Feature flag management.

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flag Details
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Default State
  is_enabled BOOLEAN DEFAULT FALSE,
  
  -- Rollout
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  
  -- Targeting
  allowed_tiers JSONB DEFAULT '[]'::jsonb, -- ['starter', 'professional', 'enterprise']
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  
  -- Override
  is_enabled BOOLEAN NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, feature_flag_id)
);

CREATE INDEX idx_feature_overrides_org ON org_feature_overrides(org_id);
```

---

## 7. Indexes

### 7.1 Full-Text Search Indexes

```sql
-- Meetings full-text search
CREATE INDEX idx_meetings_fts ON meetings 
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Tasks full-text search
CREATE INDEX idx_tasks_fts ON tasks 
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Contacts full-text search
CREATE INDEX idx_contacts_fts ON contacts 
USING gin(to_tsvector('english', full_name || ' ' || COALESCE(company, '') || ' ' || COALESCE(email, '')));

-- Key dates full-text search
CREATE INDEX idx_key_dates_fts ON key_dates 
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(related_person, '')));
```

### 7.2 JSONB Indexes

```sql
-- Index for searching tags
CREATE INDEX idx_tasks_tags ON tasks USING gin(tags);
CREATE INDEX idx_contacts_tags ON contacts USING gin(tags);
CREATE INDEX idx_key_dates_tags ON key_dates USING gin(tags);

-- Index for meeting attendees
CREATE INDEX idx_meetings_attendees ON meetings USING gin(attendees);
```

---

## 8. Row Level Security (RLS)

### 8.1 Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_executive_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concierge_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

### 8.2 RLS Policies

```sql
-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations: Users can only see their own org
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = auth.user_org_id());

CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (id = auth.user_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Users: Users can see members of their org
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Executive Profiles: Users can see executives in their org
CREATE POLICY "Users can view org executives"
  ON executive_profiles FOR SELECT
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can manage org executives"
  ON executive_profiles FOR ALL
  USING (org_id = auth.user_org_id());

-- Meetings: Users can see meetings in their org
CREATE POLICY "Users can view org meetings"
  ON meetings FOR SELECT
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can manage org meetings"
  ON meetings FOR ALL
  USING (org_id = auth.user_org_id());

-- Tasks: Users can see tasks in their org
CREATE POLICY "Users can view org tasks"
  ON tasks FOR SELECT
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can manage org tasks"
  ON tasks FOR ALL
  USING (org_id = auth.user_org_id());

-- Approvals: Users can see approvals in their org
CREATE POLICY "Users can view org approvals"
  ON approvals FOR SELECT
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can manage org approvals"
  ON approvals FOR ALL
  USING (org_id = auth.user_org_id());

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- AI Conversations: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own conversations"
  ON ai_conversations FOR ALL
  USING (user_id = auth.uid());

-- AI Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  ));

-- Integrations: Users can only see their own integrations
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own integrations"
  ON integrations FOR ALL
  USING (user_id = auth.uid());

-- Audit Log: Admins can view org audit log
CREATE POLICY "Admins can view org audit log"
  ON audit_log FOR SELECT
  USING (org_id = auth.user_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

## 9. Triggers & Functions

### 9.1 Updated At Trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_executive_profiles_updated_at
  BEFORE UPDATE ON executive_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_key_dates_updated_at
  BEFORE UPDATE ON key_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 9.2 Audit Log Trigger

```sql
-- Function to log changes
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  action_type VARCHAR(50);
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    new_data := to_jsonb(NEW);
    old_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    old_data := to_jsonb(OLD);
    new_data := NULL;
  END IF;

  INSERT INTO audit_log (
    org_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.org_id, OLD.org_id),
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_data,
    new_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_meetings
  AFTER INSERT OR UPDATE OR DELETE ON meetings
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_approvals
  AFTER INSERT OR UPDATE OR DELETE ON approvals
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_executive_profiles
  AFTER INSERT OR UPDATE OR DELETE ON executive_profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
```

### 9.3 New User Setup Trigger

```sql
-- Function to set up new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- If user doesn't have an org_id, they need to create one during onboarding
  -- This trigger just ensures the user record exists
  INSERT INTO users (id, email, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    -- Temporary: will be updated during onboarding
    -- For invited users, org_id comes from invitation
    COALESCE(
      (SELECT org_id FROM invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1),
      gen_random_uuid() -- Placeholder, will be replaced
    )
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 10. Migration Order

Execute migrations in this order to respect foreign key dependencies:

```
1. extensions.sql
   - Enable uuid-ossp
   - Enable pgvector
   - Enable pg_trgm (for fuzzy search)

2. core_tables.sql
   - organizations
   - users
   - executive_profiles
   - user_executive_assignments
   - direct_reports
   - family_members
   - memberships

3. module_tables.sql
   - meetings
   - tasks
   - approvals
   - delegations
   - key_dates
   - contacts
   - concierge_services

4. ai_tables.sql
   - ai_insights
   - ai_patterns
   - ai_conversations
   - ai_messages
   - ai_embeddings

5. integration_tables.sql
   - integrations
   - calendar_sync_tokens

6. system_tables.sql
   - audit_log
   - notifications
   - invitations
   - feature_flags
   - org_feature_overrides

7. indexes.sql
   - All additional indexes
   - Full-text search indexes
   - JSONB indexes

8. rls_policies.sql
   - Enable RLS on all tables
   - Create all policies

9. triggers_functions.sql
   - Helper functions
   - Updated_at triggers
   - Audit triggers
   - User setup trigger

10. seed_data.sql
    - Default feature flags
    - System configuration
```

---

## Quick Reference: Table Counts

| Category | Tables | Purpose |
|----------|--------|---------|
| Core | 7 | Organizations, Users, Executives |
| Modules | 7 | Meetings, Tasks, Approvals, etc. |
| AI Engine | 5 | Insights, Patterns, Conversations |
| Integrations | 2 | OAuth, Calendar Sync |
| System | 5 | Audit, Notifications, Feature Flags |
| **Total** | **26** | |

---

**Next Document: AI_ENGINE.md** - Detailed specification for the Jenifer AI engine architecture.
