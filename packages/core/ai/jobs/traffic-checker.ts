/**
 * Traffic Checker
 * Runs periodically to check travel times for upcoming in-person meetings.
 * Creates alerts when traffic conditions require early departure.
 */

import { createAdminClient } from '@jeniferai/core-database';
import { checkTravelTimeBetweenMeetings } from '../modules/traffic-predictor';
import { createInsightWithNotification } from '../handlers/insight-creator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

/**
 * Check traffic for all organizations' upcoming in-person meetings.
 * Designed to run every ~30 minutes.
 */
export async function runTrafficCheck(): Promise<{ orgsProcessed: number; alertsCreated: number }> {
  const supabase: AnySupabase = createAdminClient();
  let alertsCreated = 0;

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('is_active', true);

  if (!orgs || orgs.length === 0) return { orgsProcessed: 0, alertsCreated: 0 };

  for (const org of orgs as Array<{ id: string }>) {
    try {
      const alerts = await checkTrafficForOrg(supabase, org.id);
      alertsCreated += alerts;
    } catch (err) {
      console.error(`[Traffic Check] Failed for org ${org.id}:`, err);
    }
  }

  return { orgsProcessed: orgs.length, alertsCreated };
}

async function checkTrafficForOrg(supabase: AnySupabase, orgId: string): Promise<number> {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Find in-person meetings in the next 2 hours
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, start_time, end_time, location, location_type, executive_id')
    .eq('org_id', orgId)
    .eq('location_type', 'in_person')
    .is('deleted_at', null)
    .gte('start_time', now.toISOString())
    .lte('start_time', twoHoursFromNow.toISOString())
    .not('location', 'is', null)
    .order('start_time', { ascending: true });

  if (!meetings || meetings.length < 2) return 0;

  const travelConflicts = await checkTravelTimeBetweenMeetings(
    meetings as Array<{
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      location?: string | null;
      location_type?: string | null;
    }>
  );

  let alertsCreated = 0;

  for (const tc of travelConflicts) {
    // Check if we already created a similar alert recently (avoid spam)
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('org_id', orgId)
      .eq('insight_type', 'traffic_alert')
      .eq('related_entity_id', tc.meetingB.id)
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) continue; // Already alerted

    const meetingB = meetings.find((m: { id: string }) => m.id === tc.meetingB.id);

    await createInsightWithNotification(supabase, {
      orgId,
      executiveId: meetingB?.executive_id || undefined,
      insightType: 'traffic_alert',
      title: `Traffic Alert: ${tc.meetingA.title} → ${tc.meetingB.title}`,
      description: `Heavy traffic detected. Travel time is ~${tc.travelMinutes} min but only ${tc.gapMinutes} min gap between meetings. Leave by ${new Date(tc.suggestedDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
      priority: tc.deficit > 20 ? 'high' : 'medium',
      confidenceScore: 0.85,
      reasoning: `Real-time traffic: ${tc.trafficCondition} conditions between ${tc.meetingA.location} and ${tc.meetingB.location}`,
      suggestedActions: [
        { action: 'depart', label: `Leave by ${new Date(tc.suggestedDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` },
        { action: 'virtual', label: 'Consider making one meeting virtual' },
      ],
      relatedEntityId: tc.meetingB.id,
      relatedEntityType: 'meeting',
      validUntil: tc.meetingB.startTime,
    }, {
      notificationType: 'traffic_alert',
      title: `Traffic Alert — Leave Soon`,
      body: `~${tc.travelMinutes} min to get from "${tc.meetingA.title}" to "${tc.meetingB.title}". Leave by ${new Date(tc.suggestedDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
      category: 'traffic_alert',
      actionLabel: 'View Calendar',
      actionUrl: `/dashboard/calendar`,
      relatedEntityId: tc.meetingB.id,
      relatedEntityType: 'meeting',
    });

    alertsCreated++;
  }

  return alertsCreated;
}
