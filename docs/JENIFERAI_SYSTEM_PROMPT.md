# JeniferAI - Complete System Architecture & Development Guide

> **This document serves as the authoritative system prompt and development guide for building JeniferAI, an AI-powered command center for Executive Assistants, Chiefs of Staff, and Executives.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Plugin-Based Modular Architecture (PBMA)](#4-plugin-based-modular-architecture-pbma)
5. [Core Infrastructure](#5-core-infrastructure)
6. [Authentication System](#6-authentication-system)
7. [Onboarding Flow](#7-onboarding-flow)
8. [Dashboard Layout & Navigation](#8-dashboard-layout--navigation)
9. [Feature Modules Specification](#9-feature-modules-specification)
10. [Database Schema](#10-database-schema)
11. [API Structure](#11-api-structure)
12. [UI Components Library](#12-ui-components-library)
13. [State Management](#13-state-management)
14. [Real-Time Features](#14-real-time-features)
15. [Security Implementation](#15-security-implementation)
16. [Development Guidelines](#16-development-guidelines)

---

## 1. Project Overview

### 1.1 What is JeniferAI?

JeniferAI is a **multi-tenant SaaS platform** that serves as an AI-powered command center designed to transform Executive Assistants (EAs), Chiefs of Staff (CoS), and Executives into strategic powerhouses. The platform centralizes scheduling, task management, communication, travel coordination, and institutional knowledge into one intelligent hub.

### 1.2 Core Value Proposition

- **For Executive Assistants**: Transform from task managers to strategic partners through AI-powered automation
- **For Executives**: Gain 20%+ productivity improvement through seamless coordination and proactive support
- **For Organizations**: Reduce EA turnover, preserve institutional knowledge, enable 1:3 EA-to-executive ratios

### 1.3 Target Users

| User Type | Description | Primary Interface |
|-----------|-------------|-------------------|
| **Admin** | Organization owner, manages billing and users | Web Dashboard |
| **EA/User** | Executive Assistant, primary platform user | Web Dashboard |
| **Executive** | Receives briefs, approves requests | Mobile App (Phase 2) |

### 1.4 Key Differentiators

- **Plugin-Based Architecture**: Unlimited scalability - feature #50 is as easy to add as feature #5
- **Multi-Tenant Isolation**: Complete data separation via PostgreSQL Row Level Security
- **Event-Driven Communication**: Modules communicate via Event Bus, never direct imports
- **Feature Flags First**: Every feature behind flags from day one for per-tenant customization

---

## 2. Technology Stack

### 2.1 Frontend

```json
{
  "framework": "Next.js 16 (App Router)",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS 3.4",
  "components": "shadcn/ui",
  "icons": "Lucide React",
  "forms": "React Hook Form + Zod",
  "tables": "@tanstack/react-table",
  "charts": "Recharts",
  "dates": "date-fns",
  "animations": "Framer Motion",
  "dnd": "@dnd-kit/core"
}
```

### 2.2 State Management

```json
{
  "clientState": "Zustand",
  "serverState": "TanStack Query (React Query) v5",
  "formState": "React Hook Form"
}
```

### 2.3 Backend & Database

```json
{
  "database": "Supabase (PostgreSQL)",
  "auth": "Supabase Auth",
  "realtime": "Supabase Realtime",
  "storage": "Supabase Storage",
  "edge": "Supabase Edge Functions"
}
```

### 2.4 Infrastructure

```json
{
  "monorepo": "Turborepo",
  "deployment": "Vercel",
  "billing": "Stripe",
  "email": "Resend",
  "sms": "Twilio"
}
```

### 2.5 AI Services

```json
{
  "primary": "OpenAI GPT-4o",
  "secondary": "Anthropic Claude 4 Sonnet",
  "google": "Gemini Pro 2.5"
}
```

### 2.6 External APIs

```json
{
  "calendar": ["Microsoft Graph API", "Google Calendar API"],
  "email": ["Microsoft Graph API", "Gmail API"],
  "maps": ["Google Maps Directions API", "Google Maps Places API"],
  "video": ["Zoom API", "Microsoft Teams API"],
  "communication": ["Slack API", "Twilio"]
}
```

### 2.7 Required npm Packages

```bash
# Core Framework
next@latest react@latest react-dom@latest typescript@latest

# UI & Styling
tailwindcss postcss autoprefixer
@radix-ui/react-* (via shadcn/ui)
class-variance-authority clsx tailwind-merge
lucide-react
framer-motion

# Forms & Validation
react-hook-form @hookform/resolvers zod

# State & Data
zustand @tanstack/react-query

# Tables & Data Display
@tanstack/react-table

# Charts
recharts

# Dates
date-fns date-fns-tz

# Drag & Drop
@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Database
@supabase/supabase-js @supabase/ssr

# Utilities
uuid nanoid lodash-es
```

---

## 3. Project Structure

### 3.1 Monorepo Layout (Turborepo)

```
jeniferai/
├── apps/
│   ├── web/                          # Next.js 16 Web Application
│   │   ├── app/                      # App Router
│   │   │   ├── (auth)/              # Auth route group (public)
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── signup/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── forgot-password/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reset-password/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── verify/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (onboarding)/        # Onboarding route group
│   │   │   │   ├── onboarding/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/         # Protected dashboard routes
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── scheduling/
│   │   │   │   │   ├── calendar/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── meeting-log/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── route-planner/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── todo/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── approvals/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── delegations/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── key-dates/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   ├── calendar-insights/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── inbox-insights/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── throughput/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── team/
│   │   │   │   │   ├── executives/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── executives/[id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── events/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── contacts/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── concierge/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── profile/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── organization/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── integrations/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── team/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── billing/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── audit-log/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── layout.tsx       # Dashboard layout with sidebar
│   │   │   ├── api/                 # API Routes
│   │   │   │   ├── auth/
│   │   │   │   │   └── callback/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── stripe/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── supabase/
│   │   │   │   │       └── route.ts
│   │   │   │   └── [...modules]/    # Module-specific APIs
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Landing redirect
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── not-found.tsx
│   │   │   └── globals.css
│   │   ├── components/              # App-specific components
│   │   │   ├── layouts/
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopNav.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   ├── OAuthButtons.tsx
│   │   │   │   └── MFAVerification.tsx
│   │   │   └── onboarding/
│   │   │       ├── OnboardingWizard.tsx
│   │   │       ├── steps/
│   │   │       │   ├── WelcomeStep.tsx
│   │   │       │   ├── CompanyStep.tsx
│   │   │       │   ├── RoleStep.tsx
│   │   │       │   ├── ExecutivesStep.tsx
│   │   │       │   ├── IntegrationsStep.tsx
│   │   │       │   └── CompleteStep.tsx
│   │   │       └── SetupAnimation.tsx
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── middleware.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useUser.ts
│   │   │   ├── useOrganization.ts
│   │   │   └── useFeatureFlag.ts
│   │   ├── middleware.ts            # Auth middleware
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                      # React Native (Phase 2)
│       └── ...
│
├── packages/
│   ├── core/                        # Core Infrastructure
│   │   ├── module-registry/
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── loader.ts
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── feature-flags/
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── provider.tsx
│   │   │   │   └── hooks.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── event-bus/
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── bus.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── middleware.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── auth/
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── provider.tsx
│   │   │   │   ├── hooks.ts
│   │   │   │   └── guards.tsx
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   └── database/
│   │       ├── src/
│   │       │   ├── index.ts
│   │       │   ├── client.ts
│   │       │   └── types.ts
│   │       ├── migrations/
│   │       │   └── core/
│   │       │       ├── 001_organizations.sql
│   │       │       ├── 002_users.sql
│   │       │       ├── 003_executive_profiles.sql
│   │       │       ├── 004_feature_flags.sql
│   │       │       └── 005_subscriptions.sql
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   ├── modules/                     # Feature Modules (PLUGINS)
│   │   ├── dashboard/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   ├── schema.ts
│   │   │   │   └── queries.ts
│   │   │   ├── components/
│   │   │   │   ├── DashboardOverview.tsx
│   │   │   │   ├── TodaysPriorities.tsx
│   │   │   │   ├── PendingApprovals.tsx
│   │   │   │   ├── RecentActivity.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   └── ExecutiveStatus.tsx
│   │   │   ├── api/
│   │   │   │   └── routes.ts
│   │   │   ├── hooks/
│   │   │   │   └── useDashboard.ts
│   │   │   ├── store/
│   │   │   │   └── dashboardStore.ts
│   │   │   ├── events/
│   │   │   │   ├── publishers.ts
│   │   │   │   └── subscribers.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── scheduling/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   │   └── 001_meetings.sql
│   │   │   │   ├── schema.ts
│   │   │   │   └── queries.ts
│   │   │   ├── components/
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   ├── MeetingForm.tsx
│   │   │   │   ├── MeetingLog.tsx
│   │   │   │   ├── RoutePlanner.tsx
│   │   │   │   └── ConflictResolver.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── tasks/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── 001_tasks.sql
│   │   │   │   │   ├── 002_approvals.sql
│   │   │   │   │   └── 003_delegations.sql
│   │   │   │   ├── schema.ts
│   │   │   │   └── queries.ts
│   │   │   ├── components/
│   │   │   │   ├── TodoList.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   ├── ApprovalQueue.tsx
│   │   │   │   ├── ApprovalCard.tsx
│   │   │   │   ├── DelegationList.tsx
│   │   │   │   └── TaskForm.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── key-dates/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   ├── components/
│   │   │   │   ├── KeyDatesList.tsx
│   │   │   │   ├── KeyDateCard.tsx
│   │   │   │   ├── KeyDateForm.tsx
│   │   │   │   ├── CategoryFilter.tsx
│   │   │   │   └── UpcomingDates.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── reports/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   ├── components/
│   │   │   │   ├── CalendarInsights.tsx
│   │   │   │   ├── InboxInsights.tsx
│   │   │   │   ├── ThroughputDashboard.tsx
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   └── charts/
│   │   │   │       ├── MeetingChart.tsx
│   │   │   │       ├── EmailChart.tsx
│   │   │   │       └── ThroughputChart.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── team/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── 001_direct_reports.sql
│   │   │   │   │   ├── 002_family_members.sql
│   │   │   │   │   └── 003_memberships.sql
│   │   │   │   ├── schema.ts
│   │   │   │   └── queries.ts
│   │   │   ├── components/
│   │   │   │   ├── ExecutiveList.tsx
│   │   │   │   ├── ExecutiveProfile.tsx
│   │   │   │   ├── ProfileTabs/
│   │   │   │   │   ├── OverviewTab.tsx
│   │   │   │   │   ├── DirectReportsTab.tsx
│   │   │   │   │   ├── FamilyTab.tsx
│   │   │   │   │   └── MembershipsTab.tsx
│   │   │   │   └── ExecutiveForm.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── events-hub/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   ├── components/
│   │   │   │   ├── EventsKanban.tsx
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventForm.tsx
│   │   │   │   └── EventDetails.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── contacts/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   ├── components/
│   │   │   │   ├── ContactsList.tsx
│   │   │   │   ├── ContactCard.tsx
│   │   │   │   ├── ContactForm.tsx
│   │   │   │   └── ContactDetails.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── concierge/
│   │   │   ├── manifest.ts
│   │   │   ├── index.ts
│   │   │   ├── database/
│   │   │   ├── components/
│   │   │   │   ├── ServiceDirectory.tsx
│   │   │   │   ├── ServiceCard.tsx
│   │   │   │   └── ServiceForm.tsx
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── events/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   └── settings/
│   │       ├── manifest.ts
│   │       ├── index.ts
│   │       ├── database/
│   │       ├── components/
│   │       │   ├── ProfileSettings.tsx
│   │       │   ├── OrganizationSettings.tsx
│   │       │   ├── IntegrationsSettings.tsx
│   │       │   ├── TeamSettings.tsx
│   │       │   ├── BillingSettings.tsx
│   │       │   └── AuditLog.tsx
│   │       ├── api/
│   │       ├── hooks/
│   │       ├── store/
│   │       ├── events/
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   ├── ui/                          # Shared UI Components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   ├── command.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   └── form.tsx
│   │   │   └── lib/
│   │   │       └── utils.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                       # Shared Utilities
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── date.ts
│   │   │   ├── string.ts
│   │   │   ├── validation.ts
│   │   │   └── formatting.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                       # Shared TypeScript Types
│       ├── src/
│       │   ├── index.ts
│       │   ├── database.ts
│       │   ├── api.ts
│       │   ├── auth.ts
│       │   └── modules.ts
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       └── ... (generated from packages/core/database/migrations)
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .env.local
├── .gitignore
└── README.md
```

---

## 4. Plugin-Based Modular Architecture (PBMA)

### 4.1 Core Principles

#### Principle 1: Module Independence
Every feature module is a **self-contained unit** with its own database schema, components, API routes, and business logic. Modules **NEVER import directly from other modules**. All cross-module communication happens through the Event Bus.

#### Principle 2: Manifest-Driven Configuration
Each module declares its requirements, dependencies, permissions, and navigation in a `manifest.ts` file. The Module Registry reads these manifests to dynamically compose the application.

#### Principle 3: Schema Ownership
Each module owns its database schema (e.g., `mod_tasks`, `mod_scheduling`). Core infrastructure lives in the `core` schema. Modules can only read from other schemas via views or events, never direct writes.

#### Principle 4: Feature Flags First
Every feature is behind a feature flag from day one. This enables per-tenant customization, percentage rollouts, and instant rollback without code changes.

### 4.2 Module Manifest Interface

Every module MUST have a `manifest.ts` file with this structure:

```typescript
// packages/modules/[module-name]/manifest.ts

import { ModuleManifest } from '@jeniferai/core/module-registry';

export const manifest: ModuleManifest = {
  // Unique identifier (kebab-case)
  id: 'scheduling',
  
  // Display name
  name: 'Scheduling',
  
  // Description
  description: 'Calendar management, meeting scheduling, and route planning',
  
  // Semantic version
  version: '1.0.0',
  
  // Required subscription tier: 'core' | 'pro' | 'enterprise'
  tier: 'core',
  
  // Other modules this depends on (by id)
  dependencies: [],
  
  // Navigation configuration
  navigation: {
    icon: 'Calendar',           // Lucide icon name
    label: 'Scheduling',        // Sidebar label
    path: '/scheduling',        // Base route path
    order: 20,                  // Position in sidebar (lower = higher)
    children: [                 // Submenu items
      {
        label: 'Calendar',
        path: '/scheduling/calendar',
        icon: 'CalendarDays'
      },
      {
        label: 'Meeting Log',
        path: '/scheduling/meeting-log',
        icon: 'ListTodo'
      },
      {
        label: 'Route Planner',
        path: '/scheduling/route-planner',
        icon: 'MapPin'
      }
    ]
  },
  
  // Database migrations for this module
  migrations: [
    '001_meetings.sql'
  ],
  
  // Required permissions
  permissions: [
    'scheduling:read',
    'scheduling:write',
    'scheduling:delete'
  ],
  
  // Event configuration
  events: {
    publishes: [
      'meeting.created',
      'meeting.updated',
      'meeting.deleted',
      'meeting.reminder'
    ],
    subscribes: [
      'task.created',          // Create follow-up meeting from task
      'contact.updated'        // Update meeting attendee info
    ]
  }
};
```

### 4.3 Module Registry

The Module Registry is responsible for:
1. Loading all module manifests
2. Validating dependencies
3. Building navigation from manifests
4. Checking feature flag status per tenant

```typescript
// packages/core/module-registry/src/registry.ts

import { ModuleManifest, RegisteredModule } from './types';

class ModuleRegistry {
  private modules: Map<string, RegisteredModule> = new Map();
  
  register(manifest: ModuleManifest): void {
    // Validate manifest
    this.validateManifest(manifest);
    
    // Check dependencies
    this.checkDependencies(manifest);
    
    // Register module
    this.modules.set(manifest.id, {
      manifest,
      enabled: true,
      loadedAt: new Date()
    });
  }
  
  getEnabledModules(orgId: string, tier: string): ModuleManifest[] {
    // Filter modules by tier and feature flags
    return Array.from(this.modules.values())
      .filter(m => this.isModuleEnabled(m, orgId, tier))
      .map(m => m.manifest)
      .sort((a, b) => a.navigation.order - b.navigation.order);
  }
  
  buildNavigation(orgId: string, tier: string): NavigationItem[] {
    const enabledModules = this.getEnabledModules(orgId, tier);
    return enabledModules.map(m => ({
      icon: m.navigation.icon,
      label: m.navigation.label,
      path: m.navigation.path,
      children: m.navigation.children
    }));
  }
}

export const moduleRegistry = new ModuleRegistry();
```

### 4.4 Feature Flag System

```typescript
// packages/core/feature-flags/src/service.ts

interface FeatureFlag {
  id: string;                    // Matches module id
  enabled: boolean;              // Global on/off
  tier_required: 'core' | 'pro' | 'enterprise';
  rollout_percentage: number;    // 0-100 for gradual rollout
  org_whitelist: string[];       // Specific orgs with access
  org_blacklist: string[];       // Specific orgs excluded
}

class FeatureFlagService {
  async isEnabled(flagId: string, orgId: string): Promise<boolean> {
    const flag = await this.getFlag(flagId);
    if (!flag) return false;
    
    // Step 1: Check global enabled
    if (!flag.enabled) return false;
    
    // Step 2: Check blacklist
    if (flag.org_blacklist.includes(orgId)) return false;
    
    // Step 3: Check whitelist
    if (flag.org_whitelist.includes(orgId)) return true;
    
    // Step 4: Check tier
    const org = await this.getOrganization(orgId);
    if (!this.tierMeetsRequirement(org.tier, flag.tier_required)) {
      return false;
    }
    
    // Step 5: Check rollout percentage
    return this.isInRollout(orgId, flag.rollout_percentage);
  }
  
  private isInRollout(orgId: string, percentage: number): boolean {
    // Deterministic hash ensures consistent results
    const hash = this.hashString(orgId);
    return (hash % 100) < percentage;
  }
}
```

### 4.5 Event Bus

```typescript
// packages/core/event-bus/src/bus.ts

interface DomainEvent<T = unknown> {
  type: string;           // e.g., 'task.created'
  payload: T;             // Event-specific data
  metadata: {
    timestamp: string;    // ISO timestamp
    source: string;       // Source module id
    orgId: string;        // Tenant context
    userId: string;       // Actor context
    correlationId: string; // Request tracing
  };
}

class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();
  
  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.push(handler);
    this.subscribers.set(eventType, handlers);
  }
  
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.subscribers.get(event.type) || [];
    
    // Execute all handlers (non-blocking)
    await Promise.allSettled(
      handlers.map(handler => handler(event))
    );
    
    // Also persist to event log for auditing
    await this.persistEvent(event);
  }
}

export const eventBus = new EventBus();
```

---

## 5. Core Infrastructure

### 5.1 Multi-Tenancy Model

JeniferAI uses **organization-based multi-tenancy** where each company is a separate tenant with complete data isolation via PostgreSQL Row Level Security (RLS).

```
Organization (Tenant)
├── Users (Admin, EA)
├── Executive Profiles
├── Feature Flags (per-org overrides)
├── Subscription (tier determines features)
└── All module data is scoped to org_id
```

### 5.2 User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Organization owner/manager | Full access, billing, user management, settings |
| `user` | Executive Assistant (EA) | Access to assigned executives, enabled features |

### 5.3 Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| `trial` | $1/14 days | All core features, credit card required |
| `starter` | $49/month/exec | Core modules only |
| `pro` | $99/month/exec | Core + Pro modules |
| `enterprise` | $199/month/exec | All modules + custom integrations |

### 5.4 Module Tier Mapping

| Module | Tier Required |
|--------|---------------|
| Dashboard | core |
| Scheduling | core |
| Task Hub | core |
| Key Dates | core |
| Reporting | core |
| Team Management | core |
| Events Hub | pro |
| Contacts | pro |
| Concierge Services | pro |
| EA Network | enterprise |

---

## 6. Authentication System

### 6.1 Auth Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      ENTRY POINT                            │
│                      /login                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Options                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Google OAuth   │  │ Microsoft OAuth │  │Email/Pass   │ │
│  │  Sign In        │  │ Sign In         │  │Sign In      │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
└───────────┼─────────────────────┼─────────────────┼────────┘
            │                     │                 │
            └──────────┬──────────┴─────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SMS MFA Verification                      │
│                    (if enabled)                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Routing Decision                          │
│   ┌──────────────────────┐   ┌───────────────────────────┐ │
│   │ New User?            │   │ Existing User?            │ │
│   │ → /onboarding        │   │ → /dashboard              │ │
│   └──────────────────────┘   └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Auth Pages Structure

#### Login Page (`/login`)

```typescript
// app/(auth)/login/page.tsx

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <JeniferLogo className="h-12 w-auto" />
        </div>
        
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        
        {/* OAuth Buttons */}
        <OAuthButtons />
        
        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>
        
        {/* Email/Password Form */}
        <LoginForm />
        
        {/* Links */}
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        
        <div className="text-center text-sm">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
```

#### Signup Page (`/signup`)

```typescript
// app/(auth)/signup/page.tsx

export default function SignupPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <JeniferLogo className="h-12 w-auto" />
        </div>
        
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground">
            Start your 14-day trial for just $1
          </p>
        </div>
        
        {/* OAuth Buttons */}
        <OAuthButtons mode="signup" />
        
        {/* Divider */}
        <Divider text="Or sign up with email" />
        
        {/* Signup Form */}
        <SignupForm />
        
        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
        
        {/* Login Link */}
        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
```

### 6.3 OAuth Configuration

```typescript
// lib/supabase/auth.ts

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      scopes: 'email profile https://www.googleapis.com/auth/calendar'
    }
  });
  return { data, error };
};

export const signInWithMicrosoft = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      scopes: 'email profile openid offline_access https://graph.microsoft.com/Calendars.ReadWrite'
    }
  });
  return { data, error };
};
```

### 6.4 Auth Middleware

```typescript
// middleware.ts

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/signup');
  const isOnboardingPage = req.nextUrl.pathname.startsWith('/onboarding');
  const isProtectedPage = req.nextUrl.pathname.startsWith('/dashboard') ||
                          req.nextUrl.pathname.startsWith('/scheduling') ||
                          req.nextUrl.pathname.startsWith('/tasks');
  
  // Not logged in trying to access protected pages
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Logged in trying to access auth pages
  if (session && isAuthPage) {
    // Check if onboarding is complete
    const { data: user } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single();
    
    if (!user?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
    
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Completed onboarding trying to access onboarding
  if (session && isOnboardingPage) {
    const { data: user } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single();
    
    if (user?.onboarding_completed) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
```

---

## 7. Onboarding Flow

### 7.1 Onboarding Steps

The onboarding wizard collects essential information before users can access the dashboard.

```
Step 1: Welcome
    ↓
Step 2: Company Information
    ↓
Step 3: Your Role
    ↓
Step 4: Executive Profiles
    ↓
Step 5: Integrations
    ↓
Step 6: Setup Animation → Dashboard
```

### 7.2 Onboarding Questions by Step

#### Step 1: Welcome
- Display welcome message
- Brief overview of what JeniferAI does
- "Let's get you set up" CTA

#### Step 2: Company Information
```typescript
interface CompanyStepData {
  companyName: string;           // Required
  companySize: 
    | '1-10' 
    | '11-50' 
    | '51-200' 
    | '201-500' 
    | '500+';                    // Required, select
  industry: 
    | 'Technology'
    | 'Finance'
    | 'Healthcare'
    | 'Legal'
    | 'Real Estate'
    | 'Manufacturing'
    | 'Consulting'
    | 'Non-Profit'
    | 'Government'
    | 'Other';                   // Required, select
  companyWebsite?: string;       // Optional
}
```

#### Step 3: Your Role
```typescript
interface RoleStepData {
  fullName: string;              // Required
  jobTitle: string;              // Required
  role: 
    | 'executive_assistant'
    | 'chief_of_staff'
    | 'office_manager'
    | 'executive'
    | 'other';                   // Required, select
  phoneNumber: string;           // Required (for MFA)
  timezone: string;              // Required, auto-detected with override
}
```

#### Step 4: Executive Profiles
```typescript
// Allow adding 1+ executives they support
interface ExecutiveStepData {
  executives: Array<{
    fullName: string;            // Required
    title: string;               // Required
    email?: string;              // Optional
    phone?: string;              // Optional
  }>;
}

// Minimum 1 executive required
// Can add more later
```

#### Step 5: Integrations
```typescript
interface IntegrationsStepData {
  googleCalendar: boolean;       // Connect button
  outlookCalendar: boolean;      // Connect button
  gmail: boolean;                // Connect button
  outlook: boolean;              // Connect button
  // Show "Connect" or "Connected ✓" status
  // Can skip this step
}
```

#### Step 6: Setup Complete
- Show animated loader with steps:
  1. "Creating your workspace..."
  2. "Setting up your executive profiles..."
  3. "Configuring your dashboard..."
  4. "Almost there..."
- After animation (3-4 seconds), redirect to `/dashboard`

### 7.3 Onboarding Wizard Component

```typescript
// components/onboarding/OnboardingWizard.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { WelcomeStep } from './steps/WelcomeStep';
import { CompanyStep } from './steps/CompanyStep';
import { RoleStep } from './steps/RoleStep';
import { ExecutivesStep } from './steps/ExecutivesStep';
import { IntegrationsStep } from './steps/IntegrationsStep';
import { SetupAnimation } from './SetupAnimation';

const STEPS = [
  { id: 'welcome', title: 'Welcome', component: WelcomeStep },
  { id: 'company', title: 'Company', component: CompanyStep },
  { id: 'role', title: 'Your Role', component: RoleStep },
  { id: 'executives', title: 'Executives', component: ExecutivesStep },
  { id: 'integrations', title: 'Integrations', component: IntegrationsStep },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    company: {},
    role: {},
    executives: [],
    integrations: {}
  });
  
  const handleNext = (stepData: any) => {
    setFormData(prev => ({
      ...prev,
      [STEPS[currentStep].id]: stepData
    }));
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleComplete = async () => {
    setIsComplete(true);
    
    // Save onboarding data
    await saveOnboardingData(formData);
    
    // Wait for animation
    setTimeout(() => {
      router.push('/dashboard');
    }, 4000);
  };
  
  if (isComplete) {
    return <SetupAnimation />;
  }
  
  const CurrentStepComponent = STEPS[currentStep].component;
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      
      {/* Step Indicator */}
      <div className="flex justify-center py-8">
        <div className="flex items-center space-x-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "w-2 h-2 rounded-full",
                index <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentStepComponent
                data={formData[STEPS[currentStep].id]}
                onNext={handleNext}
                onBack={handleBack}
                isFirstStep={currentStep === 0}
                isLastStep={currentStep === STEPS.length - 1}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
```

### 7.4 Setup Animation Component

```typescript
// components/onboarding/SetupAnimation.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';

const SETUP_STEPS = [
  { message: 'Creating your workspace...', duration: 1000 },
  { message: 'Setting up executive profiles...', duration: 1000 },
  { message: 'Configuring your dashboard...', duration: 1000 },
  { message: 'Almost there...', duration: 1000 },
];

export function SetupAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < SETUP_STEPS.length - 1) {
          setCompletedSteps(completed => [...completed, prev]);
          return prev + 1;
        }
        return prev;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-12"
      >
        <JeniferLogo className="h-16 w-auto" />
      </motion.div>
      
      {/* Progress Steps */}
      <div className="space-y-4 w-80">
        {SETUP_STEPS.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: index <= currentStep ? 1 : 0.3,
              y: 0 
            }}
            className="flex items-center space-x-3"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {completedSteps.includes(index) ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="h-5 w-5 text-primary" />
                </motion.div>
              ) : index === currentStep ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted" />
              )}
            </div>
            <span className={cn(
              "text-sm",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.message}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Dashboard Layout & Navigation

### 8.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TOP NAVIGATION                              │
│  ┌─────────┐                                    ┌─────────────────────┐ │
│  │ Logo    │     [Search Bar]                   │ Notifications │ User │ │
│  └─────────┘                                    └─────────────────────┘ │
├──────────────────┬──────────────────────────────────────────────────────┤
│                  │                                                       │
│                  │                                                       │
│     SIDEBAR      │                    MAIN CONTENT                       │
│                  │                                                       │
│   ┌───────────┐  │                                                       │
│   │ Dashboard │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Scheduling│  │                                                       │
│   │  └ Cal    │  │                                                       │
│   │  └ Log    │  │                                                       │
│   │  └ Route  │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Task Hub  │  │                                                       │
│   │  └ To-Do  │  │                                                       │
│   │  └ Approv │  │                                                       │
│   │  └ Deleg  │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Key Dates │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Reports   │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Team      │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Events    │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Contacts  │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Concierge │  │                                                       │
│   ├───────────┤  │                                                       │
│   │ Settings  │  │                                                       │
│   └───────────┘  │                                                       │
│                  │                                                       │
│  ┌────────────┐  │                                                       │
│  │ Exec Status│  │                                                       │
│  │   ● Online │  │                                                       │
│  └────────────┘  │                                                       │
│                  │                                                       │
└──────────────────┴──────────────────────────────────────────────────────┘
```

### 8.2 Sidebar Navigation Structure

```typescript
// Complete sidebar navigation configuration

export const sidebarNavigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    tier: 'core',
    children: null
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: 'Calendar',
    path: '/scheduling',
    tier: 'core',
    children: [
      {
        label: 'Calendar',
        icon: 'CalendarDays',
        path: '/scheduling/calendar'
      },
      {
        label: 'Meeting Log',
        icon: 'ClipboardList',
        path: '/scheduling/meeting-log'
      },
      {
        label: 'Route Planner',
        icon: 'MapPin',
        path: '/scheduling/route-planner'
      }
    ]
  },
  {
    id: 'tasks',
    label: 'Task Hub',
    icon: 'CheckSquare',
    path: '/tasks',
    tier: 'core',
    children: [
      {
        label: 'To-Do',
        icon: 'ListTodo',
        path: '/tasks/todo'
      },
      {
        label: 'Approvals',
        icon: 'FileCheck',
        path: '/tasks/approvals'
      },
      {
        label: 'Delegations',
        icon: 'Users',
        path: '/tasks/delegations'
      }
    ]
  },
  {
    id: 'key-dates',
    label: 'Key Dates',
    icon: 'CalendarHeart',
    path: '/key-dates',
    tier: 'core',
    children: null
  },
  {
    id: 'reports',
    label: 'Reporting',
    icon: 'BarChart3',
    path: '/reports',
    tier: 'core',
    children: [
      {
        label: 'Calendar Insights',
        icon: 'CalendarRange',
        path: '/reports/calendar-insights'
      },
      {
        label: 'Inbox Insights',
        icon: 'Mail',
        path: '/reports/inbox-insights'
      },
      {
        label: 'Throughput',
        icon: 'TrendingUp',
        path: '/reports/throughput'
      }
    ]
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'UserCircle',
    path: '/team',
    tier: 'core',
    children: [
      {
        label: 'Executives',
        icon: 'Briefcase',
        path: '/team/executives'
      }
    ]
  },
  {
    id: 'events',
    label: 'Events Hub',
    icon: 'Sparkles',
    path: '/events',
    tier: 'pro',  // Pro feature
    badge: 'PRO',
    children: null
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'Contact',
    path: '/contacts',
    tier: 'pro',  // Pro feature
    children: null
  },
  {
    id: 'concierge',
    label: 'Concierge',
    icon: 'Concierge',
    path: '/concierge',
    tier: 'pro',  // Pro feature
    children: null
  },
  // Settings is always at the bottom
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    path: '/settings',
    tier: 'core',
    position: 'bottom',  // Always at bottom of sidebar
    children: [
      {
        label: 'My Profile',
        icon: 'User',
        path: '/settings/profile'
      },
      {
        label: 'Organization',
        icon: 'Building2',
        path: '/settings/organization'
      },
      {
        label: 'Integrations',
        icon: 'Plug',
        path: '/settings/integrations'
      },
      {
        label: 'Team Members',
        icon: 'Users',
        path: '/settings/team'
      },
      {
        label: 'Billing',
        icon: 'CreditCard',
        path: '/settings/billing'
      },
      {
        label: 'Audit Log',
        icon: 'ScrollText',
        path: '/settings/audit-log'
      }
    ]
  }
];
```

### 8.3 Sidebar Component

```typescript
// components/layouts/Sidebar.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';

import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@jeniferai/core/feature-flags';
import { ExecutiveStatusIndicator } from './ExecutiveStatusIndicator';
import { sidebarNavigation } from '@/config/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const { isEnabled } = useFeatureFlags();
  const [expandedItems, setExpandedItems] = useState<string[]>(['scheduling', 'tasks']);
  
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };
  
  // Filter navigation based on feature flags/tier
  const filteredNav = sidebarNavigation.filter(item => 
    isEnabled(item.id)
  );
  
  // Separate main nav and bottom nav (settings)
  const mainNav = filteredNav.filter(item => item.position !== 'bottom');
  const bottomNav = filteredNav.filter(item => item.position === 'bottom');
  
  return (
    <aside className="w-64 h-screen bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <JeniferLogo className="h-8 w-auto" />
          <span className="font-semibold text-lg">JeniferAI</span>
        </Link>
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {mainNav.map(item => (
            <NavItem
              key={item.id}
              item={item}
              pathname={pathname}
              isExpanded={expandedItems.includes(item.id)}
              onToggle={() => toggleExpanded(item.id)}
            />
          ))}
        </ul>
      </nav>
      
      {/* Executive Status Indicator */}
      <div className="px-4 py-3 border-t">
        <ExecutiveStatusIndicator />
      </div>
      
      {/* Bottom Navigation (Settings) */}
      <div className="border-t py-4 px-3">
        <ul className="space-y-1">
          {bottomNav.map(item => (
            <NavItem
              key={item.id}
              item={item}
              pathname={pathname}
              isExpanded={expandedItems.includes(item.id)}
              onToggle={() => toggleExpanded(item.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function NavItem({ item, pathname, isExpanded, onToggle }) {
  const Icon = Icons[item.icon];
  const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
  const hasChildren = item.children && item.children.length > 0;
  
  return (
    <li>
      {hasChildren ? (
        <>
          <button
            onClick={onToggle}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm",
              "hover:bg-accent transition-colors",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <div className="flex items-center space-x-3">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                  {item.badge}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-4 mt-1 space-y-1 overflow-hidden"
              >
                {item.children.map(child => {
                  const ChildIcon = Icons[child.icon];
                  const isChildActive = pathname === child.path;
                  
                  return (
                    <li key={child.path}>
                      <Link
                        href={child.path}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2 rounded-md text-sm",
                          "hover:bg-accent transition-colors",
                          isChildActive && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      ) : (
        <Link
          href={item.path}
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm",
            "hover:bg-accent transition-colors",
            isActive && "bg-accent text-accent-foreground font-medium"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
          {item.badge && (
            <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
              {item.badge}
            </span>
          )}
        </Link>
      )}
    </li>
  );
}
```

### 8.4 Top Navigation Component

```typescript
// components/layouts/TopNav.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Search, Menu, ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@jeniferai/ui';
import { Avatar, AvatarFallback, AvatarImage } from '@jeniferai/ui';
import { Button } from '@jeniferai/ui';
import { Input } from '@jeniferai/ui';
import { useUser } from '@/hooks/useUser';
import { useOrganization } from '@/hooks/useOrganization';
import { NotificationPopover } from './NotificationPopover';
import { ExecutiveSwitcher } from './ExecutiveSwitcher';

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, signOut } = useUser();
  const { organization } = useOrganization();
  const [searchOpen, setSearchOpen] = useState(false);
  
  return (
    <header className="h-16 border-b bg-card px-4 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Executive Switcher (if managing multiple executives) */}
        <ExecutiveSwitcher />
      </div>
      
      {/* Center Section - Search */}
      <div className="hidden md:flex flex-1 max-w-xl mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tasks, meetings, contacts..."
            className="pl-10 w-full"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
        
        {/* Notifications */}
        <NotificationPopover />
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>
                  {user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {organization?.name}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/organization">Organization</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/billing">Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => signOut()}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

### 8.5 Executive Status Indicator

The dynamic status indicator shows the executive's current status based on calendar activity.

```typescript
// components/layouts/ExecutiveStatusIndicator.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSelectedExecutive } from '@/hooks/useSelectedExecutive';
import { useCalendarStatus } from '@/hooks/useCalendarStatus';

const STATUS_CONFIG = {
  available: {
    color: 'bg-green-500',
    pulseColor: 'bg-green-400',
    label: 'Available',
    description: 'No meetings scheduled'
  },
  in_meeting: {
    color: 'bg-orange-500',
    pulseColor: 'bg-orange-400',
    label: 'In Meeting',
    description: null  // Will show meeting title
  },
  driving: {
    color: 'bg-blue-500',
    pulseColor: 'bg-blue-400',
    label: 'Driving',
    description: null  // Will show destination
  },
  on_flight: {
    color: 'bg-purple-500',
    pulseColor: 'bg-purple-400',
    label: 'On Flight',
    description: null  // Will show flight info
  },
  do_not_disturb: {
    color: 'bg-red-500',
    pulseColor: 'bg-red-400',
    label: 'Do Not Disturb',
    description: 'Focus time'
  },
  offline: {
    color: 'bg-gray-400',
    pulseColor: 'bg-gray-300',
    label: 'Offline',
    description: 'Outside working hours'
  }
};

export function ExecutiveStatusIndicator() {
  const { executive } = useSelectedExecutive();
  const { status, currentEvent } = useCalendarStatus(executive?.id);
  
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.available;
  
  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
      {/* Status Dot with Pulse */}
      <div className="relative">
        <motion.div
          className={cn("w-3 h-3 rounded-full", config.color)}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className={cn(
          "absolute inset-0 rounded-full opacity-30",
          config.pulseColor,
          "animate-ping"
        )} />
      </div>
      
      {/* Status Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {executive?.full_name || 'No executive selected'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {config.label}
          {currentEvent && ` • ${currentEvent.title}`}
        </p>
      </div>
    </div>
  );
}
```

### 8.6 Dashboard Layout Component

```typescript
// components/layouts/DashboardLayout.tsx

'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <Sidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav 
        open={mobileNavOpen} 
        onClose={() => setMobileNavOpen(false)} 
      />
      
      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Navigation */}
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 9. Feature Modules Specification

### 9.1 Dashboard Module

**Path:** `/dashboard`
**Tier:** Core

#### Page Structure
```typescript
// Dashboard page layout
<DashboardPage>
  {/* Header */}
  <PageHeader>
    <Title>Good morning, {userName}</Title>
    <Subtitle>{formattedDate}</Subtitle>
  </PageHeader>
  
  {/* Quick Actions Row */}
  <QuickActionsBar>
    <QuickAction icon="Plus" label="New Task" />
    <QuickAction icon="Calendar" label="Schedule Meeting" />
    <QuickAction icon="Mail" label="Send Brief" />
    <QuickAction icon="FileText" label="Create Note" />
  </QuickActionsBar>
  
  {/* Main Grid */}
  <Grid cols={3}>
    {/* Left Column - 2 cols wide */}
    <GridItem colSpan={2}>
      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <Button variant="ghost" size="sm">View Calendar</Button>
        </CardHeader>
        <CardContent>
          <TodayTimeline events={todayEvents} />
        </CardContent>
      </Card>
      
      {/* Priority Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Tasks</CardTitle>
          <Badge>{taskCount} tasks</Badge>
        </CardHeader>
        <CardContent>
          <TaskList tasks={priorityTasks} limit={5} />
        </CardContent>
      </Card>
    </GridItem>
    
    {/* Right Column */}
    <GridItem>
      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <Badge variant="destructive">{approvalCount}</Badge>
        </CardHeader>
        <CardContent>
          <ApprovalList approvals={pendingApprovals} />
        </CardContent>
      </Card>
      
      {/* Upcoming Key Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Up</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyDatesList dates={upcomingDates} limit={5} />
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={recentActivity} />
        </CardContent>
      </Card>
    </GridItem>
  </Grid>
</DashboardPage>
```

### 9.2 Scheduling Module

**Path:** `/scheduling/*`
**Tier:** Core

#### Calendar Page (`/scheduling/calendar`)
```typescript
<CalendarPage>
  <PageHeader>
    <Title>Calendar</Title>
    <div className="flex items-center space-x-2">
      <CalendarViewSwitcher value={view} onChange={setView} />
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Meeting
      </Button>
    </div>
  </PageHeader>
  
  <div className="flex gap-6">
    {/* Sidebar */}
    <div className="w-64 space-y-4">
      <MiniCalendar 
        value={selectedDate} 
        onChange={setSelectedDate} 
      />
      <ConnectedCalendars />
      <CalendarFilters />
    </div>
    
    {/* Main Calendar */}
    <div className="flex-1">
      <CalendarView
        view={view}  // 'day' | 'week' | 'month'
        date={selectedDate}
        events={events}
        onEventClick={handleEventClick}
        onSlotSelect={handleSlotSelect}
      />
    </div>
  </div>
  
  {/* Meeting Dialog */}
  <MeetingFormDialog
    open={dialogOpen}
    onClose={() => setDialogOpen(false)}
    event={selectedEvent}
  />
</CalendarPage>
```

#### Meeting Log Page (`/scheduling/meeting-log`)
```typescript
<MeetingLogPage>
  <PageHeader>
    <Title>Meeting Log</Title>
    <div className="flex items-center space-x-2">
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      <Input placeholder="Search meetings..." />
    </div>
  </PageHeader>
  
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
      <TabsTrigger value="past">Past</TabsTrigger>
      <TabsTrigger value="all">All</TabsTrigger>
    </TabsList>
    
    <TabsContent value={tab}>
      <MeetingTable
        meetings={meetings}
        columns={['title', 'date', 'attendees', 'location', 'status']}
        onRowClick={handleMeetingClick}
      />
    </TabsContent>
  </Tabs>
</MeetingLogPage>
```

#### Route Planner Page (`/scheduling/route-planner`)
```typescript
<RoutePlannerPage>
  <PageHeader>
    <Title>Route Planner</Title>
    <DatePicker value={date} onChange={setDate} />
  </PageHeader>
  
  <div className="grid grid-cols-2 gap-6">
    {/* Left - Meeting List */}
    <Card>
      <CardHeader>
        <CardTitle>Today's Out-of-Office Meetings</CardTitle>
      </CardHeader>
      <CardContent>
        <MeetingRouteList
          meetings={outOfOfficeMeetings}
          onReorder={handleReorder}
        />
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Total Drive Time:</span>
            <span className="font-medium">{totalDriveTime}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Distance:</span>
            <span className="font-medium">{totalDistance}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Right - Map */}
    <Card>
      <CardContent className="p-0">
        <RouteMap
          meetings={outOfOfficeMeetings}
          homeAddress={executive.homeAddress}
          officeAddress={executive.officeAddress}
        />
      </CardContent>
    </Card>
  </div>
  
  <Button onClick={handleSaveRoute}>
    Save Route & Block Calendar
  </Button>
</RoutePlannerPage>
```

### 9.3 Task Hub Module

**Path:** `/tasks/*`
**Tier:** Core

#### To-Do Page (`/tasks/todo`)
```typescript
<TodoPage>
  <PageHeader>
    <Title>To-Do</Title>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Task
    </Button>
  </PageHeader>
  
  {/* Filters */}
  <div className="flex items-center space-x-4 mb-6">
    <Input placeholder="Search tasks..." className="w-64" />
    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
      <SelectTrigger>Priority</SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
      <SelectTrigger>Category</SelectTrigger>
      <SelectContent>
        {categories.map(cat => (
          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  
  {/* Task List */}
  <div className="space-y-2">
    {tasks.map(task => (
      <TaskCard
        key={task.id}
        task={task}
        onComplete={handleComplete}
        onClick={() => setSelectedTask(task)}
      />
    ))}
  </div>
  
  {/* Task Detail Sheet */}
  <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
    <SheetContent>
      <TaskDetailForm task={selectedTask} />
    </SheetContent>
  </Sheet>
</TodoPage>
```

#### Approvals Page (`/tasks/approvals`)
```typescript
<ApprovalsPage>
  <PageHeader>
    <Title>Approvals</Title>
    <Badge variant="destructive">{pendingCount} pending</Badge>
  </PageHeader>
  
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="pending">
        Pending
        <Badge className="ml-2">{pendingCount}</Badge>
      </TabsTrigger>
      <TabsTrigger value="approved">Approved</TabsTrigger>
      <TabsTrigger value="rejected">Rejected</TabsTrigger>
      <TabsTrigger value="all">All</TabsTrigger>
    </TabsList>
    
    <TabsContent value={tab}>
      <div className="space-y-4">
        {approvals.map(approval => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={() => handleApprove(approval.id)}
            onReject={() => handleReject(approval.id)}
            onRequestInfo={() => handleRequestInfo(approval.id)}
          />
        ))}
      </div>
    </TabsContent>
  </Tabs>
</ApprovalsPage>
```

#### Delegations Page (`/tasks/delegations`)
```typescript
<DelegationsPage>
  <PageHeader>
    <Title>Delegations</Title>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      New Delegation
    </Button>
  </PageHeader>
  
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="to-me">Delegated to Me</TabsTrigger>
      <TabsTrigger value="from-me">Delegated by Me</TabsTrigger>
      <TabsTrigger value="all">All</TabsTrigger>
    </TabsList>
    
    <TabsContent value={tab}>
      <DelegationTable
        delegations={delegations}
        columns={['task', 'from', 'to', 'due_date', 'status']}
      />
    </TabsContent>
  </Tabs>
</DelegationsPage>
```

### 9.4 Key Dates Module

**Path:** `/key-dates`
**Tier:** Core

```typescript
<KeyDatesPage>
  <PageHeader>
    <Title>Key Dates</Title>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Date
    </Button>
  </PageHeader>
  
  {/* Category Tabs */}
  <Tabs value={category} onValueChange={setCategory}>
    <TabsList className="flex-wrap">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="birthdays">🎂 Birthdays</TabsTrigger>
      <TabsTrigger value="anniversaries">💍 Anniversaries</TabsTrigger>
      <TabsTrigger value="deadlines">⏰ Deadlines</TabsTrigger>
      <TabsTrigger value="milestones">🎯 Milestones</TabsTrigger>
      <TabsTrigger value="travel">✈️ Travel</TabsTrigger>
      <TabsTrigger value="financial">💰 Financial</TabsTrigger>
      <TabsTrigger value="team">👥 Team</TabsTrigger>
      <TabsTrigger value="personal">🏠 Personal</TabsTrigger>
      <TabsTrigger value="vip">⭐ VIP/Client</TabsTrigger>
      <TabsTrigger value="expirations">📋 Expirations</TabsTrigger>
      <TabsTrigger value="holidays">🎉 Holidays</TabsTrigger>
      <TabsTrigger value="other">📌 Other</TabsTrigger>
    </TabsList>
  </Tabs>
  
  {/* View Toggle */}
  <div className="flex justify-end mb-4">
    <ToggleGroup type="single" value={view} onValueChange={setView}>
      <ToggleGroupItem value="list">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="calendar">
        <Calendar className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
  
  {/* Content */}
  {view === 'list' ? (
    <KeyDatesList dates={filteredDates} />
  ) : (
    <KeyDatesCalendar dates={filteredDates} />
  )}
  
  {/* Add/Edit Dialog */}
  <KeyDateFormDialog
    open={dialogOpen}
    onClose={() => setDialogOpen(false)}
    date={selectedDate}
  />
</KeyDatesPage>
```

### 9.5 Reporting Module

**Path:** `/reports/*`
**Tier:** Core

#### Calendar Insights (`/reports/calendar-insights`)
```typescript
<CalendarInsightsPage>
  <PageHeader>
    <Title>Calendar Insights</Title>
    <DateRangePicker value={dateRange} onChange={setDateRange} />
  </PageHeader>
  
  {/* Key Metrics */}
  <div className="grid grid-cols-4 gap-4 mb-6">
    <MetricCard
      title="Avg Meetings/Week"
      value={metrics.avgMeetingsPerWeek}
      trend={metrics.trend}
      icon={Calendar}
    />
    <MetricCard
      title="Internal vs External"
      value={`${metrics.internalRatio}%`}
      description="Internal meetings"
      icon={Users}
    />
    <MetricCard
      title="Time in Meetings"
      value={`${metrics.meetingDensity}%`}
      description="Of work hours"
      icon={Clock}
    />
    <MetricCard
      title="Drive Time/Week"
      value={metrics.driveTimePerWeek}
      icon={Car}
    />
  </div>
  
  {/* Charts */}
  <div className="grid grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Meeting Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <MeetingDistributionChart data={meetingData} />
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Peak Meeting Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <HeatmapChart data={hourlyData} />
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Top Meeting Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <ContactRankingList contacts={topContacts} />
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Department Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <DepartmentPieChart data={departmentData} />
      </CardContent>
    </Card>
  </div>
</CalendarInsightsPage>
```

### 9.6 Team Module

**Path:** `/team/*`
**Tier:** Core

#### Executive Profile Page (`/team/executives/[id]`)
```typescript
<ExecutiveProfilePage>
  <PageHeader>
    <div className="flex items-center space-x-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={executive.avatar_url} />
        <AvatarFallback>{executive.initials}</AvatarFallback>
      </Avatar>
      <div>
        <Title>{executive.full_name}</Title>
        <p className="text-muted-foreground">{executive.title}</p>
      </div>
    </div>
    <Button variant="outline">Edit Profile</Button>
  </PageHeader>
  
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="direct-reports">Direct Reports</TabsTrigger>
      <TabsTrigger value="family">Family</TabsTrigger>
      <TabsTrigger value="memberships">Memberships</TabsTrigger>
    </TabsList>
    
    {/* Overview Tab */}
    <TabsContent value="overview">
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoList>
              <InfoItem label="Email" value={executive.email} />
              <InfoItem label="Phone" value={executive.phone} />
              <InfoItem label="Office" value={executive.office_location} />
              <InfoItem label="Timezone" value={executive.timezone} />
            </InfoList>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <PreferenceSections>
              <PreferenceSection title="Scheduling" data={executive.scheduling_preferences} />
              <PreferenceSection title="Dietary" data={executive.dietary_preferences} />
              <PreferenceSection title="Travel" data={executive.travel_preferences} />
              <PreferenceSection title="Dining" data={executive.dining_preferences} />
            </PreferenceSections>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Fleet</CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleList vehicles={executive.fleet_info} />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
    
    {/* Direct Reports Tab */}
    <TabsContent value="direct-reports">
      <DirectReportsList 
        reports={directReports} 
        onAdd={() => setShowAddReport(true)}
      />
    </TabsContent>
    
    {/* Family Tab */}
    <TabsContent value="family">
      <FamilyDirectory 
        members={familyMembers}
        onAdd={() => setShowAddFamily(true)}
      />
    </TabsContent>
    
    {/* Memberships Tab */}
    <TabsContent value="memberships">
      <MembershipsList
        memberships={memberships}
        categories={['Airlines', 'Hotels', 'Lounges', 'Travel Programs', 'Other']}
        onAdd={() => setShowAddMembership(true)}
      />
    </TabsContent>
  </Tabs>
</ExecutiveProfilePage>
```

### 9.7 Settings Module

**Path:** `/settings/*`
**Tier:** Core

#### Settings Layout
```typescript
<SettingsLayout>
  {/* Settings Sidebar */}
  <aside className="w-64">
    <nav className="space-y-1">
      <SettingsNavItem href="/settings/profile" icon={User}>
        My Profile
      </SettingsNavItem>
      <SettingsNavItem href="/settings/organization" icon={Building2}>
        Organization
      </SettingsNavItem>
      <SettingsNavItem href="/settings/integrations" icon={Plug}>
        Integrations
      </SettingsNavItem>
      <SettingsNavItem href="/settings/team" icon={Users}>
        Team Members
      </SettingsNavItem>
      <SettingsNavItem href="/settings/billing" icon={CreditCard}>
        Billing
      </SettingsNavItem>
      <SettingsNavItem href="/settings/audit-log" icon={ScrollText}>
        Audit Log
      </SettingsNavItem>
    </nav>
  </aside>
  
  {/* Settings Content */}
  <main className="flex-1">
    {children}
  </main>
</SettingsLayout>
```

#### Integrations Page (`/settings/integrations`)
```typescript
<IntegrationsPage>
  <PageHeader>
    <Title>Integrations</Title>
    <p className="text-muted-foreground">
      Connect your calendars, email, and other tools
    </p>
  </PageHeader>
  
  {/* Calendar Integrations */}
  <section className="space-y-4">
    <h3 className="text-lg font-medium">Calendars</h3>
    <div className="grid gap-4">
      <IntegrationCard
        name="Google Calendar"
        icon={<GoogleIcon />}
        description="Sync your Google Calendar events"
        connected={integrations.googleCalendar}
        onConnect={connectGoogleCalendar}
        onDisconnect={disconnectGoogleCalendar}
      />
      <IntegrationCard
        name="Outlook Calendar"
        icon={<MicrosoftIcon />}
        description="Sync your Outlook Calendar events"
        connected={integrations.outlookCalendar}
        onConnect={connectOutlookCalendar}
        onDisconnect={disconnectOutlookCalendar}
      />
    </div>
  </section>
  
  {/* Video Conferencing */}
  <section className="space-y-4">
    <h3 className="text-lg font-medium">Video Conferencing</h3>
    <div className="grid gap-4">
      <IntegrationCard
        name="Zoom"
        icon={<ZoomIcon />}
        description="Create Zoom meetings automatically"
        connected={integrations.zoom}
        onConnect={connectZoom}
        onDisconnect={disconnectZoom}
      />
      <IntegrationCard
        name="Microsoft Teams"
        icon={<TeamsIcon />}
        description="Create Teams meetings automatically"
        connected={integrations.teams}
        onConnect={connectTeams}
        onDisconnect={disconnectTeams}
      />
    </div>
  </section>
  
  {/* Communication */}
  <section className="space-y-4">
    <h3 className="text-lg font-medium">Communication</h3>
    <div className="grid gap-4">
      <IntegrationCard
        name="Slack"
        icon={<SlackIcon />}
        description="Receive notifications in Slack"
        connected={integrations.slack}
        onConnect={connectSlack}
        onDisconnect={disconnectSlack}
      />
    </div>
  </section>
</IntegrationsPage>
```

---

## 10. Database Schema

### 10.1 Core Schema

```sql
-- =============================================
-- CORE SCHEMA (Always Present)
-- =============================================

CREATE SCHEMA IF NOT EXISTS core;

-- Organizations (Tenants)
CREATE TABLE core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  industry VARCHAR(100),
  size VARCHAR(50),
  website VARCHAR(255),
  logo_url TEXT,
  subscription_tier VARCHAR(20) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE core.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user', -- 'admin' | 'user'
  job_title VARCHAR(255),
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Executive Profiles
CREATE TABLE core.executive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  email VARCHAR(255),
  phones JSONB DEFAULT '[]',
  main_office_location TEXT,
  home_address TEXT,
  timezone VARCHAR(100),
  avatar_url TEXT,
  
  -- Preferences (JSONB for flexibility)
  scheduling_preferences JSONB DEFAULT '{}',
  dietary_preferences JSONB DEFAULT '{}',
  travel_preferences JSONB DEFAULT '{}',
  dining_preferences JSONB DEFAULT '{}',
  health_info JSONB DEFAULT '{}',
  fleet_info JSONB DEFAULT '[]',
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Executive Assignments
CREATE TABLE core.user_executive_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES core.executive_profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, executive_id)
);

-- Feature Flags
CREATE TABLE core.feature_flags (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  tier_required VARCHAR(20) DEFAULT 'core',
  rollout_percentage INTEGER DEFAULT 100,
  org_whitelist TEXT[] DEFAULT '{}',
  org_blacklist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Feature Flag Overrides
CREATE TABLE core.org_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  flag_id VARCHAR(100) NOT NULL REFERENCES core.feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, flag_id)
);

-- Integrations
CREATE TABLE core.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft', 'zoom', 'slack'
  type VARCHAR(50) NOT NULL, -- 'calendar', 'email', 'video', 'chat'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, type)
);

-- Audit Log
CREATE TABLE core.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.executive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_executive_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY org_isolation ON core.organizations
  USING (id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY org_isolation ON core.users
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY org_isolation ON core.executive_profiles
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY org_isolation ON core.integrations
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY org_isolation ON core.audit_log
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
```

### 10.2 Module Schemas

Each module owns its schema. Here's the Task Hub module as an example:

```sql
-- =============================================
-- TASK HUB MODULE SCHEMA
-- =============================================

CREATE SCHEMA IF NOT EXISTS mod_tasks;

-- Tasks
CREATE TABLE mod_tasks.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES core.executive_profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES core.users(id) ON DELETE SET NULL,
  
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category VARCHAR(100),
  
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Relationships
  related_meeting_id UUID,
  related_email_id VARCHAR(255),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals
CREATE TABLE mod_tasks.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES core.executive_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'expense' | 'travel' | 'document' | 'request' | 'other'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'info_requested'
  
  amount DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  due_date TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  
  -- Multi-layer approval
  approval_chain JSONB DEFAULT '[]', -- [{user_id, status, decided_at}]
  current_approver UUID,
  
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delegations
CREATE TABLE mod_tasks.delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES mod_tasks.tasks(id) ON DELETE CASCADE,
  
  delegated_by UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  delegated_to UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'accepted' | 'completed' | 'rejected'
  notes TEXT,
  
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mod_tasks.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod_tasks.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod_tasks.delegations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY org_isolation ON mod_tasks.tasks
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY org_isolation ON mod_tasks.approvals
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE POLICY org_isolation ON mod_tasks.delegations
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- Indexes
CREATE INDEX idx_tasks_org_id ON mod_tasks.tasks(org_id);
CREATE INDEX idx_tasks_executive_id ON mod_tasks.tasks(executive_id);
CREATE INDEX idx_tasks_status ON mod_tasks.tasks(status);
CREATE INDEX idx_tasks_due_date ON mod_tasks.tasks(due_date);

CREATE INDEX idx_approvals_org_id ON mod_tasks.approvals(org_id);
CREATE INDEX idx_approvals_executive_id ON mod_tasks.approvals(executive_id);
CREATE INDEX idx_approvals_status ON mod_tasks.approvals(status);
```

---

## 11. API Structure

### 11.1 API Route Organization

```
app/api/
├── auth/
│   └── callback/
│       └── route.ts           # OAuth callback handler
├── webhooks/
│   ├── stripe/
│   │   └── route.ts           # Stripe webhook
│   └── supabase/
│       └── route.ts           # Supabase webhook
├── v1/
│   ├── users/
│   │   └── route.ts           # GET /api/v1/users
│   ├── organizations/
│   │   └── route.ts           # GET, PATCH /api/v1/organizations
│   ├── executives/
│   │   ├── route.ts           # GET, POST /api/v1/executives
│   │   └── [id]/
│   │       └── route.ts       # GET, PATCH, DELETE /api/v1/executives/:id
│   ├── tasks/
│   │   ├── route.ts           # GET, POST /api/v1/tasks
│   │   └── [id]/
│   │       └── route.ts       # GET, PATCH, DELETE /api/v1/tasks/:id
│   ├── approvals/
│   │   ├── route.ts           # GET, POST /api/v1/approvals
│   │   └── [id]/
│   │       ├── route.ts       # GET, PATCH /api/v1/approvals/:id
│   │       ├── approve/
│   │       │   └── route.ts   # POST /api/v1/approvals/:id/approve
│   │       └── reject/
│   │           └── route.ts   # POST /api/v1/approvals/:id/reject
│   ├── meetings/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── key-dates/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   └── integrations/
│       ├── google/
│       │   └── route.ts
│       └── microsoft/
│           └── route.ts
```

### 11.2 API Route Example

```typescript
// app/api/v1/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { taskSchema } from '@jeniferai/modules/tasks';
import { eventBus } from '@jeniferai/core/event-bus';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  
  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const executiveId = searchParams.get('executive_id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  // Build query
  let query = supabase
    .from('mod_tasks.tasks')
    .select('*, executive:executive_id(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (executiveId) query = query.eq('executive_id', executiveId);
  
  const { data, error, count } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  
  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Parse and validate body
  const body = await request.json();
  const validation = taskSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    );
  }
  
  // Get user's org_id
  const { data: userData } = await supabase
    .from('core.users')
    .select('org_id')
    .eq('id', user.id)
    .single();
  
  // Insert task
  const { data: task, error } = await supabase
    .from('mod_tasks.tasks')
    .insert({
      ...validation.data,
      org_id: userData.org_id,
      created_by: user.id
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Publish event
  await eventBus.publish({
    type: 'task.created',
    payload: task,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'tasks',
      orgId: userData.org_id,
      userId: user.id,
      correlationId: crypto.randomUUID()
    }
  });
  
  return NextResponse.json({ data: task }, { status: 201 });
}
```

---

## 12. UI Components Library

### 12.1 Component Categories

The UI package (`packages/ui`) exports shadcn/ui components with JeniferAI styling:

```typescript
// packages/ui/src/index.ts

// Layout
export * from './components/card';
export * from './components/separator';
export * from './components/skeleton';
export * from './components/sheet';

// Forms
export * from './components/button';
export * from './components/input';
export * from './components/textarea';
export * from './components/select';
export * from './components/checkbox';
export * from './components/radio-group';
export * from './components/switch';
export * from './components/form';

// Data Display
export * from './components/table';
export * from './components/badge';
export * from './components/avatar';
export * from './components/tooltip';

// Feedback
export * from './components/alert';
export * from './components/toast';
export * from './components/dialog';

// Navigation
export * from './components/tabs';
export * from './components/dropdown-menu';
export * from './components/command';

// Date & Time
export * from './components/calendar';
export * from './components/date-picker';

// Utilities
export * from './lib/utils';
```

### 12.2 Theme Configuration

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/modules/*/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // JeniferAI Brand Colors
        brand: {
          50: '#E8F4F4',
          100: '#D1E9E9',
          200: '#A3D3D3',
          300: '#75BDBD',
          400: '#47A7A7',
          500: '#1A7A7A',  // Primary teal
          600: '#156262',
          700: '#104A4A',
          800: '#0A3131',
          900: '#051919',
        },
        // Semantic colors using CSS variables for theming
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## 13. State Management

### 13.1 Zustand Store Structure

```typescript
// packages/modules/tasks/store/taskStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  // ... other fields
}

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  filters: {
    status: string | null;
    priority: string | null;
    executiveId: string | null;
  };
  isLoading: boolean;
  error: string | null;
}

interface TaskActions {
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  selectTask: (task: Task | null) => void;
  setFilters: (filters: Partial<TaskState['filters']>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskState & TaskActions>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        tasks: [],
        selectedTask: null,
        filters: {
          status: null,
          priority: null,
          executiveId: null,
        },
        isLoading: false,
        error: null,
        
        // Actions
        setTasks: (tasks) => set((state) => {
          state.tasks = tasks;
        }),
        
        addTask: (task) => set((state) => {
          state.tasks.unshift(task);
        }),
        
        updateTask: (id, updates) => set((state) => {
          const index = state.tasks.findIndex(t => t.id === id);
          if (index !== -1) {
            state.tasks[index] = { ...state.tasks[index], ...updates };
          }
        }),
        
        deleteTask: (id) => set((state) => {
          state.tasks = state.tasks.filter(t => t.id !== id);
        }),
        
        selectTask: (task) => set((state) => {
          state.selectedTask = task;
        }),
        
        setFilters: (filters) => set((state) => {
          state.filters = { ...state.filters, ...filters };
        }),
        
        setLoading: (isLoading) => set((state) => {
          state.isLoading = isLoading;
        }),
        
        setError: (error) => set((state) => {
          state.error = error;
        }),
      })),
      {
        name: 'jeniferai-tasks',
        partialize: (state) => ({ filters: state.filters }), // Only persist filters
      }
    ),
    { name: 'TaskStore' }
  )
);
```

### 13.2 React Query Hooks

```typescript
// packages/modules/tasks/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTaskStore } from '../store/taskStore';
import { taskApi } from '../api/taskApi';

export function useTasks(filters?: TaskFilters) {
  const queryClient = useQueryClient();
  const { setTasks, setLoading, setError } = useTaskStore();
  
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskApi.getTasks(filters),
    onSuccess: (data) => {
      setTasks(data.data);
    },
    onError: (error) => {
      setError(error.message);
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { addTask } = useTaskStore();
  
  return useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: (data) => {
      addTask(data.data);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { updateTask } = useTaskStore();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      taskApi.updateTask(id, updates),
    onSuccess: (data, { id, updates }) => {
      updateTask(id, updates);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { deleteTask } = useTaskStore();
  
  return useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: (_, id) => {
      deleteTask(id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

---

## 14. Real-Time Features

### 14.1 Supabase Realtime Subscriptions

```typescript
// hooks/useRealtimeSubscription.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useRealtimeSubscription(
  table: string,
  schema: string = 'public',
  queryKey: string[]
) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`${schema}:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
        },
        (payload) => {
          // Invalidate relevant queries to refetch
          queryClient.invalidateQueries({ queryKey });
          
          // Optionally handle specific events
          switch (payload.eventType) {
            case 'INSERT':
              console.log('New record:', payload.new);
              break;
            case 'UPDATE':
              console.log('Updated record:', payload.new);
              break;
            case 'DELETE':
              console.log('Deleted record:', payload.old);
              break;
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, queryKey, queryClient]);
}

// Usage in component
function TaskList() {
  // Subscribe to real-time task changes
  useRealtimeSubscription('tasks', 'mod_tasks', ['tasks']);
  
  const { data: tasks } = useTasks();
  // ...
}
```

### 14.2 Executive Status Real-Time

```typescript
// hooks/useCalendarStatus.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type ExecutiveStatus = 
  | 'available' 
  | 'in_meeting' 
  | 'driving' 
  | 'on_flight' 
  | 'do_not_disturb' 
  | 'offline';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
}

export function useCalendarStatus(executiveId: string | undefined) {
  const [status, setStatus] = useState<ExecutiveStatus>('available');
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  
  useEffect(() => {
    if (!executiveId) return;
    
    // Initial fetch
    fetchCurrentStatus();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchCurrentStatus, 30000);
    
    // Subscribe to calendar changes
    const channel = supabase
      .channel(`executive-status:${executiveId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'mod_scheduling',
          table: 'meetings',
          filter: `executive_id=eq.${executiveId}`,
        },
        () => {
          fetchCurrentStatus();
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    
    async function fetchCurrentStatus() {
      const now = new Date().toISOString();
      
      // Get current or upcoming event
      const { data: events } = await supabase
        .from('mod_scheduling.meetings')
        .select('*')
        .eq('executive_id', executiveId)
        .lte('start_time', now)
        .gte('end_time', now)
        .order('start_time', { ascending: true })
        .limit(1);
      
      if (events && events.length > 0) {
        const event = events[0];
        setCurrentEvent(event);
        
        // Determine status based on event type
        if (event.type === 'travel' || event.type === 'driving') {
          setStatus('driving');
        } else if (event.type === 'flight') {
          setStatus('on_flight');
        } else if (event.type === 'focus') {
          setStatus('do_not_disturb');
        } else {
          setStatus('in_meeting');
        }
      } else {
        setCurrentEvent(null);
        setStatus('available');
      }
    }
  }, [executiveId]);
  
  return { status, currentEvent };
}
```

---

## 15. Security Implementation

### 15.1 Authentication Guards

```typescript
// packages/core/auth/src/guards.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './hooks';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requiredRole, 
  fallback = null 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  if (isLoading) {
    return fallback;
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }
  
  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="admin">
      {children}
    </AuthGuard>
  );
}
```

### 15.2 API Security

```typescript
// lib/api/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  const supabase = createServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return handler(request, user);
}

export async function withAdmin(
  request: NextRequest,
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  const supabase = createServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check if user is admin
  const { data: userData } = await supabase
    .from('core.users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (userData?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  return handler(request, user);
}
```

---

## 16. Development Guidelines

### 16.1 Code Style Rules

1. **TypeScript Strict Mode**: Always use strict TypeScript configuration
2. **Explicit Return Types**: All functions must have explicit return types
3. **No Any Types**: Never use `any` - use `unknown` and type guards instead
4. **Zod Validation**: All API inputs must be validated with Zod schemas
5. **Error Handling**: Use proper error boundaries and try-catch blocks

### 16.2 Component Guidelines

1. **Server Components by Default**: Use Server Components unless client-side interactivity is needed
2. **Client Component Marking**: Mark client components with `'use client'` at the top
3. **Loading States**: Every data-fetching component needs loading and error states
4. **Accessibility**: All interactive elements must be keyboard accessible
5. **Mobile-First**: Design for mobile first, then enhance for larger screens

### 16.3 Module Development Rules

1. **Never Import Across Modules**: Modules can only communicate via Event Bus
2. **Self-Contained Migrations**: Each module owns its database migrations
3. **Manifest Required**: Every module must have a valid `manifest.ts`
4. **Event Documentation**: Document all events a module publishes/subscribes to
5. **Feature Flag Integration**: All module features must respect feature flags

### 16.4 Git Commit Convention

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructure
- test: Tests
- chore: Maintenance

Examples:
feat(tasks): add task delegation feature
fix(scheduling): resolve calendar sync issue
docs(readme): update setup instructions
```

### 16.5 Testing Requirements

1. **Unit Tests**: All utility functions and hooks
2. **Integration Tests**: API routes and database operations
3. **E2E Tests**: Critical user flows (auth, onboarding, core features)
4. **Minimum Coverage**: 80% for core packages, 70% for modules

---

## Quick Reference

### Environment Variables

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Maps
GOOGLE_MAPS_API_KEY=

# Email
RESEND_API_KEY=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### Commands

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Database migrations
pnpm db:migrate

# Generate types from database
pnpm db:types
```

---

**This document is the single source of truth for building JeniferAI. Follow these specifications precisely to ensure consistency, scalability, and maintainability across the entire platform.**
