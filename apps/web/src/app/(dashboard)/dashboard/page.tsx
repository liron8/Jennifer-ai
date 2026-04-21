"use client";

/**
 * Dashboard Page
 * Main dashboard overview with Untitled UI components
 * Connected to real database via /api/dashboard
 */

import { useEffect, useMemo, useState } from "react";
import { AddTaskSlideout } from "../tasks/_components/add-task-slideout";
import type { Task } from "../tasks/_components/task-types";
import { NewMeetingSlideout, type MeetingFormData } from "../scheduling/_components/new-meeting-slideout";
import {
  ArrowLeft,
  BarChartSquare02,
  Calendar,
  CalendarCheck01,
  Edit01,
  Plus,
  SearchLg,
  Trash01,
  RefreshCw01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis } from "recharts";
import { Breadcrumbs } from "@/components/application/breadcrumbs/breadcrumbs";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { MetricChangeIndicator, MetricsChart04 } from "@/components/application/metrics/metrics";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Table, TableRowActionsDropdown } from "@/components/application/table/table";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Avatar } from "@/components/base/avatar/avatar";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { useDashboard, useActivityChart, type DashboardMeeting, type TimeRange } from "@/hooks/useDashboard";
import { useUser } from "@/hooks/useUser";
import { notify } from "@/lib/notifications";

const formatTimeFromISO = (isoString: string): string =>
  new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours}.${Math.round(mins / 6)} hr`;
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening"; // 17-23 and 0-4
};

const formatLocalTime = (): string => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
};

const formatTodayDate = (): string => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};


export default function DashboardPage() {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Live clock that updates every minute
  const [currentTime, setCurrentTime] = useState(formatLocalTime());
  const [greeting, setGreeting] = useState(getGreeting());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatLocalTime());
      setGreeting(getGreeting());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real data from API
  const { data: dashboardData, isLoading, error, refetch } = useDashboard();
  const { profile } = useUser();
  
  // Fetch activity chart data
  const { 
    data: activityData, 
    summary: activitySummary, 
    isLoading: activityLoading,
    timeRange,
    setTimeRange 
  } = useActivityChart('12months');

  const handleAddTask = async (taskData: Omit<Task, "id" | "createdAt" | "completed">) => {
    try {
      // Map slideout data to API schema
      const apiTaskData = {
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        category: mapTaskCategory(taskData.category),
        due_date: taskData.dueDate || undefined,
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiTaskData),
        credentials: 'include',
      });
      
      if (response.ok) {
        notify.success('Task created', `"${taskData.title}" has been added to your tasks.`);
        refetch(); // Refresh dashboard data
      } else {
        const errorData = await response.json();
        notify.error('Failed to create task', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to create task:", err);
      notify.error('Failed to create task', 'An unexpected error occurred.');
    }
  };

  const handleScheduleMeeting = async (meetingFormData: MeetingFormData) => {
    try {
      // Parse the date and times to create ISO datetime strings
      const dateStr = meetingFormData.date; // Format: YYYY-MM-DD
      const startTimeStr = meetingFormData.startTime || '09:00';
      const endTimeStr = meetingFormData.endTime || '10:00';
      
      // Create ISO datetime strings
      const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
      const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

      // Map slideout data to API schema
      const apiMeetingData = {
        title: meetingFormData.title,
        description: meetingFormData.description || '',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_all_day: meetingFormData.isAllDay || false,
        location_type: meetingFormData.videoLink ? 'virtual' as const : (meetingFormData.location ? 'in_person' as const : 'virtual' as const),
        location: meetingFormData.location || undefined,
        video_conference_url: meetingFormData.videoLink || undefined,
        meeting_type: mapMeetingType(meetingFormData.meetingType),
        attendees: meetingFormData.attendees ? parseAttendees(meetingFormData.attendees) : [],
        is_recurring: meetingFormData.isRecurring || false,
        recurrence_rule: meetingFormData.isRecurring ? mapRecurrenceRule(meetingFormData.recurrencePattern) : undefined,
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiMeetingData),
        credentials: 'include',
      });
      
      if (response.ok) {
        notify.success('Meeting scheduled', `"${meetingFormData.title}" has been added to your calendar.`);
        refetch(); // Refresh dashboard data
      } else {
        const errorData = await response.json();
        notify.error('Failed to schedule meeting', errorData.error?.message || 'Please try again.');
      }
    } catch (err) {
      console.error("Failed to schedule meeting:", err);
      notify.error('Failed to schedule meeting', 'An unexpected error occurred.');
    }
  };

  // Helper function to map task category from slideout to API schema
  const mapTaskCategory = (category?: string): 'general' | 'meeting_prep' | 'follow_up' | 'travel' | 'expense' | 'communication' | 'research' | 'other' => {
    const categoryMap: Record<string, 'general' | 'meeting_prep' | 'follow_up' | 'travel' | 'expense' | 'communication' | 'research' | 'other'> = {
      'Admin': 'general',
      'Travel': 'travel',
      'Expense': 'expense',
      'Meeting Prep': 'meeting_prep',
      'Follow-up': 'follow_up',
      'Communication': 'communication',
      'Research': 'research',
    };
    return categoryMap[category || ''] || 'general';
  };

  // Helper function to map meeting type from slideout to API schema
  const mapMeetingType = (type?: string): 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other' => {
    const typeMap: Record<string, 'internal' | 'external' | 'one_on_one' | 'team' | 'client' | 'interview' | 'other'> = {
      'internal': 'internal',
      'external': 'external',
      'personal': 'other',
      'travel': 'other',
      'focus': 'other',
    };
    return typeMap[type || ''] || 'other';
  };

  // Helper function to parse attendees string into array of attendee objects
  const parseAttendees = (attendeesStr: string): Array<{ email: string; name?: string; is_optional: boolean }> => {
    if (!attendeesStr.trim()) return [];
    return attendeesStr.split(',').map(email => ({
      email: email.trim(),
      is_optional: false,
    })).filter(a => a.email.includes('@'));
  };

  // Helper function to map recurrence pattern to RRULE
  const mapRecurrenceRule = (pattern?: string): string | undefined => {
    const ruleMap: Record<string, string> = {
      'daily': 'FREQ=DAILY',
      'weekly': 'FREQ=WEEKLY',
      'biweekly': 'FREQ=WEEKLY;INTERVAL=2',
      'monthly': 'FREQ=MONTHLY',
    };
    return ruleMap[pattern || ''] || undefined;
  };

  // Filter and sort meetings
  const sortedMeetings = useMemo(() => {
    const meetings = dashboardData?.todays_meetings || [];
    
    // Filter by search query
    const filtered = searchQuery
      ? meetings.filter((m) => 
          m.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : meetings;

    if (!sortDescriptor) return filtered;

    return [...filtered].sort((a, b) => {
      let first: string | number | undefined;
      let second: string | number | undefined;

      switch (sortDescriptor.column) {
        case "title":
          first = a.title;
          second = b.title;
          break;
        case "time":
          first = new Date(a.start_time).getTime();
          second = new Date(b.start_time).getTime();
          break;
        case "type":
          first = a.meeting_type;
          second = b.meeting_type;
          break;
        default:
          return 0;
      }

      if (typeof first === "number" && typeof second === "number") {
        return sortDescriptor.direction === "ascending" ? first - second : second - first;
      }

      if (typeof first === "string" && typeof second === "string") {
        const result = first.localeCompare(second);
        return sortDescriptor.direction === "ascending" ? result : -result;
      }

      return 0;
    });
  }, [dashboardData?.todays_meetings, sortDescriptor, searchQuery]);

  // Get user's first name for greeting
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Show loading state
  if (isLoading) {
    return (
      <div className="pt-8 pb-12">
        <div className="flex flex-col gap-8 px-4 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-tertiary">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="pt-8 pb-12">
        <div className="flex flex-col gap-8 px-4 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-lg font-semibold text-primary">Unable to load dashboard</p>
              <p className="text-sm text-tertiary max-w-md">{error}</p>
              <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics;

  return (
    <div className="pt-8 pb-12">
      <div className="flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 px-4 lg:px-8">
          <div className="flex">
            <div className="hidden items-center gap-1 lg:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600">
                <span className="text-sm font-bold text-white">J</span>
              </div>
              <Breadcrumbs type="button">
                <Breadcrumbs.Item href="/dashboard">JeniferAI</Breadcrumbs.Item>
                <Breadcrumbs.Item href="/dashboard">Dashboard</Breadcrumbs.Item>
              </Breadcrumbs>
            </div>
            <Button color="link-gray" iconLeading={ArrowLeft} size="md" className="inline-flex lg:hidden">
              Back
            </Button>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
            <div>
              <p className="text-xl font-semibold text-primary lg:text-display-xs">{greeting}, {firstName}</p>
              <p className="text-sm text-tertiary">{formatTodayDate()} &middot; {currentTime}</p>
            </div>
            <div className="flex gap-3">
              <Button size="md" color="secondary" iconLeading={Calendar} onClick={() => setIsScheduleMeetingOpen(true)}>
                Schedule Meeting
              </Button>
              <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddTaskOpen(true)}>
                New Task
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="-my-2 flex flex-col gap-4 overflow-x-auto px-4 py-2 md:flex-row md:flex-wrap md:items-start md:gap-5 lg:px-8">
          <MetricsChart04
            title={String(metrics?.meetings_today ?? dashboardData?.todays_meetings?.length ?? 0)}
            subtitle="Meetings today"
            change={`${metrics?.meetings_this_week ?? 0} this week`}
            changeTrend="positive"
            changeDescription=""
            className="flex-1 md:min-w-[280px]"
          />
          <MetricsChart04
            title={String(metrics?.tasks_pending || 0)}
            subtitle="Tasks pending"
            change={metrics?.tasks_overdue ? String(metrics.tasks_overdue) : "0"}
            changeTrend={metrics?.tasks_overdue && metrics.tasks_overdue > 0 ? "negative" : "positive"}
            changeDescription="overdue"
            className="flex-1 md:min-w-[280px]"
          />
          <MetricsChart04
            title={String(metrics?.approvals_pending || 0)}
            subtitle="Pending approvals"
            change={metrics?.approvals_pending && metrics.approvals_pending > 0 ? String(metrics.approvals_pending) : "0"}
            changeTrend={metrics?.approvals_pending && metrics.approvals_pending > 0 ? "negative" : "positive"}
            changeDescription="action required"
            className="flex-1 md:min-w-[280px]"
          />
          <MetricsChart04
            title={String(sortedMeetings.length)}
            subtitle="Today's schedule"
            change="View all"
            changeTrend="positive"
            changeDescription=""
            className="flex-1 md:min-w-[280px]"
          />
        </div>

        {/* Activity Chart */}
        <div className="mx-4 lg:mx-8 rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset p-5">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-tertiary">Meeting activity</span>
              </div>
              <div className="flex items-center gap-3">
                {activityLoading ? (
                  <span className="text-display-sm font-semibold text-primary">Loading...</span>
                ) : (
                  <>
                    <span className="text-display-sm font-semibold text-primary">
                      {activitySummary?.total_meetings || 0} meetings
                    </span>
                    {activitySummary && activitySummary.change_percentage !== 0 && (
                      <MetricChangeIndicator 
                        type="modern" 
                        trend={activitySummary.change_trend} 
                        value={`${Math.abs(activitySummary.change_percentage)}%`} 
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Tabs selectedKey={timeRange} onSelectionChange={(key) => setTimeRange(key as TimeRange)}>
                <TabList
                  type="button-minimal"
                  items={[
                    {
                      id: "12months",
                      label: (
                        <>
                          <span className="max-md:hidden">12 months</span>
                          <span className="md:hidden">12m</span>
                        </>
                      ),
                    },
                    {
                      id: "30days",
                      label: (
                        <>
                          <span className="max-md:hidden">30 days</span>
                          <span className="md:hidden">30d</span>
                        </>
                      ),
                    },
                    {
                      id: "7days",
                      label: (
                        <>
                          <span className="max-md:hidden">7 days</span>
                          <span className="md:hidden">7d</span>
                        </>
                      ),
                    },
                  ]}
                />
              </Tabs>
            </div>
          </div>

          {/* Chart or Empty State */}
          {activityLoading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-tertiary">Loading chart data...</span>
              </div>
            </div>
          ) : activityData.length === 0 || (activitySummary?.total_meetings === 0 && activitySummary?.total_tasks === 0) ? (
            <div className="flex h-60 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <BarChartSquare02 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-md font-semibold text-primary">No activity yet</p>
              <p className="text-sm text-tertiary mt-1">
                Schedule meetings and complete tasks to see your activity here
              </p>
            </div>
          ) : (
            <div className="flex h-60 flex-col gap-2">
              <ResponsiveContainer className="h-full">
                <AreaChart data={activityData} className="text-tertiary [&_.recharts-text]:text-xs">
                  <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />
                  <XAxis
                    fill="currentColor"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    dataKey="label"
                    tickMargin={8}
                    padding={{ left: 10, right: 10 }}
                  />
                  <RechartsTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${value}`, name === 'meetings' ? 'Meetings' : 'Tasks completed']}
                    labelFormatter={(label) => label}
                    cursor={{ className: "stroke-utility-brand-600 stroke-2" }}
                  />
                  <Area
                    isAnimationActive={false}
                    className="text-utility-brand-600"
                    dataKey="meetings"
                    name="Meetings"
                    type="linear"
                    stroke="currentColor"
                    strokeWidth={2}
                    fill="none"
                    activeDot={{ className: "fill-bg-primary stroke-utility-brand-600 stroke-2" }}
                  />
                  <Area
                    isAnimationActive={false}
                    className="text-utility-brand-400"
                    dataKey="tasks"
                    name="Tasks completed"
                    type="linear"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="0.1 8"
                    strokeLinecap="round"
                    fill="none"
                    activeDot={{ className: "fill-bg-primary stroke-utility-brand-600 stroke-2" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Today's Schedule Table */}
        <div className="mx-4 lg:mx-8 rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset p-5">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <p className="text-lg font-semibold text-primary">Today&apos;s Schedule</p>
            <div className="w-full lg:max-w-xs">
              <InputBase 
                size="sm" 
                type="search" 
                shortcut 
                aria-label="Search" 
                placeholder="Search meetings" 
                icon={SearchLg}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>

          {sortedMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <CalendarCheck01 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-lg font-semibold text-primary">No meetings scheduled</p>
              <p className="text-sm text-tertiary mt-1">
                {searchQuery ? "No meetings match your search" : "Your calendar is clear for today"}
              </p>
              <Button 
                size="md" 
                color="secondary" 
                iconLeading={Plus} 
                className="mt-4"
                onClick={() => setIsScheduleMeetingOpen(true)}
              >
                Schedule a Meeting
              </Button>
            </div>
          ) : (
            <div>
              <Table
                aria-label="Today's meetings"
                selectionMode="multiple"
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                className="bg-primary"
              >
                <Table.Header className="bg-primary [&_*:first-of-type]:pl-0!">
                  <Table.Head id="title" label="Meeting" isRowHeader allowsSorting className="w-full" />
                  <Table.Head id="time" label="Time" allowsSorting className="max-lg:hidden" />
                  <Table.Head id="duration" label="Duration" className="max-lg:hidden" />
                  <Table.Head id="type" label="Type" allowsSorting className="max-lg:hidden" />
                  <Table.Head id="actions" />
                </Table.Header>

                <Table.Body items={sortedMeetings}>
                  {(meeting) => (
                    <Table.Row id={meeting.id} className="[&>*:first-of-type]:pl-0!">
                      <Table.Cell className="text-nowrap">
                        <div className="flex w-max items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            meeting.meeting_type === "internal" ? "bg-utility-blue-500" :
                            meeting.meeting_type === "external" ? "bg-utility-purple-500" :
                            meeting.meeting_type === "travel" ? "bg-utility-orange-500" :
                            "bg-utility-gray-500"
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-primary">{meeting.title}</p>
                            {meeting.location && (
                              <p className="text-xs text-tertiary">{meeting.location}</p>
                            )}
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-nowrap max-lg:hidden">
                        {formatTimeFromISO(meeting.start_time)}
                      </Table.Cell>
                      <Table.Cell className="text-nowrap max-lg:hidden">
                        {calculateDuration(meeting.start_time, meeting.end_time)}
                      </Table.Cell>
                      <Table.Cell className="max-lg:hidden">
                        <BadgeWithDot
                          color={
                            meeting.meeting_type === "internal" ? "blue" : 
                            meeting.meeting_type === "external" ? "purple" : 
                            meeting.meeting_type === "travel" ? "orange" :
                            "gray"
                          }
                          type="pill-color"
                          size="sm"
                          className="capitalize"
                        >
                          {meeting.meeting_type}
                        </BadgeWithDot>
                      </Table.Cell>
                      <Table.Cell className="pr-0 pl-4">
                        <div className="flex justify-end gap-0.5 max-lg:hidden">
                          <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} />
                          <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} />
                        </div>
                        <div className="flex items-center justify-end lg:hidden">
                          <TableRowActionsDropdown />
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>
              {sortedMeetings.length > 5 && (
                <PaginationPageMinimalCenter page={1} total={Math.ceil(sortedMeetings.length / 5)} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Slideout */}
      <AddTaskSlideout
        isOpen={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        onSubmit={handleAddTask}
      />

      {/* Schedule Meeting Slideout */}
      <NewMeetingSlideout
        isOpen={isScheduleMeetingOpen}
        onOpenChange={setIsScheduleMeetingOpen}
        onSubmit={handleScheduleMeeting}
      />
    </div>
  );
}
