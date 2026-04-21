# JeniferAI - Implementation Guide

> **Step-by-step setup and development guide for building JeniferAI**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Database Setup](#3-database-setup)
4. [Authentication Setup](#4-authentication-setup)
5. [AI Engine Setup](#5-ai-engine-setup)
6. [Integration Setup](#6-integration-setup)
7. [Development Workflow](#7-development-workflow)
8. [Testing](#8-testing)
9. [Deployment](#9-deployment)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Prerequisites

### 1.1 Required Software

```bash
# Node.js 18+ (recommend 20 LTS)
node --version  # v20.x.x

# pnpm (package manager)
npm install -g pnpm
pnpm --version  # 8.x.x

# Supabase CLI
npm install -g supabase
supabase --version
```

### 1.2 Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Supabase | Database, Auth, Realtime | https://supabase.com |
| Anthropic | Claude AI API | https://console.anthropic.com |
| OpenAI | Embeddings | https://platform.openai.com |
| Google Cloud | Calendar, Gmail | https://console.cloud.google.com |
| Microsoft Azure | Outlook | https://portal.azure.com |
| Slack | Messaging | https://api.slack.com |
| Google Maps | Traffic/Routes | https://console.cloud.google.com |

### 1.3 Environment Variables Template

Create `.env.local` in `apps/web/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Google
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
GOOGLE_MAPS_API_KEY=...

# Microsoft
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback

# Slack
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_REDIRECT_URI=http://localhost:3000/api/integrations/slack/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Project Setup

### 2.1 Install Dependencies

```bash
# Navigate to project root
cd /Users/blackpanther/Desktop/JenAI

# Install all dependencies
pnpm install

# Install AI SDK packages
pnpm add ai @ai-sdk/anthropic @ai-sdk/openai --filter web

# Install Supabase packages
pnpm add @supabase/supabase-js @supabase/ssr --filter web

# Install Google APIs
pnpm add googleapis @google-cloud/local-auth --filter web

# Install Microsoft Graph
pnpm add @microsoft/microsoft-graph-client --filter web

# Install Slack SDK
pnpm add @slack/web-api --filter web

# Install Zod for validation
pnpm add zod --filter web
```

### 2.2 Project Structure

```
JenAI/
├── apps/
│   └── web/                      # Next.js application
│       ├── src/
│       │   ├── app/              # App Router pages
│       │   │   ├── (auth)/       # Auth pages (login, signup)
│       │   │   ├── (dashboard)/  # Dashboard pages
│       │   │   ├── (onboarding)/ # Onboarding flow
│       │   │   └── api/          # API routes
│       │   ├── components/       # UI components
│       │   ├── lib/              # Utilities
│       │   │   ├── supabase/     # Supabase clients
│       │   │   ├── ai/           # AI engine
│       │   │   ├── integrations/ # Third-party integrations
│       │   │   └── api/          # API utilities
│       │   └── hooks/            # React hooks
│       └── .env.local            # Environment variables
├── packages/
│   ├── core/                     # Core business logic
│   │   └── src/
│   │       ├── ai/               # AI engine core
│   │       ├── events/           # Event system
│   │       ├── integrations/     # Integration services
│   │       └── jobs/             # Background jobs
│   ├── types/                    # Shared TypeScript types
│   └── ui/                       # Shared UI components
├── supabase/
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge functions
└── docs/                         # Documentation
```

### 2.3 Create Core Package Structure

```bash
# Create AI engine directory structure
mkdir -p packages/core/src/ai/{modules,tools,handlers,jobs}
mkdir -p packages/core/src/events/handlers
mkdir -p packages/core/src/integrations/{google,microsoft,slack}

# Create lib directories in web app
mkdir -p apps/web/src/lib/{supabase,ai,integrations,api}
```

---

## 3. Database Setup

### 3.1 Initialize Supabase

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Or start local development
supabase start
```

### 3.2 Create Migration Files

```bash
# Create migrations directory
mkdir -p supabase/migrations

# Create migration files in order
touch supabase/migrations/20240101000000_extensions.sql
touch supabase/migrations/20240101000001_core_tables.sql
touch supabase/migrations/20240101000002_module_tables.sql
touch supabase/migrations/20240101000003_ai_tables.sql
touch supabase/migrations/20240101000004_integration_tables.sql
touch supabase/migrations/20240101000005_system_tables.sql
touch supabase/migrations/20240101000006_indexes.sql
touch supabase/migrations/20240101000007_rls_policies.sql
touch supabase/migrations/20240101000008_triggers.sql
```

### 3.3 Extensions Migration

```sql
-- supabase/migrations/20240101000000_extensions.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 3.4 Run Migrations

```bash
# Push migrations to Supabase
supabase db push

# Or run locally
supabase db reset
```

### 3.5 Generate TypeScript Types

```bash
# Generate types from database schema
supabase gen types typescript --project-id your-project-ref > packages/types/src/database.ts
```

---

## 4. Authentication Setup

### 4.1 Supabase Client Setup

```typescript
// apps/web/src/lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// apps/web/src/lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handle server component
          }
        },
      },
    }
  );
}
```

```typescript
// apps/web/src/lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
```

### 4.2 Auth Provider Setup

In Supabase Dashboard:

1. Go to Authentication > Providers
2. Enable Email provider
3. Enable Google OAuth (add client ID/secret)
4. Enable Azure/Microsoft OAuth (add client ID/secret)

---

## 5. AI Engine Setup

### 5.1 Install Vercel AI SDK

```bash
pnpm add ai @ai-sdk/anthropic @ai-sdk/openai zod --filter web
```

### 5.2 Create AI Configuration

```typescript
// apps/web/src/lib/ai/config.ts

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const models = {
  // Primary model for complex reasoning
  reasoning: anthropic('claude-3-5-sonnet-20241022'),
  
  // Fast model for simple tasks
  fast: openai('gpt-4o-mini'),
  
  // Embeddings model
  embeddings: openai.embedding('text-embedding-ada-002')
};

export const AI_CONFIG = {
  maxTokens: 4096,
  temperature: 0.7,
  maxSteps: 5  // For multi-step tool use
};
```

### 5.3 Create Context Builder

```typescript
// apps/web/src/lib/ai/context-builder.ts

import { createClient } from '@/lib/supabase/server';

export interface AIContext {
  user: any;
  organization: any;
  executive?: any;
  temporal: {
    currentTime: Date;
    timezone: string;
    todaysMeetings: any[];
    upcomingTasks: any[];
    pendingApprovals: any[];
    upcomingKeyDates: any[];
  };
  patterns: any;
}

export async function buildContext(
  userId: string,
  executiveId?: string
): Promise<AIContext> {
  const supabase = await createClient();
  
  // Fetch all context data in parallel
  const [
    { data: user },
    { data: meetings },
    { data: tasks },
    { data: approvals },
    { data: keyDates }
  ] = await Promise.all([
    supabase.from('users').select('*, organizations(*)').eq('id', userId).single(),
    supabase.from('meetings')
      .select('*')
      .eq('org_id', user?.org_id)
      .gte('start_time', new Date().toISOString().split('T')[0])
      .order('start_time'),
    supabase.from('tasks')
      .select('*')
      .eq('org_id', user?.org_id)
      .neq('status', 'done')
      .order('due_date'),
    supabase.from('approvals')
      .select('*')
      .eq('org_id', user?.org_id)
      .eq('status', 'pending'),
    supabase.from('key_dates')
      .select('*')
      .eq('org_id', user?.org_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(10)
  ]);
  
  let executive = null;
  if (executiveId) {
    const { data } = await supabase
      .from('executive_profiles')
      .select('*')
      .eq('id', executiveId)
      .single();
    executive = data;
  }
  
  return {
    user,
    organization: user?.organizations,
    executive,
    temporal: {
      currentTime: new Date(),
      timezone: user?.timezone || 'America/Los_Angeles',
      todaysMeetings: meetings || [],
      upcomingTasks: tasks || [],
      pendingApprovals: approvals || [],
      upcomingKeyDates: keyDates || []
    },
    patterns: {}
  };
}
```

### 5.4 Create Chat API Route

```typescript
// apps/web/src/app/api/ai/chat/route.ts

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { buildContext } from '@/lib/ai/context-builder';
import { tools } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { messages, executiveId } = await req.json();
  
  // Build context
  const context = await buildContext(user.id, executiveId);
  
  // Build system prompt
  const systemPrompt = buildSystemPrompt(context);
  
  // Stream response
  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5
  });
  
  return result.toDataStreamResponse();
}

function buildSystemPrompt(context: any): string {
  return `You are Jenifer, an intelligent AI assistant for Executive Assistants.

## Current Context
- Time: ${context.temporal.currentTime.toISOString()}
- User: ${context.user?.full_name}
${context.executive ? `- Executive: ${context.executive.full_name}` : ''}

## Today's Meetings
${context.temporal.todaysMeetings.slice(0, 5).map((m: any) => 
  `- ${m.start_time}: ${m.title}`
).join('\n') || 'No meetings'}

## Pending Tasks
${context.temporal.upcomingTasks.slice(0, 5).map((t: any) => 
  `- [${t.priority}] ${t.title}`
).join('\n') || 'No tasks'}

## Guidelines
1. Be helpful and proactive
2. Consider executive preferences
3. Flag potential issues
4. Provide actionable suggestions`;
}
```

### 5.5 Create AI Tools

```typescript
// apps/web/src/lib/ai/tools.ts

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const tools = {
  getMeetings: tool({
    description: 'Get meetings for a date range',
    parameters: z.object({
      startDate: z.string(),
      endDate: z.string()
    }),
    execute: async ({ startDate, endDate }) => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('meetings')
        .select('*')
        .gte('start_time', startDate)
        .lte('start_time', endDate);
      return data;
    }
  }),
  
  getTasks: tool({
    description: 'Get tasks with filters',
    parameters: z.object({
      status: z.string().optional(),
      priority: z.string().optional()
    }),
    execute: async ({ status, priority }) => {
      const supabase = await createClient();
      let query = supabase.from('tasks').select('*');
      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      const { data } = await query;
      return data;
    }
  }),
  
  getKeyDates: tool({
    description: 'Get upcoming key dates',
    parameters: z.object({
      daysAhead: z.number().default(30)
    }),
    execute: async ({ daysAhead }) => {
      const supabase = await createClient();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data } = await supabase
        .from('key_dates')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .lte('date', futureDate.toISOString().split('T')[0]);
      return data;
    }
  }),
  
  searchContacts: tool({
    description: 'Search contacts',
    parameters: z.object({
      query: z.string()
    }),
    execute: async ({ query }) => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .or(`full_name.ilike.%${query}%,company.ilike.%${query}%`);
      return data;
    }
  })
};
```

---

## 6. Integration Setup

### 6.1 Google Calendar Setup

1. Go to Google Cloud Console
2. Create new project or select existing
3. Enable Google Calendar API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URIs

### 6.2 Microsoft Outlook Setup

1. Go to Azure Portal
2. Register new application
3. Add Microsoft Graph API permissions:
   - Calendars.ReadWrite
   - User.Read
4. Create client secret
5. Configure redirect URIs

### 6.3 Slack Setup

1. Go to api.slack.com
2. Create new app
3. Add OAuth scopes:
   - chat:write
   - users:read
   - channels:read
4. Configure redirect URLs
5. Install to workspace

---

## 7. Development Workflow

### 7.1 Start Development Server

```bash
# Start all services
pnpm dev

# Or start specific apps
pnpm dev --filter web

# Start Supabase locally
supabase start
```

### 7.2 Database Changes

```bash
# Create new migration
supabase migration new my_migration_name

# Apply migrations locally
supabase db reset

# Push to production
supabase db push
```

### 7.3 Type Generation

```bash
# Regenerate types after schema changes
pnpm db:types
```

### 7.4 Code Quality

```bash
# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

---

## 8. Testing

### 8.1 Test AI Chat

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "What meetings do I have today?"}
    ]
  }'
```

### 8.2 Test Database Queries

```typescript
// Test in Supabase SQL Editor
SELECT * FROM meetings 
WHERE org_id = 'your-org-id' 
AND start_time >= CURRENT_DATE;
```

---

## 9. Deployment

### 9.1 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... etc
```

### 9.2 Supabase Production

1. Create production project in Supabase
2. Run migrations: `supabase db push`
3. Configure auth providers
4. Set up Edge Functions

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Core auth and data layer

- [ ] Set up Supabase project
- [ ] Run database migrations (core tables)
- [ ] Implement auth flow (login, signup)
- [ ] Complete onboarding flow with data persistence
- [ ] Create basic API routes (CRUD for main entities)

**Deliverables:**
- Working auth
- Onboarding saves to database
- Dashboard shows real data

### Phase 2: Core Modules (Week 3-4)

**Goal:** Main features working with database

- [ ] Meetings API + UI integration
- [ ] Tasks API + UI integration
- [ ] Approvals API + UI integration
- [ ] Key Dates API + UI integration
- [ ] Executives API + UI integration

**Deliverables:**
- All CRUD operations working
- Real-time updates via Supabase Realtime

### Phase 3: AI Engine (Week 5-6)

**Goal:** Intelligent features

- [ ] Set up Vercel AI SDK
- [ ] Implement context builder
- [ ] Create AI tools
- [ ] Build chat interface (/ask-jenifer)
- [ ] Implement conflict detection
- [ ] Add meeting brief generation

**Deliverables:**
- Working chat with Jenifer
- AI-powered conflict detection
- Meeting briefs

### Phase 4: Integrations (Week 7-8)

**Goal:** External calendar sync

- [ ] Google Calendar OAuth + sync
- [ ] Microsoft Outlook OAuth + sync
- [ ] Bidirectional sync logic
- [ ] Gmail integration (optional)
- [ ] Slack notifications

**Deliverables:**
- Calendar sync working
- Slack notifications

### Phase 5: Proactive Intelligence (Week 9-10)

**Goal:** Background processing and insights

- [ ] Set up Supabase Edge Functions
- [ ] Implement scheduled jobs
- [ ] Key date scanning
- [ ] Traffic alerts
- [ ] Pattern learning
- [ ] Daily briefs

**Deliverables:**
- Proactive notifications
- AI insights on dashboard

### Phase 6: Polish & Launch (Week 11-12)

**Goal:** Production ready

- [ ] Performance optimization
- [ ] Error handling
- [ ] Logging and monitoring
- [ ] Security audit
- [ ] Documentation
- [ ] Beta testing

**Deliverables:**
- Production deployment
- User documentation

---

## Quick Start Checklist

```
[ ] 1. Clone repo and install dependencies
[ ] 2. Create Supabase project
[ ] 3. Set up environment variables
[ ] 4. Run database migrations
[ ] 5. Configure auth providers
[ ] 6. Start development server
[ ] 7. Test auth flow
[ ] 8. Test onboarding
[ ] 9. Verify data persistence
[ ] 10. Begin feature development
```

---

## Troubleshooting

### Common Issues

**Supabase connection fails:**
- Check SUPABASE_URL and SUPABASE_ANON_KEY
- Ensure project is running

**Auth not working:**
- Verify redirect URLs in Supabase dashboard
- Check cookie settings

**AI not responding:**
- Verify ANTHROPIC_API_KEY
- Check API rate limits

**Migrations fail:**
- Check SQL syntax
- Verify foreign key order

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Anthropic API](https://docs.anthropic.com)

---

**You're ready to build JeniferAI! Start with Phase 1 and work through each phase systematically.**
