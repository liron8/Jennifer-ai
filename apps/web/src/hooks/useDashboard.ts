'use client';

import { useEffect, useState, useCallback } from 'react';

export interface DashboardMeeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  location_type: 'virtual' | 'in_person' | 'phone' | 'hybrid';
  meeting_type: 'internal' | 'external' | 'personal' | 'travel' | 'focus_time';
  status: 'tentative' | 'confirmed' | 'cancelled';
  executive_id?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
}

export interface DashboardTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  due_date?: string;
  executive_id?: string;
  assigned_to?: string;
}

export interface DashboardKeyDate {
  id: string;
  title: string;
  date: string;
  category: string;
  related_person?: string;
}

export interface DashboardMetrics {
  meetings_today: number;
  meetings_this_week: number;
  tasks_pending: number;
  tasks_overdue: number;
  approvals_pending: number;
}

export interface DashboardData {
  todays_meetings: DashboardMeeting[];
  priority_tasks: DashboardTask[];
  pending_approvals_count: number;
  upcoming_key_dates: DashboardKeyDate[];
  metrics: DashboardMetrics;
}

export interface ActivityDataPoint {
  date: string;
  label: string;
  meetings: number;
  tasks: number;
}

export interface ActivitySummary {
  total_meetings: number;
  total_tasks: number;
  change_percentage: number;
  change_trend: 'positive' | 'negative';
  range: '7days' | '30days' | '12months';
}

export interface ActivityData {
  data: ActivityDataPoint[];
  summary: ActivitySummary;
}

export type TimeRange = '7days' | '30days' | '12months';

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your dashboard');
        }
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to load dashboard');
      }

      setData(result.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
}

interface UseActivityChartReturn {
  data: ActivityDataPoint[];
  summary: ActivitySummary | null;
  isLoading: boolean;
  error: string | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  refetch: () => Promise<void>;
}

// Calendar Meetings Hook
export interface CalendarMeeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  location_type: 'virtual' | 'in_person' | 'phone' | 'hybrid';
  meeting_type: 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other';
  status: 'scheduled' | 'confirmed' | 'tentative' | 'pending' | 'cancelled';
  video_conference_url?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    is_optional?: boolean;
  }>;
}

export interface CalendarStats {
  total_meetings: number;
  video_calls: number;
  in_person: number;
  total_attendees: number;
}

interface UseCalendarMeetingsReturn {
  meetings: CalendarMeeting[];
  stats: CalendarStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCalendarMeetings(startDate?: string, endDate?: string): UseCalendarMeetingsReturn {
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [stats, setStats] = useState<CalendarStats>({
    total_meetings: 0,
    video_calls: 0,
    in_person: 0,
    total_attendees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('status', 'all');
      params.append('page_size', '100');

      const response = await fetch(`/api/meetings?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view calendar');
        }
        throw new Error('Failed to load meetings');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to load meetings');
      }

      // API returns { data: { data: [...], meta: {...} } }
      const rawData = result.data?.data || result.data || [];
      const meetingsData = Array.isArray(rawData) ? rawData : [];
      setMeetings(meetingsData);

      // Calculate stats
      const videoCalls = meetingsData.filter((m: CalendarMeeting) => 
        m.location_type === 'virtual' || m.video_conference_url
      ).length;
      const inPerson = meetingsData.filter((m: CalendarMeeting) => 
        m.location_type === 'in_person'
      ).length;
      const totalAttendees = meetingsData.reduce((sum: number, m: CalendarMeeting) => 
        sum + (m.attendees?.length || 0), 0
      );

      setStats({
        total_meetings: meetingsData.length,
        video_calls: videoCalls,
        in_person: inPerson,
        total_attendees: totalAttendees,
      });
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    stats,
    isLoading,
    error,
    refetch: fetchMeetings,
  };
}

// Meeting Log Hook
export interface MeetingLogEntry {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  location_type: 'virtual' | 'in_person' | 'phone' | 'hybrid';
  meeting_type: 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other';
  status: 'scheduled' | 'confirmed' | 'tentative' | 'pending' | 'cancelled' | 'completed';
  video_conference_url?: string;
  executive_id?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    is_optional?: boolean;
  }>;
}

interface UseMeetingLogReturn {
  meetings: MeetingLogEntry[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}

export function useMeetingLog(
  status: 'upcoming' | 'pending' | 'past' | 'cancelled' | 'all' = 'all',
  search?: string,
  pageSize: number = 20
): UseMeetingLogReturn {
  const [meetings, setMeetings] = useState<MeetingLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      if (status !== 'all') {
        params.append('status', status);
      }
      
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/meetings?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view meetings');
        }
        throw new Error('Failed to load meetings');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to load meetings');
      }

      // API returns { data: { data: [...], meta: {...} } }
      const rawData = result.data?.data || result.data || [];
      const meetingsData = Array.isArray(rawData) ? rawData : [];
      setMeetings(meetingsData);

      // Set pagination from meta
      const meta = result.data?.meta || {};
      setPagination({
        page: meta.page || page,
        pageSize: meta.page_size || pageSize,
        total: meta.total || meetingsData.length,
        totalPages: meta.total_pages || Math.ceil(meetingsData.length / pageSize),
      });
    } catch (err) {
      console.error('Meeting log fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [status, search, page, pageSize]);

  // Reset page to 1 when status or search changes
  useEffect(() => {
    setPage(1);
  }, [status, search]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    isLoading,
    error,
    pagination,
    setPage,
    refetch: fetchMeetings,
  };
}

// Route Planner Hook - Fetch in-person meetings for a specific date
export interface RouteMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  location_details?: string;
  meeting_type: string;
  executive_id?: string;
}

export interface RouteInfo {
  origin: string;
  destination: string;
  duration_seconds: number;
  duration_text: string;
  distance_meters: number;
  distance_text: string;
  traffic_condition?: 'light' | 'moderate' | 'heavy' | 'severe';
  polyline?: string;
}

// Enhanced route data with ETAs and warnings
export interface EnhancedRouteData {
  routes: RouteInfo[];
  totalDuration: string;
  totalDistance: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  // ETA calculations
  departureTime: Date;
  arrivalTimes: Date[];
  // Warnings
  bufferWarnings: BufferWarning[];
  trafficAlerts: TrafficAlert[];
}

export interface BufferWarning {
  meetingIndex: number;
  meetingTitle: string;
  availableBuffer: number; // minutes
  requiredBuffer: number; // minutes
  severity: 'warning' | 'critical';
  message: string;
}

export interface TrafficAlert {
  segmentIndex: number;
  from: string;
  to: string;
  condition: 'heavy' | 'severe';
  delayMinutes: number;
  message: string;
}

interface UseRoutePlannerReturn {
  meetings: RouteMeeting[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRoutePlanner(date: string): UseRoutePlannerReturn {
  const [meetings, setMeetings] = useState<RouteMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get start and end of the selected date in local timezone
      // Parse date string as local date (not UTC)
      const [year, month, day] = date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      const params = new URLSearchParams();
      params.append('start_date', startDate.toISOString());
      params.append('end_date', endDate.toISOString());
      params.append('location_type', 'in_person');
      params.append('status', 'all');
      params.append('page_size', '50');

      const response = await fetch(`/api/meetings?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view route planner');
        }
        throw new Error('Failed to load meetings');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to load meetings');
      }

      // API returns { data: { data: [...], meta: {...} } }
      const rawData = result.data?.data || result.data || [];
      const meetingsData = Array.isArray(rawData) ? rawData : [];
      
      // Sort by start time
      meetingsData.sort((a: RouteMeeting, b: RouteMeeting) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      setMeetings(meetingsData);
    } catch (err) {
      console.error('Route planner fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    isLoading,
    error,
    refetch: fetchMeetings,
  };
}

// Google Maps Directions Hook - Enhanced with ETAs, warnings, and optimization
interface UseRouteDirectionsReturn {
  routes: RouteInfo[];
  totalDuration: string;
  totalDistance: string;
  totalDurationSeconds: number;
  arrivalTimes: Date[];
  bufferWarnings: BufferWarning[];
  trafficAlerts: TrafficAlert[];
  isLoading: boolean;
  error: string | null;
  calculateRoutes: (locations: string[], meetings: RouteMeeting[], departureTime: Date) => Promise<void>;
  optimizeRoute: (locations: string[], meetings: RouteMeeting[]) => Promise<string[]>;
  getGoogleMapsUrl: (locations: string[]) => string;
}

// Helper to calculate buffer warnings
function calculateBufferWarnings(
  meetings: RouteMeeting[],
  routes: RouteInfo[],
  arrivalTimes: Date[],
  requiredBuffer: number = 15
): BufferWarning[] {
  const warnings: BufferWarning[] = [];
  
  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    const meetingStart = new Date(meeting.start_time);
    const arrivalTime = arrivalTimes[i];
    
    if (!arrivalTime) continue;
    
    const bufferMinutes = Math.floor((meetingStart.getTime() - arrivalTime.getTime()) / 60000);
    
    if (bufferMinutes < 0) {
      warnings.push({
        meetingIndex: i,
        meetingTitle: meeting.title,
        availableBuffer: bufferMinutes,
        requiredBuffer,
        severity: 'critical',
        message: `You'll arrive ${Math.abs(bufferMinutes)} min late to "${meeting.title}"`,
      });
    } else if (bufferMinutes < requiredBuffer) {
      warnings.push({
        meetingIndex: i,
        meetingTitle: meeting.title,
        availableBuffer: bufferMinutes,
        requiredBuffer,
        severity: 'warning',
        message: `Only ${bufferMinutes} min buffer before "${meeting.title}" (recommended: ${requiredBuffer} min)`,
      });
    }
  }
  
  return warnings;
}

// Helper to extract traffic alerts
function extractTrafficAlerts(routes: RouteInfo[]): TrafficAlert[] {
  const alerts: TrafficAlert[] = [];
  
  routes.forEach((route, index) => {
    if (route.traffic_condition === 'heavy' || route.traffic_condition === 'severe') {
      // Estimate delay (heavy = 20% longer, severe = 40% longer)
      const baseTime = route.duration_seconds;
      const multiplier = route.traffic_condition === 'severe' ? 0.4 : 0.2;
      const delaySeconds = Math.round(baseTime * multiplier);
      
      alerts.push({
        segmentIndex: index,
        from: route.origin,
        to: route.destination,
        condition: route.traffic_condition,
        delayMinutes: Math.round(delaySeconds / 60),
        message: `${route.traffic_condition === 'severe' ? '🔴' : '🟡'} ${route.traffic_condition.charAt(0).toUpperCase() + route.traffic_condition.slice(1)} traffic on route to ${route.destination.split(',')[0]}`,
      });
    }
  });
  
  return alerts;
}

// Helper to calculate arrival times
function calculateArrivalTimes(
  departureTime: Date,
  routes: RouteInfo[],
  meetings: RouteMeeting[]
): Date[] {
  const arrivalTimes: Date[] = [];
  let currentTime = new Date(departureTime);
  
  for (let i = 0; i < meetings.length; i++) {
    // Add travel time to current location
    if (routes[i]) {
      currentTime = new Date(currentTime.getTime() + routes[i].duration_seconds * 1000);
    }
    arrivalTimes.push(new Date(currentTime));
    
    // Add meeting duration for next calculation
    const meeting = meetings[i];
    const meetingEnd = new Date(meeting.end_time);
    const meetingStart = new Date(meeting.start_time);
    const meetingDuration = meetingEnd.getTime() - meetingStart.getTime();
    
    // Use actual meeting end time or calculated arrival + duration
    currentTime = new Date(Math.max(
      meetingEnd.getTime(),
      currentTime.getTime() + meetingDuration
    ));
  }
  
  return arrivalTimes;
}

export function useRouteDirections(): UseRouteDirectionsReturn {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [totalDuration, setTotalDuration] = useState('0 min');
  const [totalDistance, setTotalDistance] = useState('0 mi');
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [arrivalTimes, setArrivalTimes] = useState<Date[]>([]);
  const [bufferWarnings, setBufferWarnings] = useState<BufferWarning[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoutes = useCallback(async (
    locations: string[],
    meetings: RouteMeeting[],
    departureTime: Date
  ) => {
    if (locations.length < 2) {
      setRoutes([]);
      setTotalDuration('0 min');
      setTotalDistance('0 mi');
      setTotalDurationSeconds(0);
      setArrivalTimes([]);
      setBufferWarnings([]);
      setTrafficAlerts([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/maps/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          locations,
          departure_time: departureTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate routes');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to calculate routes');
      }

      const routeData: RouteInfo[] = result.data?.routes || [];
      setRoutes(routeData);
      setTotalDuration(result.data?.total_duration || '0 min');
      setTotalDistance(result.data?.total_distance || '0 mi');
      setTotalDurationSeconds(result.data?.total_duration_seconds || 0);
      
      // Calculate arrival times
      const calculatedArrivalTimes = calculateArrivalTimes(departureTime, routeData, meetings);
      setArrivalTimes(calculatedArrivalTimes);
      
      // Calculate buffer warnings
      const warnings = calculateBufferWarnings(meetings, routeData, calculatedArrivalTimes);
      setBufferWarnings(warnings);
      
      // Extract traffic alerts
      const alerts = extractTrafficAlerts(routeData);
      setTrafficAlerts(alerts);
      
    } catch (err) {
      console.error('Route directions error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Optimize route order using nearest neighbor algorithm
  const optimizeRoute = useCallback(async (
    locations: string[],
    meetings: RouteMeeting[]
  ): Promise<string[]> => {
    if (locations.length <= 3) return locations; // Start, 1 meeting, end - nothing to optimize
    
    // For now, use a simple time-based sort (meetings must be in chronological order)
    // In the future, this could call an optimization API
    const sortedMeetings = [...meetings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    return [
      locations[0], // Start (home)
      ...sortedMeetings.map(m => m.location || ''),
      locations[locations.length - 1], // End (home)
    ];
  }, []);

  // Generate Google Maps URL for navigation
  const getGoogleMapsUrl = useCallback((locations: string[]): string => {
    if (locations.length < 2) return '';
    
    const origin = encodeURIComponent(locations[0]);
    const destination = encodeURIComponent(locations[locations.length - 1]);
    const waypoints = locations.slice(1, -1).map(l => encodeURIComponent(l)).join('|');
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    url += '&travelmode=driving';
    
    return url;
  }, []);

  return {
    routes,
    totalDuration,
    totalDistance,
    totalDurationSeconds,
    arrivalTimes,
    bufferWarnings,
    trafficAlerts,
    isLoading,
    error,
    calculateRoutes,
    optimizeRoute,
    getGoogleMapsUrl,
  };
}

export function useActivityChart(initialRange: TimeRange = '12months'): UseActivityChartReturn {
  const [data, setData] = useState<ActivityDataPoint[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);

  const fetchActivity = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/activity?range=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view activity data');
        }
        throw new Error('Failed to load activity data');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to load activity');
      }

      setData(result.data.data || []);
      setSummary(result.data.summary || null);
    } catch (err) {
      console.error('Activity fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return {
    data,
    summary,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    refetch: fetchActivity,
  };
}
