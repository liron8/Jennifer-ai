/**
 * Traffic Predictor
 * Wraps Google Maps API for travel time estimation between meetings.
 * Falls back to estimated times when API is unavailable.
 */

export interface TravelEstimate {
  origin: string;
  destination: string;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
  trafficCondition: 'light' | 'moderate' | 'heavy' | 'severe';
  suggestedDeparture?: string;
  isEstimate: boolean;
}

export interface TravelConflict {
  meetingA: { id: string; title: string; endTime: string; location: string };
  meetingB: { id: string; title: string; startTime: string; location: string };
  gapMinutes: number;
  travelMinutes: number;
  deficit: number;
  trafficCondition: string;
  suggestedDeparture: string;
}

/**
 * Predict travel time between two locations using Google Maps or estimates.
 */
export async function predictTravelTime(
  origin: string,
  destination: string,
  departureTime?: Date
): Promise<TravelEstimate> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      return await fetchGoogleMaps(origin, destination, apiKey, departureTime);
    } catch (err) {
      console.error('Google Maps API call failed, using estimate:', err);
    }
  }

  // Fallback: rough estimate (30 min average urban commute)
  return {
    origin,
    destination,
    durationMinutes: 30,
    durationText: '~30 min (estimated)',
    distanceText: 'Unknown',
    trafficCondition: 'moderate',
    isEstimate: true,
  };
}

/**
 * Check if consecutive in-person meetings have enough travel time.
 */
export async function checkTravelTimeBetweenMeetings(
  meetings: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    location?: string | null;
    location_type?: string | null;
  }>
): Promise<TravelConflict[]> {
  const conflicts: TravelConflict[] = [];

  // Filter to in-person meetings with locations, sorted by time
  const inPerson = meetings
    .filter(m => m.location_type === 'in_person' && m.location)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  for (let i = 0; i < inPerson.length - 1; i++) {
    const current = inPerson[i];
    const next = inPerson[i + 1];

    // Skip if same location
    if (current.location === next.location) continue;

    const gapMs = new Date(next.start_time).getTime() - new Date(current.end_time).getTime();
    const gapMinutes = gapMs / (1000 * 60);

    // Only check if gap is less than 2 hours (anything more is likely fine)
    if (gapMinutes > 120) continue;

    const departureTime = new Date(current.end_time);
    const estimate = await predictTravelTime(current.location!, next.location!, departureTime);

    if (estimate.durationMinutes > gapMinutes) {
      // Calculate when they need to leave to arrive on time
      const suggestedDeparture = new Date(
        new Date(next.start_time).getTime() - estimate.durationMinutes * 60 * 1000 - 5 * 60 * 1000 // 5 min buffer
      );

      conflicts.push({
        meetingA: {
          id: current.id,
          title: current.title,
          endTime: current.end_time,
          location: current.location!,
        },
        meetingB: {
          id: next.id,
          title: next.title,
          startTime: next.start_time,
          location: next.location!,
        },
        gapMinutes: Math.round(gapMinutes),
        travelMinutes: estimate.durationMinutes,
        deficit: Math.round(estimate.durationMinutes - gapMinutes),
        trafficCondition: estimate.trafficCondition,
        suggestedDeparture: suggestedDeparture.toISOString(),
      });
    }
  }

  return conflicts;
}

async function fetchGoogleMaps(
  origin: string,
  destination: string,
  apiKey: string,
  departureTime?: Date
): Promise<TravelEstimate> {
  const params = new URLSearchParams({
    origin,
    destination,
    key: apiKey,
    mode: 'driving',
    units: 'imperial',
  });

  if (departureTime) {
    params.append('departure_time', Math.floor(departureTime.getTime() / 1000).toString());
    params.append('traffic_model', 'best_guess');
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await response.json();

  if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) {
    throw new Error(`No route found: ${data.status}`);
  }

  const leg = data.routes[0].legs[0];
  const baseDuration = leg.duration?.value || 0;
  const trafficDuration = leg.duration_in_traffic?.value || baseDuration;
  const durationMinutes = Math.ceil(trafficDuration / 60);

  let trafficCondition: 'light' | 'moderate' | 'heavy' | 'severe' = 'light';
  if (trafficDuration > baseDuration * 1.5) trafficCondition = 'severe';
  else if (trafficDuration > baseDuration * 1.3) trafficCondition = 'heavy';
  else if (trafficDuration > baseDuration * 1.1) trafficCondition = 'moderate';

  return {
    origin: leg.start_address || origin,
    destination: leg.end_address || destination,
    durationMinutes,
    durationText: formatDuration(trafficDuration),
    distanceText: leg.distance?.text || 'Unknown',
    trafficCondition,
    isEstimate: false,
  };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}
