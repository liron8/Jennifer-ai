# JeniferAI - Integrations Specification

> **Third-party integration specifications for Google Calendar, Microsoft Outlook, Gmail, and Slack**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Google Calendar Integration](#2-google-calendar-integration)
3. [Microsoft Outlook Integration](#3-microsoft-outlook-integration)
4. [Gmail Integration](#4-gmail-integration)
5. [Slack Integration](#5-slack-integration)
6. [Integration Management](#6-integration-management)
7. [Sync Architecture](#7-sync-architecture)

---

## 1. Overview

### 1.1 Supported Integrations

| Integration | Type | Features |
|-------------|------|----------|
| Google Calendar | Calendar | Read/write events, availability |
| Microsoft Outlook | Calendar | Read/write events, availability |
| Gmail | Email | Read emails, send drafts |
| Slack | Messaging | Notifications, commands |

### 1.2 OAuth Flow

```
User clicks "Connect"
        │
        ▼
┌─────────────────┐
│ Redirect to     │
│ Provider OAuth  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User authorizes │
│ permissions     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Callback with   │
│ auth code       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Exchange for    │
│ access token    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store tokens    │
│ in integrations │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Initial sync    │
└─────────────────┘
```

### 1.3 Token Management

```typescript
interface IntegrationTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
  scopes: string[];
}

// Token refresh logic
async function ensureValidToken(integration: Integration): Promise<string> {
  if (new Date() >= new Date(integration.token_expires_at)) {
    const newTokens = await refreshToken(integration);
    await updateIntegration(integration.id, newTokens);
    return newTokens.access_token;
  }
  return integration.access_token;
}
```

---

## 2. Google Calendar Integration

### 2.1 Setup

**Google Cloud Console Configuration:**

1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
```

### 2.2 OAuth Scopes

```typescript
const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',           // Full calendar access
  'https://www.googleapis.com/auth/calendar.events',    // Event management
  'https://www.googleapis.com/auth/calendar.readonly',  // Read-only access
];
```

### 2.3 API Implementation

```typescript
// packages/core/src/integrations/google/calendar.ts

import { google } from 'googleapis';

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  
  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }
  
  // List calendars
  async listCalendars(): Promise<CalendarList[]> {
    const response = await this.calendar.calendarList.list();
    return response.data.items?.map(cal => ({
      id: cal.id!,
      name: cal.summary!,
      primary: cal.primary || false,
      color: cal.backgroundColor
    })) || [];
  }
  
  // Get events
  async getEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
    syncToken?: string
  ): Promise<{ events: CalendarEvent[]; nextSyncToken: string }> {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    };
    
    if (syncToken) {
      params.syncToken = syncToken;
      delete params.timeMin;
      delete params.timeMax;
    }
    
    const response = await this.calendar.events.list(params);
    
    return {
      events: response.data.items?.map(this.mapEvent) || [],
      nextSyncToken: response.data.nextSyncToken || ''
    };
  }
  
  // Create event
  async createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent> {
    const response = await this.calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: event.timezone
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: event.timezone
        },
        location: event.location,
        attendees: event.attendees?.map(a => ({ email: a.email })),
        conferenceData: event.createVideoConference ? {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        } : undefined
      },
      conferenceDataVersion: event.createVideoConference ? 1 : 0
    });
    
    return this.mapEvent(response.data);
  }
  
  // Update event
  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: UpdateEventInput
  ): Promise<CalendarEvent> {
    const response = await this.calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: updates.title,
        description: updates.description,
        start: updates.start ? {
          dateTime: updates.start.toISOString(),
          timeZone: updates.timezone
        } : undefined,
        end: updates.end ? {
          dateTime: updates.end.toISOString(),
          timeZone: updates.timezone
        } : undefined,
        location: updates.location
      }
    });
    
    return this.mapEvent(response.data);
  }
  
  // Delete event
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.calendar.events.delete({ calendarId, eventId });
  }
  
  // Check availability
  async checkAvailability(
    calendarIds: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<FreeBusyResponse> {
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: calendarIds.map(id => ({ id }))
      }
    });
    
    return response.data;
  }
  
  private mapEvent(event: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: event.id!,
      title: event.summary || 'Untitled',
      description: event.description,
      start: new Date(event.start?.dateTime || event.start?.date!),
      end: new Date(event.end?.dateTime || event.end?.date!),
      isAllDay: !event.start?.dateTime,
      location: event.location,
      attendees: event.attendees?.map(a => ({
        email: a.email!,
        name: a.displayName,
        status: a.responseStatus as AttendeeStatus
      })),
      videoConferenceUrl: event.conferenceData?.entryPoints?.[0]?.uri,
      recurringEventId: event.recurringEventId,
      status: event.status as EventStatus
    };
  }
}
```

### 2.4 Webhook Setup

```typescript
// Set up push notifications for calendar changes
async function setupCalendarWebhook(
  calendarId: string,
  integration: Integration
): Promise<void> {
  const calendar = new GoogleCalendarService(integration.access_token);
  
  await calendar.calendar.events.watch({
    calendarId,
    requestBody: {
      id: crypto.randomUUID(),
      type: 'web_hook',
      address: `${process.env.APP_URL}/api/webhooks/google-calendar`,
      token: integration.id, // For verification
      expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString() // 7 days
    }
  });
}
```

### 2.5 API Routes

```typescript
// apps/web/src/app/api/integrations/google/route.ts

// Initiate OAuth
export async function GET(req: Request) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CALENDAR_SCOPES,
    prompt: 'consent'
  });
  
  return NextResponse.redirect(authUrl);
}

// apps/web/src/app/api/integrations/google/callback/route.ts

// Handle OAuth callback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  const { tokens } = await oauth2Client.getToken(code!);
  
  // Get user info
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  
  // Save integration
  await supabase.from('integrations').insert({
    user_id: currentUser.id,
    org_id: currentUser.org_id,
    provider: 'google',
    integration_type: 'calendar',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(tokens.expiry_date!),
    scopes: tokens.scope?.split(' '),
    provider_user_id: userInfo.data.id,
    provider_email: userInfo.data.email,
    status: 'active'
  });
  
  // Trigger initial sync
  await triggerCalendarSync(integration.id);
  
  return NextResponse.redirect('/settings?tab=integrations&success=google');
}
```

---

## 3. Microsoft Outlook Integration

### 3.1 Setup

**Azure AD Configuration:**

1. Register app in Azure AD
2. Add Microsoft Graph API permissions
3. Configure redirect URIs
4. Create client secret

**Environment Variables:**
```env
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback
```

### 3.2 OAuth Scopes

```typescript
const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Calendars.ReadWrite',
  'Calendars.Read.Shared',
  'User.Read'
];
```

### 3.3 API Implementation

```typescript
// packages/core/src/integrations/microsoft/calendar.ts

import { Client } from '@microsoft/microsoft-graph-client';

export class MicrosoftCalendarService {
  private client: Client;
  
  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => done(null, accessToken)
    });
  }
  
  // List calendars
  async listCalendars(): Promise<CalendarList[]> {
    const response = await this.client.api('/me/calendars').get();
    return response.value.map((cal: any) => ({
      id: cal.id,
      name: cal.name,
      primary: cal.isDefaultCalendar,
      color: cal.color
    }));
  }
  
  // Get events
  async getEvents(
    calendarId: string,
    startDateTime: Date,
    endDateTime: Date
  ): Promise<CalendarEvent[]> {
    const response = await this.client
      .api(`/me/calendars/${calendarId}/calendarView`)
      .query({
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        $orderby: 'start/dateTime',
        $top: 250
      })
      .get();
    
    return response.value.map(this.mapEvent);
  }
  
  // Create event
  async createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent> {
    const response = await this.client
      .api(`/me/calendars/${calendarId}/events`)
      .post({
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description || ''
        },
        start: {
          dateTime: event.start.toISOString(),
          timeZone: event.timezone
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: event.timezone
        },
        location: event.location ? { displayName: event.location } : undefined,
        attendees: event.attendees?.map(a => ({
          emailAddress: { address: a.email },
          type: 'required'
        })),
        isOnlineMeeting: event.createVideoConference,
        onlineMeetingProvider: event.createVideoConference ? 'teamsForBusiness' : undefined
      });
    
    return this.mapEvent(response);
  }
  
  // Update event
  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: UpdateEventInput
  ): Promise<CalendarEvent> {
    const response = await this.client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .patch({
        subject: updates.title,
        body: updates.description ? {
          contentType: 'text',
          content: updates.description
        } : undefined,
        start: updates.start ? {
          dateTime: updates.start.toISOString(),
          timeZone: updates.timezone
        } : undefined,
        end: updates.end ? {
          dateTime: updates.end.toISOString(),
          timeZone: updates.timezone
        } : undefined,
        location: updates.location ? { displayName: updates.location } : undefined
      });
    
    return this.mapEvent(response);
  }
  
  // Delete event
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .delete();
  }
  
  // Check availability
  async checkAvailability(
    emails: string[],
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResponse> {
    const response = await this.client
      .api('/me/calendar/getSchedule')
      .post({
        schedules: emails,
        startTime: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC'
        },
        endTime: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC'
        }
      });
    
    return response;
  }
  
  private mapEvent(event: any): CalendarEvent {
    return {
      id: event.id,
      title: event.subject || 'Untitled',
      description: event.body?.content,
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
      isAllDay: event.isAllDay,
      location: event.location?.displayName,
      attendees: event.attendees?.map((a: any) => ({
        email: a.emailAddress.address,
        name: a.emailAddress.name,
        status: this.mapResponseStatus(a.status?.response)
      })),
      videoConferenceUrl: event.onlineMeeting?.joinUrl,
      status: event.isCancelled ? 'cancelled' : 'confirmed'
    };
  }
  
  private mapResponseStatus(status: string): AttendeeStatus {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      case 'tentativelyAccepted': return 'tentative';
      default: return 'needsAction';
    }
  }
}
```

### 3.4 API Routes

```typescript
// apps/web/src/app/api/integrations/microsoft/route.ts

export async function GET(req: Request) {
  const authUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?` +
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      scope: MICROSOFT_SCOPES.join(' '),
      response_mode: 'query',
      prompt: 'consent'
    });
  
  return NextResponse.redirect(authUrl);
}

// apps/web/src/app/api/integrations/microsoft/callback/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  
  // Exchange code for tokens
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code: code!,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: 'authorization_code'
      })
    }
  );
  
  const tokens = await tokenResponse.json();
  
  // Get user info
  const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const userInfo = await userResponse.json();
  
  // Save integration
  await supabase.from('integrations').insert({
    user_id: currentUser.id,
    org_id: currentUser.org_id,
    provider: 'microsoft',
    integration_type: 'calendar',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    scopes: tokens.scope?.split(' '),
    provider_user_id: userInfo.id,
    provider_email: userInfo.mail || userInfo.userPrincipalName,
    status: 'active'
  });
  
  return NextResponse.redirect('/settings?tab=integrations&success=microsoft');
}
```

---

## 4. Gmail Integration

### 4.1 Setup

Uses same Google OAuth with additional scopes.

**Additional Scopes:**
```typescript
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
];
```

### 4.2 API Implementation

```typescript
// packages/core/src/integrations/google/gmail.ts

import { google, gmail_v1 } from 'googleapis';

export class GmailService {
  private gmail: gmail_v1.Gmail;
  
  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }
  
  // List messages
  async listMessages(
    query?: string,
    maxResults = 20
  ): Promise<EmailMessage[]> {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });
    
    const messages = await Promise.all(
      (response.data.messages || []).map(m => this.getMessage(m.id!))
    );
    
    return messages;
  }
  
  // Get single message
  async getMessage(messageId: string): Promise<EmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    return this.mapMessage(response.data);
  }
  
  // Send email
  async sendEmail(email: SendEmailInput): Promise<void> {
    const message = this.createMimeMessage(email);
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });
  }
  
  // Create draft
  async createDraft(email: SendEmailInput): Promise<string> {
    const message = this.createMimeMessage(email);
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const response = await this.gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw: encodedMessage }
      }
    });
    
    return response.data.id!;
  }
  
  private createMimeMessage(email: SendEmailInput): string {
    const lines = [
      `To: ${email.to}`,
      `Subject: ${email.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      email.body
    ];
    
    if (email.cc) lines.splice(1, 0, `Cc: ${email.cc}`);
    if (email.bcc) lines.splice(1, 0, `Bcc: ${email.bcc}`);
    
    return lines.join('\r\n');
  }
  
  private mapMessage(message: gmail_v1.Schema$Message): EmailMessage {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;
    
    return {
      id: message.id!,
      threadId: message.threadId!,
      from: getHeader('from') || '',
      to: getHeader('to') || '',
      subject: getHeader('subject') || '',
      date: new Date(parseInt(message.internalDate || '0')),
      snippet: message.snippet || '',
      body: this.extractBody(message.payload),
      isRead: !message.labelIds?.includes('UNREAD'),
      labels: message.labelIds || []
    };
  }
  
  private extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return '';
    
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    if (payload.parts) {
      const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
      const part = htmlPart || textPart;
      
      if (part?.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    
    return '';
  }
}
```

### 4.3 AI Email Features

```typescript
// AI-powered email features

// Draft email response
async function draftEmailResponse(
  originalEmail: EmailMessage,
  instructions: string,
  context: AIContext
): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt: `Draft a response to this email:

From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

Instructions: ${instructions}

Context about the sender (if known):
${JSON.stringify(context.relevant?.relatedContacts?.[0] || 'Unknown sender')}

Write a professional email response. Only output the email body, no subject line.`
  });
  
  return text;
}

// Summarize email thread
async function summarizeEmailThread(
  emails: EmailMessage[]
): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt: `Summarize this email thread:

${emails.map(e => `From: ${e.from}\nDate: ${e.date}\n${e.body}`).join('\n\n---\n\n')}

Provide a brief summary of:
1. Main topic
2. Key points discussed
3. Any action items
4. Current status`
  });
  
  return text;
}
```

---

## 5. Slack Integration

### 5.1 Setup

**Slack App Configuration:**

1. Create Slack app at api.slack.com
2. Add OAuth scopes
3. Configure redirect URLs
4. Enable event subscriptions

**Environment Variables:**
```env
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_REDIRECT_URI=http://localhost:3000/api/integrations/slack/callback
```

### 5.2 OAuth Scopes

```typescript
const SLACK_SCOPES = [
  'channels:read',
  'chat:write',
  'users:read',
  'users:read.email',
  'im:write'
];
```

### 5.3 API Implementation

```typescript
// packages/core/src/integrations/slack/client.ts

import { WebClient } from '@slack/web-api';

export class SlackService {
  private client: WebClient;
  
  constructor(accessToken: string) {
    this.client = new WebClient(accessToken);
  }
  
  // Send direct message
  async sendDirectMessage(userId: string, message: string): Promise<void> {
    // Open DM channel
    const conversation = await this.client.conversations.open({
      users: userId
    });
    
    // Send message
    await this.client.chat.postMessage({
      channel: conversation.channel!.id!,
      text: message
    });
  }
  
  // Send message to channel
  async sendChannelMessage(channelId: string, message: string): Promise<void> {
    await this.client.chat.postMessage({
      channel: channelId,
      text: message
    });
  }
  
  // Send rich notification
  async sendNotification(
    userId: string,
    notification: SlackNotification
  ): Promise<void> {
    const conversation = await this.client.conversations.open({
      users: userId
    });
    
    await this.client.chat.postMessage({
      channel: conversation.channel!.id!,
      text: notification.fallbackText,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: notification.title
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: notification.body
          }
        },
        ...(notification.actions ? [{
          type: 'actions',
          elements: notification.actions.map(action => ({
            type: 'button',
            text: {
              type: 'plain_text',
              text: action.label
            },
            url: action.url,
            style: action.style
          }))
        }] : [])
      ]
    });
  }
  
  // Get user by email
  async getUserByEmail(email: string): Promise<SlackUser | null> {
    try {
      const response = await this.client.users.lookupByEmail({ email });
      return {
        id: response.user!.id!,
        name: response.user!.name!,
        realName: response.user!.real_name!,
        email: response.user!.profile?.email
      };
    } catch {
      return null;
    }
  }
  
  // List channels
  async listChannels(): Promise<SlackChannel[]> {
    const response = await this.client.conversations.list({
      types: 'public_channel,private_channel'
    });
    
    return (response.channels || []).map(ch => ({
      id: ch.id!,
      name: ch.name!,
      isPrivate: ch.is_private || false
    }));
  }
}
```

### 5.4 Notification Types

```typescript
// Slack notification templates

const notificationTemplates = {
  meetingReminder: (meeting: Meeting, minutesUntil: number) => ({
    title: '📅 Meeting Reminder',
    body: `*${meeting.title}* starts in ${minutesUntil} minutes\n` +
          `📍 ${meeting.location || 'Virtual'}\n` +
          `🔗 ${meeting.video_conference_url || 'No video link'}`,
    fallbackText: `Meeting "${meeting.title}" starts in ${minutesUntil} minutes`,
    actions: meeting.video_conference_url ? [{
      label: 'Join Meeting',
      url: meeting.video_conference_url,
      style: 'primary'
    }] : []
  }),
  
  taskOverdue: (task: Task) => ({
    title: '⏰ Task Overdue',
    body: `*${task.title}* was due ${formatRelativeTime(task.due_date)}\n` +
          `Priority: ${task.priority}`,
    fallbackText: `Task "${task.title}" is overdue`,
    actions: [{
      label: 'View Task',
      url: `${process.env.APP_URL}/tasks/todo?task=${task.id}`
    }]
  }),
  
  approvalPending: (approval: Approval) => ({
    title: '📋 Approval Needed',
    body: `*${approval.title}*\n` +
          `Type: ${approval.approval_type}\n` +
          (approval.amount ? `Amount: $${approval.amount}` : ''),
    fallbackText: `Approval needed: ${approval.title}`,
    actions: [
      {
        label: 'Approve',
        url: `${process.env.APP_URL}/tasks/approvals?id=${approval.id}&action=approve`,
        style: 'primary'
      },
      {
        label: 'View Details',
        url: `${process.env.APP_URL}/tasks/approvals?id=${approval.id}`
      }
    ]
  }),
  
  aiInsight: (insight: AIInsight) => ({
    title: `${getPriorityEmoji(insight.priority)} AI Insight`,
    body: `*${insight.title}*\n${insight.description}`,
    fallbackText: insight.title,
    actions: insight.suggested_actions?.slice(0, 2).map(action => ({
      label: action.label,
      url: `${process.env.APP_URL}/api/ai/action?type=${action.action_type}&payload=${encodeURIComponent(JSON.stringify(action.payload))}`
    }))
  })
};
```

### 5.5 API Routes

```typescript
// apps/web/src/app/api/integrations/slack/route.ts

export async function GET(req: Request) {
  const authUrl = `https://slack.com/oauth/v2/authorize?` +
    new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      scope: SLACK_SCOPES.join(','),
      redirect_uri: process.env.SLACK_REDIRECT_URI!
    });
  
  return NextResponse.redirect(authUrl);
}

// apps/web/src/app/api/integrations/slack/callback/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code: code!,
      redirect_uri: process.env.SLACK_REDIRECT_URI!
    })
  });
  
  const data = await response.json();
  
  // Save integration
  await supabase.from('integrations').insert({
    user_id: currentUser.id,
    org_id: currentUser.org_id,
    provider: 'slack',
    integration_type: 'messaging',
    access_token: data.access_token,
    scopes: data.scope?.split(','),
    provider_user_id: data.authed_user?.id,
    status: 'active',
    settings: {
      team_id: data.team?.id,
      team_name: data.team?.name
    }
  });
  
  return NextResponse.redirect('/settings?tab=integrations&success=slack');
}
```

---

## 6. Integration Management

### 6.1 Integration Service

```typescript
// packages/core/src/integrations/integration-service.ts

export class IntegrationService {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  // Get user's integrations
  async getUserIntegrations(userId: string): Promise<Integration[]> {
    const { data } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    return data || [];
  }
  
  // Get integration by provider
  async getIntegration(
    userId: string,
    provider: string,
    type: string
  ): Promise<Integration | null> {
    const { data } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('integration_type', type)
      .eq('status', 'active')
      .single();
    
    return data;
  }
  
  // Refresh token
  async refreshToken(integration: Integration): Promise<IntegrationTokens> {
    switch (integration.provider) {
      case 'google':
        return this.refreshGoogleToken(integration);
      case 'microsoft':
        return this.refreshMicrosoftToken(integration);
      default:
        throw new Error(`Unknown provider: ${integration.provider}`);
    }
  }
  
  // Disconnect integration
  async disconnect(integrationId: string): Promise<void> {
    await this.supabase
      .from('integrations')
      .update({ status: 'revoked' })
      .eq('id', integrationId);
    
    // Clean up synced data
    await this.cleanupSyncedData(integrationId);
  }
  
  private async refreshGoogleToken(integration: Integration): Promise<IntegrationTokens> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      refresh_token: integration.refresh_token
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    const tokens = {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || integration.refresh_token,
      token_expires_at: new Date(credentials.expiry_date!),
      scopes: integration.scopes
    };
    
    await this.supabase
      .from('integrations')
      .update(tokens)
      .eq('id', integration.id);
    
    return tokens;
  }
  
  private async refreshMicrosoftToken(integration: Integration): Promise<IntegrationTokens> {
    const response = await fetch(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: integration.refresh_token!,
          grant_type: 'refresh_token'
        })
      }
    );
    
    const data = await response.json();
    
    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || integration.refresh_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ')
    };
    
    await this.supabase
      .from('integrations')
      .update(tokens)
      .eq('id', integration.id);
    
    return tokens;
  }
}
```

---

## 7. Sync Architecture

### 7.1 Calendar Sync Flow

```
┌─────────────────┐
│  Sync Trigger   │
│  (Cron/Webhook) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get Integration │
│ & Refresh Token │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Events    │
│ (with syncToken)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process Changes │
│ Insert/Update/  │
│ Delete locally  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update syncToken│
│ & last_synced_at│
└─────────────────┘
```

### 7.2 Sync Implementation

```typescript
// packages/core/src/integrations/sync/calendar-sync.ts

export class CalendarSyncService {
  async syncCalendar(integration: Integration): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };
    
    try {
      // Ensure valid token
      const token = await integrationService.ensureValidToken(integration);
      
      // Get calendar service
      const calendarService = this.getCalendarService(integration.provider, token);
      
      // Get sync tokens for each calendar
      const syncTokens = await this.getSyncTokens(integration.id);
      
      for (const syncToken of syncTokens) {
        if (!syncToken.is_enabled) continue;
        
        // Fetch events
        const { events, nextSyncToken } = await calendarService.getEvents(
          syncToken.calendar_id,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
          syncToken.sync_token
        );
        
        // Process each event
        for (const event of events) {
          try {
            await this.processEvent(event, integration, syncToken);
            if (event.status === 'cancelled') {
              result.deleted++;
            } else {
              const existing = await this.findExistingMeeting(
                integration.org_id,
                integration.provider,
                event.id
              );
              if (existing) {
                result.updated++;
              } else {
                result.created++;
              }
            }
          } catch (error) {
            result.errors.push({
              eventId: event.id,
              error: error.message
            });
          }
        }
        
        // Update sync token
        await this.updateSyncToken(syncToken.id, nextSyncToken);
      }
      
      // Update integration last_synced_at
      await this.updateLastSynced(integration.id);
      
    } catch (error) {
      result.errors.push({ error: error.message });
    }
    
    return result;
  }
  
  private async processEvent(
    event: CalendarEvent,
    integration: Integration,
    syncToken: CalendarSyncToken
  ): Promise<void> {
    const existingMeeting = await this.findExistingMeeting(
      integration.org_id,
      integration.provider,
      event.id
    );
    
    if (event.status === 'cancelled') {
      if (existingMeeting) {
        await supabase
          .from('meetings')
          .update({ deleted_at: new Date() })
          .eq('id', existingMeeting.id);
      }
      return;
    }
    
    const meetingData = {
      org_id: integration.org_id,
      title: event.title,
      description: event.description,
      start_time: event.start,
      end_time: event.end,
      timezone: event.timezone || 'UTC',
      is_all_day: event.isAllDay,
      location: event.location,
      location_type: event.videoConferenceUrl ? 'virtual' : 
                     event.location ? 'in_person' : 'virtual',
      video_conference_url: event.videoConferenceUrl,
      attendees: event.attendees,
      external_calendar_id: syncToken.calendar_id,
      external_event_id: event.id,
      external_calendar_provider: integration.provider,
      last_synced_at: new Date()
    };
    
    if (existingMeeting) {
      await supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', existingMeeting.id);
    } else {
      await supabase
        .from('meetings')
        .insert({
          ...meetingData,
          created_by: integration.user_id
        });
    }
  }
}
```

### 7.3 Bidirectional Sync

```typescript
// When local meeting is created/updated, sync to external calendar
async function syncMeetingToExternal(meeting: Meeting): Promise<void> {
  if (!meeting.external_calendar_id) {
    // New meeting - need to create in external calendar
    const integration = await getDefaultCalendarIntegration(meeting.created_by);
    if (!integration) return;
    
    const calendarService = getCalendarService(integration);
    const externalEvent = await calendarService.createEvent(
      integration.settings.default_calendar_id,
      {
        title: meeting.title,
        description: meeting.description,
        start: meeting.start_time,
        end: meeting.end_time,
        timezone: meeting.timezone,
        location: meeting.location,
        attendees: meeting.attendees,
        createVideoConference: meeting.location_type === 'virtual'
      }
    );
    
    // Update local meeting with external IDs
    await supabase
      .from('meetings')
      .update({
        external_calendar_id: integration.settings.default_calendar_id,
        external_event_id: externalEvent.id,
        external_calendar_provider: integration.provider,
        video_conference_url: externalEvent.videoConferenceUrl
      })
      .eq('id', meeting.id);
  } else {
    // Existing meeting - update external
    const integration = await getIntegrationByProvider(
      meeting.created_by,
      meeting.external_calendar_provider
    );
    if (!integration) return;
    
    const calendarService = getCalendarService(integration);
    await calendarService.updateEvent(
      meeting.external_calendar_id,
      meeting.external_event_id,
      {
        title: meeting.title,
        description: meeting.description,
        start: meeting.start_time,
        end: meeting.end_time,
        timezone: meeting.timezone,
        location: meeting.location
      }
    );
  }
}
```

---

**Next Document: API_ROUTES.md** - Complete API endpoint specifications.
