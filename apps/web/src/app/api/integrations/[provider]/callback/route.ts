/**
 * Integration OAuth Callback Route
 * GET /api/integrations/[provider]/callback - Handle OAuth callback
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  importMicrosoftCalendarEvents,
  importGoogleCalendarEvents,
} from '@/lib/calendar-sync';

interface RouteParams {
  params: Promise<{ provider: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=missing_params`
    );
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { user_id, org_id, redirect_url } = stateData;

    // Exchange code for tokens based on provider
    let tokens: { access_token: string; refresh_token?: string; expires_in: number };
    let providerEmail: string | undefined;

    if (provider === 'google') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
          grant_type: 'authorization_code',
        }),
      });
      tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      const userInfo = await userInfoResponse.json();
      providerEmail = userInfo.email;
    } else if (provider === 'microsoft') {
      const tokenResponse = await fetch(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
            grant_type: 'authorization_code',
          }),
        }
      );
      tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      providerEmail = userInfo.mail || userInfo.userPrincipalName;
    } else if (provider === 'slack') {
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.SLACK_CLIENT_ID!,
          client_secret: process.env.SLACK_CLIENT_SECRET!,
          redirect_uri: process.env.SLACK_REDIRECT_URI!,
        }),
      });
      const slackData = await tokenResponse.json();
      tokens = {
        access_token: slackData.access_token,
        expires_in: 0, // Slack tokens don't expire
      };
      providerEmail = slackData.authed_user?.email;
    } else if (provider === 'zoom') {
      const credentials = Buffer.from(
        `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
      ).toString('base64');
      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.ZOOM_REDIRECT_URI!,
        }),
      });
      tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      providerEmail = userInfo.email;
    } else {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=unsupported_provider`
      );
    }

    // Store integration in database
    const supabase = await createClient();
    
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const integrationData = {
      org_id,
      user_id,
      provider,
      integration_type: provider === 'slack' ? 'messaging' : provider === 'zoom' ? 'video' : 'calendar',
      status: 'active',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokenExpiresAt,
      provider_email: providerEmail,
      scopes: [],
      settings: {},
    };

    // Upsert integration (unique constraint is on user_id, provider, integration_type)
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert(integrationData, {
        onConflict: 'user_id,provider,integration_type',
      });

    if (dbError) {
      console.error('Error saving integration:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=save_failed`
      );
    }

    // Kick off initial calendar import (fire-and-forget). This is what makes
    // the user's existing Outlook/Google events appear on the dashboard,
    // calendar view, route planner, meeting tracker, and reports.
    if (provider === 'microsoft' || provider === 'google') {
      const runImport = provider === 'microsoft'
        ? importMicrosoftCalendarEvents(user_id, org_id)
        : importGoogleCalendarEvents(user_id, org_id);
      // Don't await — the import can take 5-30s and we don't want to block the
      // redirect. Errors are already logged+stored in `integrations.last_error`.
      runImport.catch((err) => {
        console.error(`[oauth-callback] Initial ${provider} import failed:`, err);
      });
    }

    const separator = redirect_url.includes('?') ? '&' : '?';
    return NextResponse.redirect(`${redirect_url}${separator}success=true`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&error=callback_failed`
    );
  }
}
