"use client";

/**
 * Calendar Insights Page
 * Analytics and insights for calendar/meeting data
 * Connected to real database via /api/reports/calendar-insights
 */

import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Truck01, Users01, RefreshCw01 } from "@untitledui/icons";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { ChartCard } from "../_components/chart-card";
import { SimpleBarChart } from "../_components/simple-bar-chart";
import { SimplePieChart } from "../_components/simple-pie-chart";
import { ContactRankingList } from "../_components/contact-ranking-list";
import { HeatmapChart } from "../_components/heatmap-chart";
import { Button } from "@/components/base/buttons/button";

// Types for API response
interface CalendarInsightsData {
  date_range: { start: string; end: string };
  metrics: {
    total_meetings: number;
    avg_meetings_per_week: number;
    total_meeting_hours: number;
    internal_meetings: number;
    external_meetings: number;
  };
  charts: {
    meetings_by_day: { day: string; count: number }[];
    meetings_by_type: { type: string; count: number }[];
  };
}

// Color mapping for chart data
const dayColors: Record<string, string> = {
  Mon: "#7C3AED",
  Tue: "#7C3AED",
  Wed: "#7C3AED",
  Thu: "#7C3AED",
  Fri: "#7C3AED",
  Sat: "#6B7280",
  Sun: "#6B7280",
};

const typeColors: Record<string, string> = {
  internal: "#7C3AED",
  external: "#3B82F6",
  client: "#10B981",
  team: "#F59E0B",
  interview: "#EF4444",
  one_on_one: "#8B5CF6",
  other: "#6B7280",
};

// Top contacts - derived from real meeting data when available
const topContacts: { name: string; role: string; meetings: number }[] = [];

// Default heatmap (would need enhanced API to calculate)
const defaultHeatmapData = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export default function CalendarInsightsPage() {
  const [dateRange] = useState("Last 30 days");
  const [data, setData] = useState<CalendarInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch calendar insights from API
  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/reports/calendar-insights');
        if (!response.ok) {
          throw new Error('Failed to fetch calendar insights');
        }
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error('Failed to fetch calendar insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  // Transform API data for charts
  const meetingDistributionData = useMemo(() => {
    if (!data?.charts?.meetings_by_day) return [];
    return data.charts.meetings_by_day.map(item => ({
      label: item.day,
      value: item.count,
      color: dayColors[item.day] || "#7C3AED",
    }));
  }, [data]);

  const departmentData = useMemo(() => {
    if (!data?.charts?.meetings_by_type) return [];
    return data.charts.meetings_by_type.map(item => ({
      label: item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('_', ' '),
      value: item.count,
      color: typeColors[item.type] || "#6B7280",
    }));
  }, [data]);

  // Calculate internal vs external percentage
  const internalPercentage = useMemo(() => {
    if (!data?.metrics) return 0;
    const total = data.metrics.internal_meetings + data.metrics.external_meetings;
    if (total === 0) return 0;
    return Math.round((data.metrics.internal_meetings / total) * 100);
  }, [data]);

  // Calculate time in meetings percentage (assuming 40 hour work week)
  const meetingTimePercentage = useMemo(() => {
    if (!data?.metrics) return 0;
    const workHoursPerWeek = 40;
    const weeks = 4; // Last 30 days ≈ 4 weeks
    const totalWorkHours = workHoursPerWeek * weeks;
    return Math.round((data.metrics.total_meeting_hours / totalWorkHours) * 100);
  }, [data]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading calendar insights...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-semibold text-primary">Unable to load calendar insights</p>
            <p className="text-sm text-tertiary max-w-md">{error}</p>
            <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Calendar Insights</h1>
          <p className="text-sm text-tertiary">
            Analyze your meeting patterns and time allocation
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
          <Calendar className="h-4 w-4 text-fg-quaternary" />
          <span className="text-sm text-secondary">{dateRange}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="-my-2 flex flex-col gap-4 overflow-x-auto py-2 md:flex-row md:flex-wrap md:items-start md:gap-5">
        <MetricsChart04
          title={String(data?.metrics?.avg_meetings_per_week || 0)}
          subtitle="Avg Meetings/Week"
          change="--"
          changeTrend="positive"
          changeDescription="this period"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={`${internalPercentage}%`}
          subtitle="Internal vs External"
          change="--"
          changeTrend="positive"
          changeDescription="internal meetings"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={`${meetingTimePercentage}%`}
          subtitle="Time in Meetings"
          change="--"
          changeTrend="positive"
          changeDescription="of work hours"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={`${data?.metrics?.total_meeting_hours || 0}h`}
          subtitle="Total Meeting Hours"
          change="--"
          changeTrend="positive"
          changeDescription="this period"
          className="flex-1 md:min-w-[280px]"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Meeting Distribution" description="Meetings per day of week">
          {meetingDistributionData.length > 0 ? (
            <SimpleBarChart data={meetingDistributionData} />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-tertiary">
              No meeting data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Peak Meeting Hours" description="When you have the most meetings">
          <HeatmapChart data={defaultHeatmapData} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Top Meeting Contacts" description="People you meet with most">
          <ContactRankingList contacts={topContacts} />
        </ChartCard>

        <ChartCard title="Meeting Types" description="Breakdown by meeting type">
          {departmentData.length > 0 ? (
            <SimplePieChart data={departmentData} />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-tertiary">
              No meeting type data available
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
