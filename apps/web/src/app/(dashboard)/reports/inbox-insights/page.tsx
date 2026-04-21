"use client";

/**
 * Inbox Insights Page
 * Analytics and insights for email/inbox data
 * Connected to real database via /api/reports/inbox-insights
 */

import { useState, useMemo } from "react";
import { AlertCircle, Calendar, RefreshCw01 } from "@untitledui/icons";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { ChartCard } from "../_components/chart-card";
import { SimpleBarChart } from "../_components/simple-bar-chart";
import { SimplePieChart } from "../_components/simple-pie-chart";
import { ContactRankingList } from "../_components/contact-ranking-list";
import { useInboxInsights } from "@/hooks/useInboxInsights";
import { Button } from "@/components/base/buttons/button";

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

export default function InboxInsightsPage() {
  const [range, setRange] = useState(30);
  const { data, isLoading, error, refetch } = useInboxInsights(range);

  const dateRangeLabel = useMemo(
    () => RANGE_OPTIONS.find((o) => o.value === range)?.label || "Last 30 days",
    [range],
  );

  const topContacts = useMemo(
    () =>
      (data?.charts.top_contacts || []).map((c) => ({
        name: c.name,
        role: c.role,
        meetings: c.count,
      })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-16">
        <RefreshCw01 className="h-6 w-6 animate-spin text-fg-quaternary" />
        <p className="text-sm text-tertiary">Loading inbox insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16">
        <AlertCircle className="h-8 w-8 text-fg-error-primary" />
        <p className="text-sm font-medium text-primary">Failed to load insights</p>
        <p className="text-xs text-tertiary">{error}</p>
        <Button size="sm" color="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Inbox Insights</h1>
          <p className="text-sm text-tertiary">
            Analyze your communication patterns and response times
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                range === opt.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-secondary bg-primary text-secondary hover:bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="-my-2 flex flex-col gap-4 overflow-x-auto py-2 md:flex-row md:flex-wrap md:items-start md:gap-5">
        <MetricsChart04
          title={String(metrics?.emails_received ?? 0)}
          subtitle="Communications"
          change={metrics?.received_change?.replace(/[+-]/, "") || "0%"}
          changeTrend={metrics?.received_change?.startsWith("-") ? "negative" : "positive"}
          changeDescription="vs previous period"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={String(metrics?.emails_sent ?? 0)}
          subtitle="Responses"
          change={metrics?.sent_change?.replace(/[+-]/, "") || "0%"}
          changeTrend={metrics?.sent_change?.startsWith("-") ? "negative" : "positive"}
          changeDescription="vs previous period"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={metrics?.avg_response_time || "—"}
          subtitle="Avg Response Time"
          change={metrics?.response_time_change?.replace(/[+-]/, "") || "0%"}
          changeTrend={metrics?.response_time_change?.startsWith("-") ? "negative" : "positive"}
          changeDescription="faster than before"
          className="flex-1 md:min-w-[280px]"
        />
        <MetricsChart04
          title={metrics?.reply_rate || "0%"}
          subtitle="Completion Rate"
          change={metrics?.reply_rate_change?.replace(/[+-]/, "") || "0%"}
          changeTrend={metrics?.reply_rate_change?.startsWith("-") ? "negative" : "positive"}
          changeDescription="vs previous period"
          className="flex-1 md:min-w-[280px]"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Communication Volume" description="Activity per day of week">
          <SimpleBarChart data={data?.charts.email_volume || []} />
        </ChartCard>

        <ChartCard title="Response Time Distribution" description="How quickly you respond">
          <SimpleBarChart data={data?.charts.response_time || []} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Top Contacts" description="People you interact with most">
          <ContactRankingList contacts={topContacts} />
        </ChartCard>

        <ChartCard title="Communication Categories" description="Breakdown by type">
          <SimplePieChart data={data?.charts.email_categories || []} />
        </ChartCard>
      </div>
    </div>
  );
}
