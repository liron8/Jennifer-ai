"use client";

/**
 * Throughput Page
 * Task completion and productivity analytics
 * Connected to real database via /api/reports/throughput
 */

import { useState, useEffect, useMemo } from "react";
import { Calendar, CheckCircle, Clock, Target01, TrendUp01, Users01, RefreshCw01 } from "@untitledui/icons";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { ChartCard } from "../_components/chart-card";
import { SimpleBarChart } from "../_components/simple-bar-chart";
import { SimplePieChart } from "../_components/simple-pie-chart";
import { Button } from "@/components/base/buttons/button";

// Types for API response
interface ThroughputData {
  date_range: { start: string; end: string };
  metrics: {
    tasks_completed: number;
    approvals_processed: number;
    avg_task_completion_days: number;
    avg_approval_turnaround_hours: number;
  };
  charts: {
    tasks_by_category: { category: string; count: number }[];
    tasks_by_priority: { priority: string; count: number }[];
  };
}

// Color mapping for categories
const categoryColors: Record<string, string> = {
  scheduling: "#7C3AED",
  communications: "#3B82F6",
  travel: "#10B981",
  admin: "#F59E0B",
  meeting: "#8B5CF6",
  email: "#06B6D4",
  other: "#6B7280",
};

// Color mapping for priorities
const priorityColors: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};


export default function ThroughputPage() {
  const [dateRange] = useState("Last 30 days");
  const [data, setData] = useState<ThroughputData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch throughput data from API
  useEffect(() => {
    const fetchThroughput = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/reports/throughput');
        if (!response.ok) {
          throw new Error('Failed to fetch throughput data');
        }
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error('Failed to fetch throughput data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load throughput');
      } finally {
        setIsLoading(false);
      }
    };

    fetchThroughput();
  }, []);

  // Transform API data for charts
  const taskCategoryData = useMemo(() => {
    if (!data?.charts?.tasks_by_category) return [];
    return data.charts.tasks_by_category.map(item => ({
      label: item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Other',
      value: item.count,
      color: categoryColors[item.category?.toLowerCase()] || "#6B7280",
    }));
  }, [data]);

  const priorityBreakdown = useMemo(() => {
    if (!data?.charts?.tasks_by_priority) return [];
    return data.charts.tasks_by_priority.map(item => ({
      label: item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Unknown',
      value: item.count,
      color: priorityColors[item.priority?.toLowerCase()] || "#6B7280",
    }));
  }, [data]);

  // Calculate completion rate from real data
  const completionRate = useMemo(() => {
    if (!data?.metrics?.tasks_completed) return 0;
    return data.metrics.tasks_completed;
  }, [data]);

  // Format avg completion time
  const avgCompletionTime = useMemo(() => {
    if (!data?.metrics?.avg_task_completion_days) return "--";
    const days = data.metrics.avg_task_completion_days;
    if (days < 1) {
      return `${Math.round(days * 24)}h`;
    }
    return `${days.toFixed(1)}d`;
  }, [data]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading throughput data...</p>
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
            <p className="text-lg font-semibold text-primary">Unable to load throughput data</p>
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
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Throughput</h1>
          <p className="text-sm text-tertiary">
            Track task completion and team productivity
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
          title={String(data?.metrics?.tasks_completed || 0)}
          subtitle="Tasks Completed"
          change="--"
          changeTrend="positive"
          changeDescription="this period"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={`${data?.metrics?.approvals_processed || 0}`}
          subtitle="Approvals Processed"
          change="--"
          changeTrend="positive"
          changeDescription="this period"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={avgCompletionTime}
          subtitle="Avg Completion Time"
          change="--"
          changeTrend="positive"
          changeDescription="per task"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={`${data?.metrics?.avg_approval_turnaround_hours?.toFixed(1) || '--'}h`}
          subtitle="Avg Approval Turnaround"
          change="--"
          changeTrend="positive"
          changeDescription="per approval"
          className="flex-1 md:min-w-[280px]"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Tasks by Category" description="Distribution of completed tasks">
          {taskCategoryData.length > 0 ? (
            <SimplePieChart data={taskCategoryData} />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-tertiary">
              No task category data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Priority Breakdown" description="Tasks by priority level">
          {priorityBreakdown.length > 0 ? (
            <SimpleBarChart data={priorityBreakdown} />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-tertiary">
              No priority data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Team Performance" description="Individual productivity metrics">
          <div className="flex items-center justify-center h-48 text-sm text-tertiary">
            No team performance data available
          </div>
        </ChartCard>

        <ChartCard title="Summary" description="Key throughput metrics">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <span className="text-sm text-secondary">Total Tasks Completed</span>
              <span className="text-sm font-semibold text-primary">{data?.metrics?.tasks_completed || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <span className="text-sm text-secondary">Total Approvals Processed</span>
              <span className="text-sm font-semibold text-primary">{data?.metrics?.approvals_processed || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <span className="text-sm text-secondary">Avg Task Completion</span>
              <span className="text-sm font-semibold text-primary">{avgCompletionTime}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <span className="text-sm text-secondary">Avg Approval Turnaround</span>
              <span className="text-sm font-semibold text-primary">{data?.metrics?.avg_approval_turnaround_hours?.toFixed(1) || '--'}h</span>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
