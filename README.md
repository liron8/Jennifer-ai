# JeniferAI

> AI-powered command center for Executive Assistants, Chiefs of Staff, and Executives.

---

## Table of Contents

- [Overview](#overview)
- [Core Value Proposition](#core-value-proposition)
- [Target Users](#target-users)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Feature Modules](#feature-modules)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Application Routes](#application-routes)
- [Core Infrastructure](#core-infrastructure)
- [Subscription Tiers](#subscription-tiers)
- [Development Guidelines](#development-guidelines)
- [License](#license)

---

## Overview

JeniferAI is a **multi-tenant SaaS platform** designed to transform Executive Assistants (EAs), Chiefs of Staff (CoS), and Executives into strategic powerhouses. The platform centralizes scheduling, task management, communication, travel coordination, and institutional knowledge into one intelligent hub.

### Key Differentiators

- **Plugin-Based Architecture**: Unlimited scalability - feature #50 is as easy to add as feature #5
- **Multi-Tenant Isolation**: Complete data separation via PostgreSQL Row Level Security (RLS)
- **Event-Driven Communication**: Modules communicate via Event Bus, never direct imports
- **Feature Flags First**: Every feature behind flags from day one for per-tenant customization

---

## Core Value Proposition

| User Type | Value |
|-----------|-------|
| **Executive Assistants** | Transform from task managers to strategic partners through AI-powered automation |
| **Executives** | Gain 20%+ productivity improvement through seamless coordination and proactive support |
| **Organizations** | Reduce EA turnover, preserve institutional knowledge, enable 1:3 EA-to-executive ratios |

---

## Target Users

| User Type | Description | Primary Interface |
|-----------|-------------|-------------------|
| **Admin** | Organization owner, manages billing and users | Web Dashboard |
| **EA/User** | Executive Assistant, primary platform user | Web Dashboard |
| **Executive** | Receives briefs, approves requests | Mobile App (Phase 2) |

---

## Technology Stack

### Frontend

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router with Turbopack) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.x |
| Components | Untitled UI / React Aria Components |
| Icons | IconSax, Lucide React, Untitled UI Icons |
| Forms | React Hook Form + Zod |
| Tables | @tanstack/react-table |
| Charts | Recharts |
| Dates | date-fns, date-fns-tz |
| Animations | Framer Motion |

### State Management

| Category | Technology |
|----------|------------|
| Client State | Zustand |
| Server State | TanStack Query (React Query) v5 |
| Form State | React Hook Form |

### Backend & Database

| Category | Technology |
|----------|------------|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Edge Functions | Supabase Edge Functions |

### Infrastructure

| Category | Technology |
|----------|------------|
| Monorepo | Turborepo |
| Package Manager | pnpm 9.15.0 |
| Deployment | Vercel |
| Billing | Stripe |
| Email | Resend |
| SMS | Twilio |

### AI Services

| Provider | Model |
|----------|-------|
| OpenAI | GPT-4o |
| Anthropic | Claude 4 Sonnet |
| Google | Gemini Pro 2.5 |

### External APIs

| Category | Services |
|----------|----------|
| Calendar | Microsoft Graph API, Google Calendar API |
| Email | Microsoft Graph API, Gmail API |
| Maps | Google Maps Directions API, Google Maps Places API |
| Video | Zoom API, Microsoft Teams API |
| Communication | Slack API, Twilio |

---

## Project Structure

```
jeniferai/
├── apps/
│   └── web/                              # Next.js 16 Web Application
│       └── src/
│           ├── app/                      # App Router
│           │   ├── (auth)/               # Auth route group (public)
│           │   │   ├── login/
│           │   │   ├── signup/
│           │   │   ├── forgot-password/
│           │   │   ├── reset-password/
│           │   │   └── verify/
│           │   ├── (onboarding)/         # Onboarding route group
│           │   │   └── onboarding/
│           │   ├── (dashboard)/          # Protected dashboard routes
│           │   │   ├── dashboard/
│           │   │   ├── scheduling/
│           │   │   │   ├── calendar/
│           │   │   │   ├── meeting-log/
│           │   │   │   └── route-planner/
│           │   │   ├── tasks/
│           │   │   │   ├── todo/
│           │   │   │   ├── approvals/
│           │   │   │   └── delegations/
│           │   │   ├── key-dates/
│           │   │   ├── reports/
│           │   │   │   ├── calendar-insights/
│           │   │   │   ├── inbox-insights/
│           │   │   │   └── throughput/
│           │   │   ├── team/
│           │   │   │   └── executives/
│           │   │   │       └── [id]/
│           │   │   ├── events/
│           │   │   ├── contacts/
│           │   │   ├── concierge/
│           │   │   └── settings/
│           │   │       ├── profile/
│           │   │       ├── organization/
│           │   │       ├── integrations/
│           │   │       ├── team/
│           │   │       ├── billing/
│           │   │       └── audit-log/
│           │   └── api/                  # API Routes
│           │       ├── auth/callback/
│           │       └── webhooks/
│           │           ├── stripe/
│           │           └── supabase/
│           ├── components/               # App-specific components
│           │   ├── layouts/              # DashboardLayout, Sidebar, TopNav
│           │   ├── auth/                 # Auth components
│           │   ├── onboarding/           # Onboarding wizard & steps
│           │   └── ...
│           ├── hooks/                    # Custom React hooks
│           ├── lib/                      # Utilities & Supabase clients
│           └── providers/                # Context providers
│
├── packages/
│   ├── core/                             # Core Infrastructure
│   │   ├── module-registry/              # Module registration & loading
│   │   ├── feature-flags/                # Feature flag service & hooks
│   │   ├── event-bus/                    # Event-driven communication
│   │   ├── auth/                         # Auth provider, guards, hooks
│   │   └── database/                     # Database client & migrations
│   │
│   ├── modules/                          # Feature Modules (Plugins)
│   │   ├── dashboard/                    # Main dashboard overview
│   │   ├── scheduling/                   # Calendar, meetings, route planning
│   │   ├── tasks/                        # To-do, approvals, delegations
│   │   ├── key-dates/                    # Important dates tracker
│   │   ├── reports/                      # Analytics & insights
│   │   ├── team/                         # Executive profiles management
│   │   ├── events-hub/                   # Event planning (Pro)
│   │   ├── contacts/                     # Contact management (Pro)
│   │   ├── concierge/                    # Service directory (Pro)
│   │   └── settings/                     # App settings & preferences
│   │
│   ├── ui/                               # Shared UI Components
│   ├── utils/                            # Shared Utilities
│   └── types/                            # Shared TypeScript Types
│
├── supabase/                             # Database migrations & config
├── turbo.json                            # Turborepo configuration
├── pnpm-workspace.yaml                   # pnpm workspace config
└── package.json                          # Root package.json
```

---

## Architecture

### Plugin-Based Modular Architecture (PBMA)

JeniferAI uses a plugin-based architecture that ensures scalability, maintainability, and per-tenant customization.

#### Core Principles

1. **Module Independence**
   - Every feature module is a self-contained unit with its own database schema, components, API routes, and business logic
   - Modules **NEVER import directly from other modules**
   - All cross-module communication happens through the Event Bus

2. **Manifest-Driven Configuration**
   - Each module declares its requirements, dependencies, permissions, and navigation in a `manifest.ts` file
   - The Module Registry reads these manifests to dynamically compose the application

3. **Schema Ownership**
   - Each module owns its database schema (e.g., `mod_tasks`, `mod_scheduling`)
   - Core infrastructure lives in the `core` schema
   - Modules can only read from other schemas via views or events, never direct writes

4. **Feature Flags First**
   - Every feature is behind a feature flag from day one
   - Enables per-tenant customization, percentage rollouts, and instant rollback

5. **Event-Driven Communication**
   - Modules publish and subscribe to domain events
   - Loose coupling enables independent development and testing

### Multi-Tenancy Model

JeniferAI uses **organization-based multi-tenancy** where each company is a separate tenant with complete data isolation via PostgreSQL Row Level Security (RLS).

```
Organization (Tenant)
├── Users (Admin, EA)
├── Executive Profiles
├── Feature Flags (per-org overrides)
├── Subscription (tier determines features)
└── All module data is scoped to org_id
```

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Organization owner/manager | Full access, billing, user management, settings |
| `user` | Executive Assistant (EA) | Access to assigned executives, enabled features |

---

## Feature Modules

### Core Tier Modules

| Module | Path | Description |
|--------|------|-------------|
| **Dashboard** | `/dashboard` | Main overview with priorities, schedule, approvals, and quick actions |
| **Scheduling** | `/scheduling/*` | Calendar management, meeting log, route planner |
| **Task Hub** | `/tasks/*` | To-do list, approvals queue, delegations |
| **Key Dates** | `/key-dates` | Birthdays, anniversaries, deadlines, milestones tracker |
| **Reporting** | `/reports/*` | Calendar insights, inbox insights, throughput analytics |
| **Team** | `/team/*` | Executive profiles with preferences, direct reports, family, memberships |
| **Settings** | `/settings/*` | Profile, organization, integrations, team, billing, audit log |

### Pro Tier Modules

| Module | Path | Description |
|--------|------|-------------|
| **Events Hub** | `/events` | Event planning and coordination |
| **Contacts** | `/contacts` | Contact management and directory |
| **Concierge** | `/concierge` | Service directory and vendor management |

### Enterprise Tier Modules

| Module | Description |
|--------|-------------|
| **EA Network** | Cross-organization EA collaboration |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9.15.0

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd jeniferai

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
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

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run tests |
| `pnpm clean` | Clean build artifacts and node_modules |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:types` | Generate TypeScript types from database |

---

## Application Routes

### Authentication Routes `(auth)/`

| Route | Description |
|-------|-------------|
| `/login` | User login with email/password or OAuth |
| `/signup` | New user registration |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |
| `/verify` | Email/MFA verification |

### Onboarding Routes `(onboarding)/`

| Route | Description |
|-------|-------------|
| `/onboarding` | Multi-step onboarding wizard |

**Onboarding Steps:**
1. Welcome
2. Company Information
3. Your Role
4. Executive Profiles
5. Integrations
6. Setup Complete (animated transition to dashboard)

### Dashboard Routes `(dashboard)/`

| Route | Description |
|-------|-------------|
| `/dashboard` | Main dashboard overview |
| `/scheduling/calendar` | Calendar view (day/week/month) |
| `/scheduling/meeting-log` | Meeting history and search |
| `/scheduling/route-planner` | Optimize travel routes |
| `/tasks/todo` | Task list management |
| `/tasks/approvals` | Pending approval queue |
| `/tasks/delegations` | Task delegation management |
| `/key-dates` | Important dates by category |
| `/reports/calendar-insights` | Meeting analytics |
| `/reports/inbox-insights` | Email analytics |
| `/reports/throughput` | Productivity metrics |
| `/team/executives` | Executive list |
| `/team/executives/[id]` | Executive profile detail |
| `/events` | Events hub (Pro) |
| `/contacts` | Contact directory (Pro) |
| `/concierge` | Service directory (Pro) |
| `/settings/profile` | User profile settings |
| `/settings/organization` | Organization settings |
| `/settings/integrations` | Connected services |
| `/settings/team` | Team member management |
| `/settings/billing` | Subscription & billing |
| `/settings/audit-log` | Activity audit trail |

### API Routes

| Route | Description |
|-------|-------------|
| `/api/auth/callback` | OAuth callback handler |
| `/api/webhooks/stripe` | Stripe webhook endpoint |
| `/api/webhooks/supabase` | Supabase webhook endpoint |

---

## Core Infrastructure

### Module Registry (`@jeniferai/core-module-registry`)

Responsible for loading module manifests, validating dependencies, building navigation, and checking feature flag status per tenant.

### Feature Flags (`@jeniferai/core-feature-flags`)

Manages feature availability with support for:
- Global enable/disable
- Tier requirements
- Percentage rollouts
- Organization whitelist/blacklist

### Event Bus (`@jeniferai/core-event-bus`)

Enables loose coupling between modules through publish/subscribe pattern:
- Domain events with metadata (timestamp, source, orgId, userId, correlationId)
- Event persistence for auditing
- Middleware support

### Auth (`@jeniferai/core-auth`)

Provides authentication utilities:
- Auth provider and context
- `useAuth` hook
- `AuthGuard` and `AdminGuard` components
- Session management

### Database (`@jeniferai/core-database`)

Database client and migration management for Supabase/PostgreSQL.

---

## Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Trial** | $1/14 days | All core features, credit card required |
| **Starter** | $49/month/exec | Core modules only |
| **Pro** | $99/month/exec | Core + Pro modules (Events, Contacts, Concierge) |
| **Enterprise** | $199/month/exec | All modules + custom integrations + EA Network |

---

## Development Guidelines

### Code Style

- **TypeScript Strict Mode**: Always use strict TypeScript configuration
- **Explicit Return Types**: All functions must have explicit return types
- **No Any Types**: Use `unknown` and type guards instead
- **Zod Validation**: All API inputs must be validated with Zod schemas

### Component Guidelines

- **Server Components by Default**: Use Server Components unless client-side interactivity is needed
- **Client Component Marking**: Mark client components with `'use client'` at the top
- **Loading States**: Every data-fetching component needs loading and error states
- **Accessibility**: All interactive elements must be keyboard accessible
- **Mobile-First**: Design for mobile first, then enhance for larger screens

### Module Development Rules

1. **Never Import Across Modules**: Modules can only communicate via Event Bus
2. **Self-Contained Migrations**: Each module owns its database migrations
3. **Manifest Required**: Every module must have a valid `manifest.ts`
4. **Event Documentation**: Document all events a module publishes/subscribes to
5. **Feature Flag Integration**: All module features must respect feature flags

### Git Commit Convention

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

### Testing Requirements

- **Unit Tests**: All utility functions and hooks
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user flows (auth, onboarding, core features)
- **Minimum Coverage**: 80% for core packages, 70% for modules

---

## License

Proprietary - All rights reserved
![alt text](<Screenshot 2026-02-12 at 9.58.21 AM.png>)