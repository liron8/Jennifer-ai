"use client";

/**
 * Route Planner Page
 * Plan and optimize routes for out-of-office meetings with map visualization
 * Features:
 * 1. Real-time traffic condition indicators
 * 2. Dynamic ETA updates with arrival times
 * 3. Drag-to-reorder meetings with route recalculation
 * 4. Smart route optimization
 * 5. Export to Google Maps / Share options
 * 6. Buffer time warnings between meetings
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Truck01,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  HomeLine,
  MarkerPin01,
  NavigationPointer01,
  Route,
  Building07,
  RefreshCw01,
  AlertCircle,
  AlertTriangle,
  Share07,
  Download01,
  Zap,
  CheckCircle,
  XCircle,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Avatar } from "@/components/base/avatar/avatar";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { AddStopSlideout, type StopFormData } from "../_components/add-stop-slideout";
import { useRoutePlanner, useRouteDirections, type RouteMeeting, type RouteInfo, type BufferWarning, type TrafficAlert } from "@/hooks/useDashboard";
import { RouteMap } from "@/components/maps/RouteMap";
import * as Alerts from "@/components/application/alerts/alerts";
import { 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl, 
  downloadICSFile,
  type CalendarEventData 
} from "@/lib/calendar-links";
import { notify } from "@/lib/notifications";
import {
  addDays,
  calculateLeaveByTime,
  fromDateAndTime,
  normalizeAddress,
  resolveStopNote,
  toTimeInputValue,
} from "@/lib/route-planner";

// Meeting location type for display
interface MeetingLocation {
  id: string;
  title: string;
  address: string;
  meetingStartLabel: string;
  meetingEndLabel: string;
  startTime: Date;
  endTime: Date;
  duration: string;
  type: "client" | "personal" | "internal";
  driveTime?: string;
  distance?: string;
  trafficCondition?: 'light' | 'moderate' | 'heavy' | 'severe';
  arrivalTime?: Date;
  leaveByTime?: Date;
  bufferMinutes: number;
  hasBufferWarning?: boolean;
  notes?: string;
  stopKind?: "meeting" | "meal" | "quick_stop";
  mealType?: string;
}

// Helper to format time from ISO string
const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

// Helper to calculate duration
const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}.${Math.round(mins / 6)} hr` : `${hours} hr`;
};

// Map API meeting to display format
const mapMeetingToLocation = (
  meeting: RouteMeeting, 
  routeInfo?: RouteInfo,
  arrivalTime?: Date,
  hasBufferWarning?: boolean,
  bufferMinutes: number = 0,
  leaveByTime?: Date
): MeetingLocation => {
  // Map meeting_type to display type
  const typeMap: Record<string, "client" | "personal" | "internal"> = {
    external: "client",
    client: "client",
    internal: "internal",
    team: "internal",
    one_on_one: "internal",
    interview: "client",
    other: "personal",
  };

  return {
    id: meeting.id,
    title: meeting.title,
    address: meeting.location || meeting.location_details || "Address not specified",
    meetingStartLabel: formatTime(meeting.start_time),
    meetingEndLabel: formatTime(meeting.end_time),
    startTime: new Date(meeting.start_time),
    endTime: new Date(meeting.end_time),
    duration: calculateDuration(meeting.start_time, meeting.end_time),
    type: typeMap[meeting.meeting_type] || "internal",
    driveTime: routeInfo?.duration_text,
    distance: routeInfo?.distance_text,
    trafficCondition: routeInfo?.traffic_condition,
    arrivalTime,
    leaveByTime,
    bufferMinutes,
    hasBufferWarning,
    notes: resolveStopNote(meeting.description, meeting.metadata),
    stopKind:
      typeof meeting.metadata?.stop_kind === "string"
        ? (meeting.metadata.stop_kind as "meeting" | "meal" | "quick_stop")
        : "meeting",
    mealType:
      typeof meeting.metadata?.meal_type === "string"
        ? String(meeting.metadata.meal_type)
        : undefined,
  };
};

// Traffic condition color mapping
const getTrafficColor = (condition?: string) => {
  switch (condition) {
    case 'light': return 'text-emerald-500';
    case 'moderate': return 'text-yellow-500';
    case 'heavy': return 'text-orange-500';
    case 'severe': return 'text-red-500';
    default: return 'text-emerald-500';
  }
};

const getTrafficBgColor = (condition?: string) => {
  switch (condition) {
    case 'light': return 'bg-emerald-100 dark:bg-emerald-900/30';
    case 'moderate': return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'heavy': return 'bg-orange-100 dark:bg-orange-900/30';
    case 'severe': return 'bg-red-100 dark:bg-red-900/30';
    default: return 'bg-gray-100 dark:bg-gray-800';
  }
};

const getTrafficLabel = (condition?: string) => {
  switch (condition) {
    case 'light': return '🟢 Light traffic';
    case 'moderate': return '🟡 Moderate traffic';
    case 'heavy': return '🟠 Heavy traffic';
    case 'severe': return '🔴 Severe traffic';
    default: return '';
  }
};

const getTypeColor = (type: MeetingLocation["type"]) => {
  switch (type) {
    case "client":
      return "purple";
    case "personal":
      return "orange";
    case "internal":
      return "blue";
    default:
      return "gray";
  }
};

export default function RoutePlannerPage() {
  const [defaultHomeLocation, setDefaultHomeLocation] = useState("Loading...");
  const [startLocation, setStartLocation] = useState("Loading...");
  const [favoriteLocations, setFavoriteLocations] = useState<Array<{ label: string; address: string }>>([]);
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [startLocationInput, setStartLocationInput] = useState("");

  // Date state - default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [isQuickStopsOpen, setIsQuickStopsOpen] = useState(false);
  const [meetingOrder, setMeetingOrder] = useState<string[]>([]);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);
  const [meetingStartOverrides, setMeetingStartOverrides] = useState<Record<string, string>>({});
  const [stopBuffers, setStopBuffers] = useState<Record<string, number>>({});
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  
  // Departure time state - default to 8:30 AM on selected date
  const [departureTime, setDepartureTime] = useState<Date>(() => {
    const today = new Date();
    today.setHours(8, 30, 0, 0);
    return today;
  });

  useEffect(() => {
    async function fetchDefaultStartLocation() {
      let resolvedHome: string | null = null;
      let resolvedOffice: string | null = null;
      let resolvedGym: string | null = null;
      try {
        const profileRes = await fetch("/api/settings/profile");
        if (profileRes.ok) {
          const profileResult = await profileRes.json();
          const profile = profileResult.data?.data ?? profileResult.data ?? {};
          const profileHome = normalizeAddress(profile.home_address);
          const settings = (profile.settings || {}) as Record<string, unknown>;
          const routeSettings = (settings.route_planner || {}) as Record<string, unknown>;
          const favorites = (routeSettings.favorite_locations || {}) as Record<string, unknown>;
          resolvedHome = profileHome || normalizeAddress(favorites.home);
          resolvedOffice = normalizeAddress(profile.office_address) || normalizeAddress(favorites.office);
          resolvedGym = normalizeAddress(favorites.gym);
        }
      } catch {
        // no-op fallback below
      }

      if (!resolvedHome || !resolvedOffice) {
        try {
          const response = await fetch("/api/executives?page_size=1");
          if (response.ok) {
            const result = await response.json();
            const executives = result.data?.data ?? result.data ?? [];
            if (Array.isArray(executives) && executives.length > 0) {
              const exec = executives[0];
              resolvedHome = resolvedHome || normalizeAddress(exec.home_address);
              resolvedOffice =
                resolvedOffice ||
                normalizeAddress(exec.office_address) ||
                normalizeAddress(exec.main_office_location);
            }
          }
        } catch {
          // no-op
        }
      }

      const homeAddress = resolvedHome || "Home address not set — update in Settings > Profile";
      setDefaultHomeLocation(homeAddress);
      setStartLocation(homeAddress);
      setStartLocationInput(homeAddress);

      const nextFavorites = [
        homeAddress && !homeAddress.startsWith("Home address not set")
          ? { label: "Home", address: homeAddress }
          : null,
        resolvedOffice ? { label: "Office", address: resolvedOffice } : null,
        resolvedGym ? { label: "Gym", address: resolvedGym } : null,
      ].filter((item): item is { label: string; address: string } => Boolean(item));
      setFavoriteLocations(nextFavorites);
    }
    fetchDefaultStartLocation();
  }, []);

  const endLocation = defaultHomeLocation;

  // Fetch in-person meetings for the selected date
  const { meetings: apiMeetings, isLoading, error, refetch } = useRoutePlanner(selectedDate);
  
  // Route directions hook - enhanced with all features
  const { 
    routes, 
    totalDuration, 
    totalDistance,
    totalDurationSeconds,
    arrivalTimes,
    bufferWarnings,
    trafficAlerts,
    isLoading: isCalculatingRoutes, 
    calculateRoutes,
    optimizeRoute,
    getGoogleMapsUrl,
  } = useRouteDirections();

  // Initialize meeting order when meetings load
  useEffect(() => {
    if (apiMeetings.length > 0 && meetingOrder.length === 0) {
      setMeetingOrder(apiMeetings.map(m => m.id));
    }
  }, [apiMeetings, meetingOrder.length]);

  // Update departure time when date changes
  useEffect(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const newDeparture = new Date(year, month - 1, day, 8, 30, 0, 0);
    setDepartureTime(newDeparture);
  }, [selectedDate]);

  // Get ordered meetings
  const orderedMeetings = useMemo(() => {
    if (meetingOrder.length === 0) return apiMeetings;
    return meetingOrder
      .map(id => apiMeetings.find(m => m.id === id))
      .filter((m): m is RouteMeeting => m !== undefined);
  }, [apiMeetings, meetingOrder]);

  useEffect(() => {
    const nextNotes: Record<string, string> = {};
    const nextBuffers: Record<string, number> = {};
    const nextOverrides: Record<string, string> = {};
    orderedMeetings.forEach((meeting) => {
      nextNotes[meeting.id] = resolveStopNote(meeting.description, meeting.metadata);
      const metadata = (meeting.metadata || {}) as Record<string, unknown>;
      const buffer = Number(metadata.route_buffer_minutes);
      if (!Number.isNaN(buffer) && buffer > 0) {
        nextBuffers[meeting.id] = buffer;
      }
      nextOverrides[meeting.id] = toTimeInputValue(new Date(meeting.start_time));
    });
    setNoteEdits(nextNotes);
    setStopBuffers((prev) => ({ ...nextBuffers, ...prev }));
    setMeetingStartOverrides((prev) => ({ ...nextOverrides, ...prev }));
  }, [orderedMeetings]);

  // Transform to display format with route info, arrival times, and warnings
  const displayMeetings: MeetingLocation[] = useMemo(() => {
    const warningMeetingIds = new Set(bufferWarnings.map(w => orderedMeetings[w.meetingIndex]?.id));
    
    return orderedMeetings.map((meeting, index) => {
      const routeInfo = routes[index];
      const arrivalTime = arrivalTimes[index];
      const hasWarning = warningMeetingIds.has(meeting.id);
      const startOverride = meetingStartOverrides[meeting.id];
      const effectiveMeetingStart = startOverride
        ? fromDateAndTime(selectedDate, startOverride)
        : new Date(meeting.start_time);
      const bufferMinutes = stopBuffers[meeting.id] ?? 0;
      const leaveBy =
        routeInfo && effectiveMeetingStart
          ? calculateLeaveByTime({
              meetingStart: effectiveMeetingStart,
              travelDurationSeconds: routeInfo.duration_seconds,
              bufferMinutes,
            }).leaveBy
          : undefined;

      const hydrated: RouteMeeting = {
        ...meeting,
        start_time: effectiveMeetingStart.toISOString(),
      };
      return mapMeetingToLocation(hydrated, routeInfo, arrivalTime, hasWarning, bufferMinutes, leaveBy);
    });
  }, [orderedMeetings, routes, arrivalTimes, bufferWarnings, meetingStartOverrides, selectedDate, stopBuffers]);

  // Calculate routes when meetings or departure time change
  useEffect(() => {
    if (orderedMeetings.length > 0) {
      const locations = [
        startLocation,
        ...orderedMeetings.map(m => m.location || "Unknown location"),
        endLocation,
      ];
      calculateRoutes(locations, orderedMeetings, departureTime);
    }
  }, [orderedMeetings, calculateRoutes, startLocation, endLocation, departureTime]);

  // Calculate final arrival time (back home)
  const finalArrivalTime = useMemo(() => {
    if (arrivalTimes.length === 0 || routes.length === 0) return null;
    const lastMeeting = orderedMeetings[orderedMeetings.length - 1];
    if (!lastMeeting) return null;
    
    const lastMeetingEnd = new Date(lastMeeting.end_time);
    const returnTripDuration = routes[routes.length - 1]?.duration_seconds || 0;
    return new Date(lastMeetingEnd.getTime() + returnTripDuration * 1000);
  }, [arrivalTimes, routes, orderedMeetings]);

  // Format selected date for display
  const displayDate = new Date(selectedDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Parse "9:00 AM" + selectedDate into a Date. Returns null if unparseable.
  const parseClockToDate = (dateStr: string, timeStr: string): Date | null => {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeStr.trim());
    if (!m) return null;
    let hours = Number(m[1]);
    const minutes = Number(m[2]);
    const period = m[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  // Parse "30 min" / "1 hr" / "1.5 hr" to minutes.
  const parseDurationToMinutes = (s: string): number => {
    const trimmed = s.trim();
    if (trimmed.endsWith("min")) return Number(trimmed.replace(/\s*min$/, "")) || 30;
    if (trimmed.endsWith("hr")) return Math.round(Number(trimmed.replace(/\s*hr$/, "")) * 60) || 60;
    return 60;
  };

  const handleAddStop = async (stopData: StopFormData) => {
    try {
      const start = parseClockToDate(selectedDate, stopData.time);
      if (!start) {
        notify.error("Invalid time", `Could not parse "${stopData.time}".`);
        return;
      }
      const minutes = parseDurationToMinutes(stopData.duration);
      const end = new Date(start.getTime() + minutes * 60_000);

      // Map the stop's "type" to the meeting_type enum
      const typeToMeetingType: Record<string, 'client' | 'other' | 'internal'> = {
        client: 'client',
        personal: 'other',
        internal: 'internal',
      };

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: stopData.title,
          description: stopData.notes || "",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_all_day: false,
          location_type: "in_person",
          location: stopData.address,
          meeting_type: typeToMeetingType[stopData.type] || "other",
          attendees: [],
          is_recurring: false,
          metadata: { source: "route-planner-add-stop" },
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify.error("Failed to add stop", err.error?.message || "Please try again.");
        return;
      }

      notify.success("Stop added", `"${stopData.title}" has been added to the route.`);
      refetch();
    } catch (err) {
      console.error("Failed to add stop:", err);
      notify.error("Failed to add stop", "An unexpected error occurred.");
    }
  };

  const saveStopNote = useCallback(async (meetingId: string) => {
    const note = noteEdits[meetingId] ?? "";
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: note }),
      });
      if (!res.ok) {
        notify.error("Failed to save note", "Please try again.");
        return;
      }
      notify.success("Note saved", "Stop note updated.");
      refetch();
    } catch {
      notify.error("Failed to save note", "Please try again.");
    }
  }, [noteEdits, refetch]);

  const updateStopBuffer = useCallback(async (meetingId: string, minutes: number) => {
    setStopBuffers((prev) => ({ ...prev, [meetingId]: minutes }));
    try {
      const meeting = orderedMeetings.find((m) => m.id === meetingId);
      const metadata = { ...(meeting?.metadata || {}), route_buffer_minutes: minutes };
      await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metadata }),
      });
    } catch {
      // keep local override even if persistence fails
    }
  }, [orderedMeetings]);

  const updateMeetingStartTime = useCallback(async (meeting: RouteMeeting, timeValue: string) => {
    setMeetingStartOverrides((prev) => ({ ...prev, [meeting.id]: timeValue }));
    const updatedStart = fromDateAndTime(selectedDate, timeValue);
    const originalStart = new Date(meeting.start_time);
    const originalEnd = new Date(meeting.end_time);
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const updatedEnd = new Date(updatedStart.getTime() + durationMs);

    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          start_time: updatedStart.toISOString(),
          end_time: updatedEnd.toISOString(),
        }),
      });
      if (!response.ok) {
        notify.error("Failed to update meeting start", "Please try again.");
        return;
      }
      refetch();
    } catch {
      notify.error("Failed to update meeting start", "Please try again.");
    }
  }, [selectedDate, refetch]);

  const addQuickStop = useCallback(async (label: string, address: string) => {
    const lastMeeting = orderedMeetings[orderedMeetings.length - 1];
    const baseDate = lastMeeting ? new Date(lastMeeting.end_time) : fromDateAndTime(selectedDate, "09:00");
    const start = new Date(baseDate.getTime() + 15 * 60_000);
    const end = new Date(start.getTime() + 30 * 60_000);
    const body = {
      title: `Back to ${label}`,
      description: `${label} quick stop`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_all_day: false,
      location_type: "in_person",
      location: address,
      meeting_type: "other",
      attendees: [],
      is_recurring: false,
      metadata: { source: "route-planner-quick-stop", stop_kind: "quick_stop" },
    };
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify.success("Quick stop added", `Added ${label} to this route.`);
      setIsQuickStopsOpen(false);
      refetch();
      return;
    }
    notify.error("Failed to add quick stop", "Please try again.");
  }, [orderedMeetings, selectedDate, refetch]);

  const addMealStop = useCallback(async (mealType: "breakfast" | "lunch" | "dinner") => {
    const defaults: Record<typeof mealType, { time: string; durationMins: number }> = {
      breakfast: { time: "08:00", durationMins: 30 },
      lunch: { time: "12:30", durationMins: 45 },
      dinner: { time: "18:30", durationMins: 60 },
    };
    const config = defaults[mealType];
    const start = fromDateAndTime(selectedDate, config.time);
    const end = new Date(start.getTime() + config.durationMins * 60_000);
    const locationFallback = favoriteLocations.find((f) => f.label === "Office")?.address || startLocation;

    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: mealType.charAt(0).toUpperCase() + mealType.slice(1),
        description: `${mealType} break`,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_all_day: false,
        location_type: "in_person",
        location: locationFallback,
        meeting_type: "other",
        attendees: [],
        is_recurring: false,
        metadata: { source: "route-planner-meal", stop_kind: "meal", meal_type: mealType },
      }),
    });
    if (res.ok) {
      notify.success("Meal stop added", `${mealType} has been added to the route.`);
      setIsQuickStopsOpen(false);
      refetch();
      return;
    }
    notify.error("Failed to add meal stop", "Please try again.");
  }, [favoriteLocations, selectedDate, startLocation, refetch]);

  const moveMeeting = (index: number, direction: "up" | "down") => {
    const newOrder = [...meetingOrder];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setMeetingOrder(newOrder);
  };

  // Handle route optimization
  const handleOptimizeRoute = useCallback(async () => {
    if (orderedMeetings.length <= 1) return;
    
    const locations = [
      startLocation,
      ...orderedMeetings.map(m => m.location || ""),
      endLocation,
    ];
    
    const optimizedLocations = await optimizeRoute(locations, orderedMeetings);
    
    // Update meeting order based on optimized locations
    const newOrder = orderedMeetings
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map(m => m.id);
    setMeetingOrder(newOrder);
  }, [orderedMeetings, optimizeRoute, startLocation, endLocation]);

  // Generate shareable links
  const googleMapsUrl = useMemo(() => {
    if (orderedMeetings.length === 0) return '';
    const locations = [
      startLocation,
      ...orderedMeetings.map(m => m.location || ""),
      endLocation,
    ];
    return getGoogleMapsUrl(locations);
  }, [orderedMeetings, startLocation, endLocation, getGoogleMapsUrl]);

  // Copy route to clipboard
  const copyRouteToClipboard = useCallback(() => {
    const routeText = [
      `Route for ${displayDate}`,
      `Departure: ${departureTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} from ${startLocation}`,
      '',
      ...displayMeetings.map((m, i) => 
        `${i + 1}. ${m.title}\n   📍 ${m.address}\n   🕐 ${m.meetingStartLabel} (${m.duration})\n   🚗 ${m.driveTime || 'N/A'}\n   ⏱ Leave by ${m.leaveByTime ? m.leaveByTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "N/A"}`
      ),
      '',
      `Total Drive Time: ${totalDuration}`,
      `Total Distance: ${totalDistance}`,
    ].join('\n');
    
    navigator.clipboard.writeText(routeText);
    notify.success('Copied', 'Route copied to clipboard.');
  }, [displayDate, departureTime, startLocation, displayMeetings, totalDuration, totalDistance]);

  // Generate calendar event data for "block travel time" events
  const generateTravelBlockEvents = useCallback((): CalendarEventData[] => {
    const events: CalendarEventData[] = [];
    
    // Create travel block events between meetings
    orderedMeetings.forEach((meeting, index) => {
      const routeInfo = routes[index];
      if (!routeInfo) return;
      
      const meetingStart = new Date(meeting.start_time);
      const travelDurationMs = routeInfo.duration_seconds * 1000;
      const travelStart = new Date(meetingStart.getTime() - travelDurationMs);
      
      // Determine origin name
      const originName = index === 0 ? 'Home' : orderedMeetings[index - 1]?.title || 'Previous Location';
      
      events.push({
        title: `🚗 Travel: ${originName} → ${meeting.title}`,
        description: `Travel time to ${meeting.title}\nDistance: ${routeInfo.distance_text}\nDuration: ${routeInfo.duration_text}`,
        location: meeting.location || '',
        startTime: travelStart,
        endTime: meetingStart,
      });
    });
    
    // Add return trip home
    if (orderedMeetings.length > 0 && routes.length > orderedMeetings.length) {
      const lastMeeting = orderedMeetings[orderedMeetings.length - 1];
      const lastMeetingEnd = new Date(lastMeeting.end_time);
      const returnRoute = routes[routes.length - 1];
      
      if (returnRoute) {
        const returnDurationMs = returnRoute.duration_seconds * 1000;
        events.push({
          title: `🚗 Travel: ${lastMeeting.title} → Home`,
          description: `Return trip home\nDistance: ${returnRoute.distance_text}\nDuration: ${returnRoute.duration_text}`,
          location: startLocation,
          startTime: lastMeetingEnd,
          endTime: new Date(lastMeetingEnd.getTime() + returnDurationMs),
        });
      }
    }
    
    return events;
  }, [orderedMeetings, routes, startLocation]);

  // Add all travel blocks to Google Calendar
  const addToGoogleCalendar = useCallback(() => {
    const events = generateTravelBlockEvents();
    if (events.length === 0) {
      notify.error('No events', 'No travel events to add.');
      return;
    }
    // Open first event, user can add others manually or we open multiple tabs
    events.forEach((event, index) => {
      setTimeout(() => {
        window.open(generateGoogleCalendarUrl(event), '_blank');
      }, index * 500); // Stagger to avoid popup blockers
    });
    setIsCalendarMenuOpen(false);
  }, [generateTravelBlockEvents]);

  // Add all travel blocks to Outlook Calendar
  const addToOutlookCalendar = useCallback(() => {
    const events = generateTravelBlockEvents();
    if (events.length === 0) {
      notify.error('No events', 'No travel events to add.');
      return;
    }
    events.forEach((event, index) => {
      setTimeout(() => {
        window.open(generateOutlookCalendarUrl(event), '_blank');
      }, index * 500);
    });
    setIsCalendarMenuOpen(false);
  }, [generateTravelBlockEvents]);

  // Download ICS file with all travel blocks
  const downloadCalendarFile = useCallback(() => {
    const events = generateTravelBlockEvents();
    if (events.length === 0) {
      notify.error('No events', 'No travel events to download.');
      return;
    }
    // For ICS, we'll create one file per event or a combined one
    events.forEach((event, index) => {
      downloadICSFile(event, `travel_block_${index + 1}.ics`);
    });
    setIsCalendarMenuOpen(false);
  }, [generateTravelBlockEvents]);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Route Planner</h1>
          <p className="text-sm text-tertiary">Optimize travel routes for out-of-office meetings</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-2 py-1.5">
            <button
              onClick={() => {
                setSelectedDate((prev) => addDays(prev, -1));
                setMeetingOrder([]);
              }}
              className="rounded-md p-1 hover:bg-secondary"
              aria-label="Go to previous day"
            >
              <ChevronLeft className="h-4 w-4 text-fg-quaternary" />
            </button>
            <button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setSelectedDate(today);
                setMeetingOrder([]);
              }}
              className="min-w-44 text-sm font-semibold text-primary"
            >
              Today · {displayDate}
            </button>
            <button
              onClick={() => {
                setSelectedDate((prev) => addDays(prev, 1));
                setMeetingOrder([]);
              }}
              className="rounded-md p-1 hover:bg-secondary"
              aria-label="Go to next day"
            >
              <ChevronRight className="h-4 w-4 text-fg-quaternary" />
            </button>
            <label className="ml-1 cursor-pointer rounded-md p-1 hover:bg-secondary" title="Pick date">
              <Calendar className="h-4 w-4 text-fg-quaternary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMeetingOrder([]);
                }}
                className="sr-only"
              />
            </label>
          </div>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button 
            size="md" 
            color="primary" 
            iconLeading={Zap}
            onClick={handleOptimizeRoute}
            disabled={orderedMeetings.length <= 1}
          >
            Optimize Route
          </Button>
        </div>
      </div>

      {/* Alerts Section - Traffic & Buffer Warnings using UntitledUI Alerts */}
      {(trafficAlerts.length > 0 || bufferWarnings.length > 0) && (
        <div className="space-y-3">
          {/* Traffic Alerts */}
          {trafficAlerts
            .filter((_, index) => !dismissedAlerts.has(`traffic-${index}`))
            .map((alert, index) => {
              const alertKey = `traffic-${index}`;
              const isError = alert.condition === 'severe';
              return (
                <div 
                  key={alertKey}
                  className={`rounded-xl border ${
                    isError 
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800' 
                      : 'bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-800'
                  }`}
                >
                  <Alerts.AlertFloating
                    color={isError ? 'error' : 'warning'}
                    title={`Heavy traffic on route to ${alert.to.split(',')[0]}`}
                    description={`Estimated delay: +${alert.delayMinutes} min`}
                    confirmLabel="View route"
                    dismissLabel="Dismiss"
                    onClose={() => setDismissedAlerts(prev => new Set([...prev, alertKey]))}
                  />
                </div>
              );
            })}
          
          {/* Buffer Warnings */}
          {bufferWarnings
            .filter((_, index) => !dismissedAlerts.has(`buffer-${index}`))
            .map((warning, index) => {
              const alertKey = `buffer-${index}`;
              const isError = warning.severity === 'critical';
              return (
                <div 
                  key={alertKey}
                  className={`rounded-xl border ${
                    isError 
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800' 
                      : 'bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-800'
                  }`}
                >
                  <Alerts.AlertFloating
                    color={isError ? 'error' : 'warning'}
                    title={`Only ${Math.max(0, warning.availableBuffer)} min buffer before "${warning.meetingTitle}"`}
                    description={`Recommended: ${warning.requiredBuffer} min buffer between meetings`}
                    confirmLabel="Adjust schedule"
                    dismissLabel="Dismiss"
                    onClose={() => setDismissedAlerts(prev => new Set([...prev, alertKey]))}
                  />
                </div>
              );
            })}
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left - Meeting List */}
        <div className="flex flex-col gap-4">
          {/* Start Location with Departure Time Picker */}
          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50/20 to-emerald-100/5 p-4 shadow-sm dark:border-gray-800 dark:from-emerald-950/10 dark:to-emerald-900/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shadow-sm dark:bg-emerald-900/50">
              <HomeLine className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Start: Home</p>
              {isEditingStart ? (
                <input
                  value={startLocationInput}
                  onChange={(e) => setStartLocationInput(e.target.value)}
                  onBlur={() => {
                    const next = startLocationInput.trim() || defaultHomeLocation;
                    setStartLocation(next);
                    setStartLocationInput(next);
                    setIsEditingStart(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = startLocationInput.trim() || defaultHomeLocation;
                      setStartLocation(next);
                      setStartLocationInput(next);
                      setIsEditingStart(false);
                    } else if (e.key === "Escape") {
                      setStartLocationInput(startLocation);
                      setIsEditingStart(false);
                    }
                  }}
                  autoFocus
                  list="route-planner-favorites"
                  className="w-full rounded-md border border-secondary bg-primary px-2 py-1 text-xs text-gray-700 dark:text-gray-300"
                />
              ) : (
                <button
                  onClick={() => setIsEditingStart(true)}
                  className="text-left text-xs text-gray-600 underline decoration-dotted underline-offset-4 dark:text-gray-400"
                  title="Edit start location for this plan"
                >
                  {startLocation}
                </button>
              )}
              <datalist id="route-planner-favorites">
                {favoriteLocations.map((favorite) => (
                  <option key={favorite.label} value={favorite.address}>
                    {favorite.label}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="text-right">
              <div className="mb-1 flex items-center justify-end gap-1">
                <p className="text-xs text-gray-500">Est. daily departure</p>
                <Tooltip
                  title="Typical morning departure time from home. Adjust for this day if needed."
                  placement="top"
                  arrow
                >
                  <TooltipTrigger aria-label="Departure time help">
                    <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                  </TooltipTrigger>
                </Tooltip>
              </div>
              <input
                type="time"
                value={`${String(departureTime.getHours()).padStart(2, '0')}:${String(departureTime.getMinutes()).padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const newDeparture = new Date(departureTime);
                  newDeparture.setHours(hours, minutes, 0, 0);
                  setDepartureTime(newDeparture);
                }}
                className="text-base font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-none outline-none cursor-pointer text-right w-24"
              />
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && displayMeetings.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw01 className="h-6 w-6 animate-spin text-brand-500" />
              <span className="ml-2 text-sm text-tertiary">Loading meetings...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && displayMeetings.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <MarkerPin01 className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <h3 className="mt-3 text-sm font-medium text-primary">No in-person meetings</h3>
              <p className="mt-1 text-xs text-tertiary">No out-of-office meetings scheduled for {displayDate}</p>
            </div>
          )}

          {/* Meetings List */}
          <div className="space-y-3">
            {displayMeetings.map((meeting, index) => {
              const typeColors: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
                client: { bg: "from-purple-50/20 to-purple-100/5 dark:from-purple-950/10 dark:to-purple-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400" },
                personal: { bg: "from-orange-50/20 to-orange-100/5 dark:from-orange-950/10 dark:to-orange-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400" },
                internal: { bg: "from-blue-50/20 to-blue-100/5 dark:from-blue-950/10 dark:to-blue-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
              };
              const colors = typeColors[meeting.type] || typeColors.internal;
              
              return (
                <div key={meeting.id}>
                  {/* Drive Time Indicator with Traffic Condition */}
                  <div className="flex items-center gap-3 py-2 pl-6">
                    <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-800" />
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${getTrafficBgColor(meeting.trafficCondition)}`}>
                      <Truck01 className={`h-4 w-4 ${getTrafficColor(meeting.trafficCondition)}`} />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {meeting.driveTime} • {meeting.distance}
                      </span>
                      {meeting.trafficCondition && meeting.trafficCondition !== 'light' && (
                        <span className={`text-xs font-medium ${getTrafficColor(meeting.trafficCondition)}`}>
                          • {meeting.trafficCondition}
                        </span>
                      )}
                    </div>
                    {/* Arrival Time Badge */}
                    {meeting.arrivalTime && (
                      <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-900/30">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          Arrive: {meeting.arrivalTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meeting Card */}
                  <div className={`group flex items-start gap-4 rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${colors.bg} ${colors.border} ${meeting.hasBufferWarning ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${colors.icon} ${meeting.hasBufferWarning ? 'ring-2 ring-amber-400' : ''}`}>
                        {index + 1}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveMeeting(index, "up")}
                          disabled={index === 0}
                          className="rounded-lg p-1 hover:bg-white/60 dark:hover:bg-gray-800/60 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => moveMeeting(index, "down")}
                          disabled={index === displayMeetings.length - 1}
                          className="rounded-lg p-1 hover:bg-white/60 dark:hover:bg-gray-800/60 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{meeting.title}</p>
                          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60 w-fit">
                            <MarkerPin01 className="h-3.5 w-3.5 text-amber-500" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">{meeting.address}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${colors.badge}`}>
                          {meeting.type}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Meeting start</span>
                            <input
                              type="time"
                              value={meetingStartOverrides[meeting.id] || toTimeInputValue(meeting.startTime)}
                              onChange={(e) => setMeetingStartOverrides((prev) => ({ ...prev, [meeting.id]: e.target.value }))}
                              onBlur={() => {
                                const sourceMeeting = orderedMeetings.find((m) => m.id === meeting.id);
                                if (sourceMeeting) {
                                  void updateMeetingStartTime(sourceMeeting, meetingStartOverrides[meeting.id] || toTimeInputValue(meeting.startTime));
                                }
                              }}
                              className="rounded border border-secondary bg-primary px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{meeting.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 dark:bg-amber-900/30">
                          <span className="text-xs text-amber-700 dark:text-amber-400">
                            {meeting.leaveByTime
                              ? `Leave by ${meeting.leaveByTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} to arrive by ${meeting.meetingStartLabel}`
                              : "Leave by: —"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60">
                          <span className="text-xs text-gray-500">Buffer</span>
                          <select
                            value={stopBuffers[meeting.id] ?? 0}
                            onChange={(e) => void updateStopBuffer(meeting.id, Number(e.target.value))}
                            className="bg-transparent text-xs text-gray-700 outline-none dark:text-gray-300"
                          >
                            <option value={0}>+0m</option>
                            <option value={5}>+5m</option>
                            <option value={10}>+10m</option>
                            <option value={15}>+15m</option>
                            <option value={20}>+20m</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="mb-1 block text-[11px] font-medium text-gray-500">Notes</label>
                        <textarea
                          value={noteEdits[meeting.id] ?? ""}
                          onChange={(e) => setNoteEdits((prev) => ({ ...prev, [meeting.id]: e.target.value }))}
                          onBlur={() => void saveStopNote(meeting.id)}
                          rows={2}
                          placeholder="Parking, suite, or lobby instructions..."
                          className="w-full rounded-lg border border-secondary bg-primary px-2 py-1.5 text-xs text-primary placeholder:text-quaternary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Return Home */}
          <div className="flex items-center gap-3 py-2 pl-6">
            <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-800" />
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
              <Truck01 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {routes.length > 0 && routes[routes.length - 1] 
                ? `${routes[routes.length - 1].duration_text} • ${routes[routes.length - 1].distance_text} back home`
                : "Calculating..."}
            </span>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50/20 to-emerald-100/5 p-4 shadow-sm dark:border-gray-800 dark:from-emerald-950/10 dark:to-emerald-900/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shadow-sm dark:bg-emerald-900/50">
              <HomeLine className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">End: Home</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{endLocation}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Arrive</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {finalArrivalTime 
                  ? `~${finalArrivalTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                  : "Calculating..."}
              </p>
            </div>
          </div>

          {/* Summary Card */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 shadow-sm dark:border-gray-800 dark:from-gray-900/50 dark:to-gray-800/30">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Route Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/60 p-3 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500">Total Drive Time</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {isCalculatingRoutes ? "..." : totalDuration}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 p-3 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500">Total Distance</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {isCalculatingRoutes ? "..." : totalDistance}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 p-3 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500">Meetings</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{displayMeetings.length}</p>
              </div>
              <div className="rounded-xl bg-white/60 p-3 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500">Total Stops</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{displayMeetings.length + 2}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Button 
                size="md" 
                color="primary" 
                className="w-full" 
                iconLeading={Calendar}
                onClick={() => setIsCalendarMenuOpen(!isCalendarMenuOpen)}
                disabled={displayMeetings.length === 0}
              >
                Save Route & Block Calendar
              </Button>
              {/* Calendar Dropdown */}
              {isCalendarMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-20">
                  <p className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Add travel time blocks to calendar
                  </p>
                  <button
                    onClick={addToGoogleCalendar}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Add to Google Calendar
                  </button>
                  <button
                    onClick={addToOutlookCalendar}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.152-.353.228-.578.228h-8.333v-6.55l1.264.96c.1.076.213.114.34.114.14 0 .26-.046.36-.14l.736-.63a.456.456 0 00.164-.35.456.456 0 00-.164-.35l-3.333-2.86a.52.52 0 00-.34-.114.52.52 0 00-.34.114l-3.333 2.86a.456.456 0 00-.164.35c0 .14.055.258.164.35l.736.63c.1.094.22.14.36.14.127 0 .24-.038.34-.114l1.264-.96v6.55H.816c-.225 0-.418-.076-.578-.228A.768.768 0 010 17.865V7.387c0-.23.08-.424.238-.576.16-.152.353-.228.578-.228h22.368c.225 0 .418.076.578.228.158.152.238.346.238.576z" fill="#0078D4"/>
                      <path d="M8.333 5.523v13.954H.816c-.225 0-.418-.076-.578-.228A.768.768 0 010 18.673V5.523c0-.23.08-.424.238-.576.16-.152.353-.228.578-.228h6.701c.225 0 .418.076.578.228.158.152.238.346.238.576z" fill="#0364B8"/>
                    </svg>
                    Add to Outlook Calendar
                  </button>
                  <button
                    onClick={downloadCalendarFile}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Download01 className="h-5 w-5 text-gray-500" />
                    Download .ics File (Apple/Other)
                  </button>
                  <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                    <p className="px-3 py-1 text-xs text-gray-400">
                      Creates {routes.length} travel block event{routes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <Button 
                size="md" 
                color="secondary" 
                iconLeading={Share07}
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              >
                Share
              </Button>
              {/* Share Dropdown */}
              {isShareMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-20">
                  <button
                    onClick={() => {
                      window.open(googleMapsUrl, '_blank');
                      setIsShareMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <NavigationPointer01 className="h-4 w-4" />
                    Open in Google Maps
                  </button>
                  <button
                    onClick={() => {
                      copyRouteToClipboard();
                      setIsShareMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Download01 className="h-4 w-4" />
                    Copy Route to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right - Map View */}
        <div className="flex flex-col gap-4">
          <div className="relative flex-1 overflow-hidden rounded-xl border border-secondary bg-primary min-h-[500px]">
            {/* Google Maps Integration */}
            <RouteMap
              locations={[
                { address: startLocation, label: "Home", type: "home", order: 0 },
                ...displayMeetings.map((meeting, index) => ({
                  address: meeting.address,
                  label: meeting.title,
                  type: meeting.type as "client" | "personal" | "internal",
                  order: index + 1,
                })),
                { address: endLocation, label: "Home", type: "home", order: displayMeetings.length + 1 },
              ]}
              className="absolute inset-0"
            />

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 rounded-lg bg-primary/95 p-3 shadow-lg backdrop-blur-sm z-10">
              <p className="mb-2 text-xs font-semibold text-primary">Legend</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-secondary">Start/End (Home)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-xs text-secondary">Client Meeting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-xs text-secondary">Personal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-secondary">Internal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="sm"
              color="secondary"
              iconLeading={NavigationPointer01}
              onClick={() => {
                if (googleMapsUrl) {
                  window.open(googleMapsUrl, '_blank');
                } else {
                  notify.error('No route', 'Add at least one in-person meeting to get directions.');
                }
              }}
              isDisabled={displayMeetings.length === 0}
            >
              Get Directions
            </Button>
            <Button size="sm" color="secondary" iconLeading={Building07} onClick={() => setIsAddStopOpen(true)}>
              Add Stop
            </Button>
          </div>
          <div className="relative">
            <Button
              size="sm"
              color="secondary"
              iconLeading={Plus}
              onClick={() => setIsQuickStopsOpen((prev) => !prev)}
            >
              Quick stops
            </Button>
            {isQuickStopsOpen && (
              <div className="absolute z-20 mt-2 w-72 rounded-lg border border-secondary bg-primary p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold text-tertiary">Common stops</p>
                {favoriteLocations.map((favorite) => (
                  <button
                    key={favorite.label}
                    onClick={() => addQuickStop(favorite.label, favorite.address)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span>Back to {favorite.label}</span>
                    <span className="text-xs text-tertiary">Add</span>
                  </button>
                ))}
                <div className="my-1 h-px bg-secondary" />
                <p className="px-2 py-1 text-xs font-semibold text-tertiary">Meals</p>
                <button onClick={() => addMealStop("breakfast")} className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-secondary">Breakfast (30 min)</button>
                <button onClick={() => addMealStop("lunch")} className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-secondary">Lunch (45 min)</button>
                <button onClick={() => addMealStop("dinner")} className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-secondary">Dinner (60 min)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Stop Slideout */}
      <AddStopSlideout
        isOpen={isAddStopOpen}
        onOpenChange={setIsAddStopOpen}
        onSubmit={handleAddStop}
      />
    </div>
  );
}
