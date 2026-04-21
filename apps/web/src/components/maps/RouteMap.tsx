"use client";

/**
 * RouteMap Component
 * Displays an interactive Google Map with route visualization and location pins
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface RouteLocation {
  address: string;
  label: string;
  type: "home" | "client" | "personal" | "internal";
  order: number;
}

interface RouteMapProps {
  locations: RouteLocation[];
  className?: string;
}

// Color mapping for different location types
const markerColors: Record<string, string> = {
  home: "#10B981", // green
  client: "#8B5CF6", // purple
  personal: "#F97316", // orange
  internal: "#3B82F6", // blue
};

// Load Google Maps script dynamically
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof google !== "undefined" && google.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    // Create and load script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
};

export function RouteMap({ locations, className = "" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Error loading Google Maps:", err);
        setError("Failed to load Google Maps");
      });
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    // Default center on San Diego
    const defaultCenter = { lat: 32.7157, lng: -117.1611 };

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    const renderer = new google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: true, // We'll add custom markers
      polylineOptions: {
        strokeColor: "#6366F1",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    setMap(mapInstance);
    setDirectionsRenderer(renderer);
  }, [isLoaded, map]);

  // Create custom marker
  const createMarker = useCallback(
    (
      position: google.maps.LatLng,
      label: string,
      type: string,
      order: number,
      mapInstance: google.maps.Map
    ) => {
      const color = markerColors[type] || markerColors.internal;
      
      // Create custom marker icon
      const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
        scale: 12,
      };

      const marker = new google.maps.Marker({
        position,
        map: mapInstance,
        icon: markerIcon,
        label: {
          text: type === "home" ? "H" : String(order),
          color: "#FFFFFF",
          fontSize: "11px",
          fontWeight: "bold",
        },
        title: label,
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <p style="font-weight: 600; margin: 0 0 4px 0; color: #111827;">${label}</p>
            <p style="font-size: 12px; color: #6B7280; margin: 0;">
              ${type === "home" ? "Start/End Point" : `Stop ${order}`}
            </p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance, marker);
      });

      return marker;
    },
    []
  );

  // Calculate and display route
  useEffect(() => {
    if (!map || !directionsRenderer || locations.length < 2) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const directionsService = new google.maps.DirectionsService();

    // Build waypoints (exclude first and last which are origin/destination)
    const waypoints = locations.slice(1, -1).map((loc) => ({
      location: loc.address,
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: locations[0].address,
      destination: locations[locations.length - 1].address,
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false, // Keep user's order
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRenderer.setDirections(result);

        // Add custom markers at each location
        const route = result.routes[0];
        const legs = route.legs;

        // Add start marker (home)
        if (legs[0]?.start_location) {
          const marker = createMarker(
            legs[0].start_location,
            locations[0].label,
            locations[0].type,
            0,
            map
          );
          markersRef.current.push(marker);
        }

        // Add intermediate markers
        legs.forEach((leg, index) => {
          if (leg.end_location && index < locations.length - 1) {
            const locIndex = index + 1;
            const marker = createMarker(
              leg.end_location,
              locations[locIndex].label,
              locations[locIndex].type,
              locIndex,
              map
            );
            markersRef.current.push(marker);
          }
        });

        // Fit bounds to show entire route
        const bounds = new google.maps.LatLngBounds();
        route.legs.forEach((leg) => {
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
        });
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      } else {
        console.error("Directions request failed:", status);
        setError("Could not calculate route");
      }
    });

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [map, directionsRenderer, locations, createMarker]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center p-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-gray-500 mt-2">
            Please check your Google Maps API configuration
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
