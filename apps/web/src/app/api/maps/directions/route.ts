/**
 * Google Maps Directions API Route
 * Calculates routes and travel times between multiple locations
 * 
 * In production, this will call a Supabase Edge Function
 * In development, it can call Google Maps API directly or use mock data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DirectionsRequest {
  locations: string[]; // Array of addresses or coordinates
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  departure_time?: string; // ISO timestamp for traffic prediction
}

interface RouteSegment {
  origin: string;
  destination: string;
  duration_seconds: number;
  duration_text: string;
  distance_meters: number;
  distance_text: string;
  traffic_condition?: 'light' | 'moderate' | 'heavy' | 'severe';
}

interface DirectionsResponse {
  routes: RouteSegment[];
  total_duration: string;
  total_distance: string;
  total_duration_seconds: number;
  total_distance_meters: number;
}

// Helper to format duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

// Helper to format distance
function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

// Call Google Maps Directions API
async function getGoogleDirections(
  origin: string,
  destination: string,
  apiKey: string,
  departureTime?: Date
): Promise<RouteSegment | null> {
  try {
    const params = new URLSearchParams({
      origin,
      destination,
      key: apiKey,
      mode: 'driving',
      units: 'imperial',
    });

    // Add departure time for traffic prediction
    if (departureTime) {
      params.append('departure_time', Math.floor(departureTime.getTime() / 1000).toString());
      params.append('traffic_model', 'best_guess');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );

    if (!response.ok) {
      console.error('Google Maps API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) {
      console.error('Google Maps API returned no routes:', data.status);
      return null;
    }

    const leg = data.routes[0].legs[0];
    
    // Determine traffic condition based on duration vs duration_in_traffic
    let trafficCondition: 'light' | 'moderate' | 'heavy' | 'severe' = 'light';
    const baseDuration = leg.duration?.value || 0;
    const trafficDuration = leg.duration_in_traffic?.value || baseDuration;
    
    if (trafficDuration > baseDuration * 1.5) {
      trafficCondition = 'severe';
    } else if (trafficDuration > baseDuration * 1.3) {
      trafficCondition = 'heavy';
    } else if (trafficDuration > baseDuration * 1.1) {
      trafficCondition = 'moderate';
    }

    return {
      origin: leg.start_address || origin,
      destination: leg.end_address || destination,
      duration_seconds: trafficDuration,
      duration_text: formatDuration(trafficDuration),
      distance_meters: leg.distance?.value || 0,
      distance_text: leg.distance?.text || formatDistance(leg.distance?.value || 0),
      traffic_condition: trafficCondition,
    };
  } catch (error) {
    console.error('Error calling Google Maps API:', error);
    return null;
  }
}

// Generate mock route data for development/testing
function getMockRoute(origin: string, destination: string, index: number): RouteSegment {
  // Generate somewhat realistic mock data
  const baseDuration = 900 + (index * 300) + Math.floor(Math.random() * 600); // 15-35 min base
  const baseDistance = 8000 + (index * 3000) + Math.floor(Math.random() * 5000); // 5-15 miles
  
  const trafficConditions: Array<'light' | 'moderate' | 'heavy' | 'severe'> = ['light', 'moderate', 'heavy'];
  const trafficCondition = trafficConditions[Math.floor(Math.random() * 3)];
  
  // Add traffic delay
  const trafficMultiplier = trafficCondition === 'heavy' ? 1.4 : trafficCondition === 'moderate' ? 1.2 : 1;
  const duration = Math.floor(baseDuration * trafficMultiplier);

  return {
    origin,
    destination,
    duration_seconds: duration,
    duration_text: formatDuration(duration),
    distance_meters: baseDistance,
    distance_text: formatDistance(baseDistance),
    traffic_condition: trafficCondition,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body: DirectionsRequest = await request.json();
    const { locations, departure_time } = body;

    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return NextResponse.json(
        { error: { message: 'At least 2 locations are required' } },
        { status: 400 }
      );
    }

    const routes: RouteSegment[] = [];
    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;

    // Get Google Maps API key from environment
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const departureDate = departure_time ? new Date(departure_time) : new Date();

    // Calculate routes between consecutive locations
    for (let i = 0; i < locations.length - 1; i++) {
      const origin = locations[i];
      const destination = locations[i + 1];

      let segment: RouteSegment | null = null;

      // Try Google Maps API if key is available
      if (googleMapsApiKey) {
        segment = await getGoogleDirections(origin, destination, googleMapsApiKey, departureDate);
      }

      // Fall back to mock data if no API key or API call failed
      if (!segment) {
        segment = getMockRoute(origin, destination, i);
      }

      routes.push(segment);
      totalDurationSeconds += segment.duration_seconds;
      totalDistanceMeters += segment.distance_meters;
    }

    const response: DirectionsResponse = {
      routes,
      total_duration: formatDuration(totalDurationSeconds),
      total_distance: formatDistance(totalDistanceMeters),
      total_duration_seconds: totalDurationSeconds,
      total_distance_meters: totalDistanceMeters,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Directions API error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to calculate directions' } },
      { status: 500 }
    );
  }
}
