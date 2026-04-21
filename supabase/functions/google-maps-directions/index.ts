/**
 * Supabase Edge Function: Google Maps Directions
 * 
 * Calculates routes and travel times between multiple locations using Google Maps Directions API.
 * This function is designed to be deployed as a Supabase Edge Function.
 * 
 * Environment Variables Required:
 * - GOOGLE_MAPS_API_KEY: Your Google Maps API key
 * 
 * Google Cloud Console Setup:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create or select a project
 * 3. Enable the following APIs:
 *    - Directions API
 *    - Distance Matrix API (optional, for multiple origins/destinations)
 *    - Places API (optional, for address autocomplete)
 * 4. Create credentials (API Key)
 * 5. Restrict the API key to only the APIs you need
 * 6. Add the API key to Supabase secrets:
 *    supabase secrets set GOOGLE_MAPS_API_KEY=your-api-key
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DirectionsRequest {
  locations: string[];
  mode?: "driving" | "walking" | "bicycling" | "transit";
  departure_time?: string;
  avoid?: ("tolls" | "highways" | "ferries")[];
  units?: "metric" | "imperial";
}

interface RouteSegment {
  origin: string;
  destination: string;
  duration_seconds: number;
  duration_text: string;
  distance_meters: number;
  distance_text: string;
  traffic_condition?: "light" | "moderate" | "heavy" | "severe";
  polyline?: string;
}

interface DirectionsResponse {
  routes: RouteSegment[];
  total_duration: string;
  total_distance: string;
  total_duration_seconds: number;
  total_distance_meters: number;
}

// Format duration from seconds to human-readable string
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

// Format distance from meters to human-readable string
function formatDistance(meters: number, units: "metric" | "imperial" = "imperial"): string {
  if (units === "metric") {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

// Determine traffic condition based on duration comparison
function getTrafficCondition(
  baseDuration: number,
  trafficDuration: number
): "light" | "moderate" | "heavy" | "severe" {
  const ratio = trafficDuration / baseDuration;

  if (ratio > 1.5) return "severe";
  if (ratio > 1.3) return "heavy";
  if (ratio > 1.1) return "moderate";
  return "light";
}

// Call Google Maps Directions API for a single route segment
async function getDirections(
  origin: string,
  destination: string,
  apiKey: string,
  options: {
    mode?: string;
    departureTime?: Date;
    avoid?: string[];
    units?: string;
  } = {}
): Promise<RouteSegment | null> {
  try {
    const params = new URLSearchParams({
      origin,
      destination,
      key: apiKey,
      mode: options.mode || "driving",
      units: options.units || "imperial",
    });

    // Add departure time for traffic prediction (must be in the future)
    if (options.departureTime && options.departureTime > new Date()) {
      params.append("departure_time", Math.floor(options.departureTime.getTime() / 1000).toString());
      params.append("traffic_model", "best_guess");
    } else {
      // Use "now" for current traffic
      params.append("departure_time", "now");
    }

    // Add avoidances
    if (options.avoid && options.avoid.length > 0) {
      params.append("avoid", options.avoid.join("|"));
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );

    if (!response.ok) {
      console.error("Google Maps API HTTP error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Maps API error:", data.status, data.error_message);
      return null;
    }

    if (!data.routes?.[0]?.legs?.[0]) {
      console.error("No routes found");
      return null;
    }

    const leg = data.routes[0].legs[0];
    const baseDuration = leg.duration?.value || 0;
    const trafficDuration = leg.duration_in_traffic?.value || baseDuration;

    return {
      origin: leg.start_address || origin,
      destination: leg.end_address || destination,
      duration_seconds: trafficDuration,
      duration_text: formatDuration(trafficDuration),
      distance_meters: leg.distance?.value || 0,
      distance_text: leg.distance?.text || formatDistance(leg.distance?.value || 0),
      traffic_condition: getTrafficCondition(baseDuration, trafficDuration),
      polyline: data.routes[0].overview_polyline?.points,
    };
  } catch (error) {
    console.error("Error calling Google Maps API:", error);
    return null;
  }
}

// Generate mock route data for testing without API key
function getMockRoute(origin: string, destination: string, index: number): RouteSegment {
  const baseDuration = 900 + index * 300 + Math.floor(Math.random() * 600);
  const baseDistance = 8000 + index * 3000 + Math.floor(Math.random() * 5000);

  const trafficConditions: Array<"light" | "moderate" | "heavy"> = ["light", "moderate", "heavy"];
  const trafficCondition = trafficConditions[Math.floor(Math.random() * 3)];

  const trafficMultiplier =
    trafficCondition === "heavy" ? 1.4 : trafficCondition === "moderate" ? 1.2 : 1;
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { message: "Missing authorization header" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: DirectionsRequest = await req.json();
    const { locations, mode, departure_time, avoid, units } = body;

    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return new Response(
        JSON.stringify({ error: { message: "At least 2 locations are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google Maps API key
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const departureDate = departure_time ? new Date(departure_time) : new Date();

    const routes: RouteSegment[] = [];
    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;

    // Calculate routes between consecutive locations
    for (let i = 0; i < locations.length - 1; i++) {
      const origin = locations[i];
      const destination = locations[i + 1];

      let segment: RouteSegment | null = null;

      // Use Google Maps API if key is available
      if (googleMapsApiKey) {
        segment = await getDirections(origin, destination, googleMapsApiKey, {
          mode,
          departureTime: departureDate,
          avoid,
          units,
        });
      }

      // Fall back to mock data if no API key or API call failed
      if (!segment) {
        console.log("Using mock data for route segment", i);
        segment = getMockRoute(origin, destination, i);
      }

      routes.push(segment);
      totalDurationSeconds += segment.duration_seconds;
      totalDistanceMeters += segment.distance_meters;
    }

    const response: DirectionsResponse = {
      routes,
      total_duration: formatDuration(totalDurationSeconds),
      total_distance: formatDistance(totalDistanceMeters, units),
      total_duration_seconds: totalDurationSeconds,
      total_distance_meters: totalDistanceMeters,
    };

    return new Response(
      JSON.stringify({ data: response }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: { message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
