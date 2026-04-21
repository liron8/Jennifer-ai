"use client";

/**
 * Meeting Tracker Page
 * Unified dashboard for all scheduling activities:
 * Proposed Times, Availability Links, and Meeting Polls
 */

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Link01,
  BarChartSquare01,
  Copy01,
  Check,
  Eye,
  XClose,
  Users01,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { notify } from "@/lib/notifications";

type ItemType = "all" | "proposed" | "availability" | "poll";

interface ProposedTime {
  id: string;
  title: string | null;
  time_slots: { start: string; end: string }[];
  timezone_columns: string[];
  created_at: string;
}

interface AvailabilityLink {
  id: string;
  title: string | null;
  date_range_start: string;
  date_range_end: string;
  time_window_start: string;
  time_window_end: string;
  slot_duration_minutes: number;
  link_token: string;
  status: string;
  created_at: string;
  availability_responses: { count: number }[];
}

interface MeetingPoll {
  id: string;
  title: string;
  duration_minutes: number;
  time_options: { date: string; start_time: string; end_time: string }[];
  link_token: string;
  status: string;
  created_at: string;
  meeting_poll_responses: { count: number }[];
}

interface UnifiedItem {
  id: string;
  type: "proposed" | "availability" | "poll";
  title: string;
  status: string;
  responseCount: number;
  createdAt: string;
  shareUrl?: string;
  detail: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatShortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const TYPE_CONFIG = {
  proposed: { label: "Proposed Times", color: "bg-blue-100 text-blue-700", icon: Clock },
  availability: { label: "Availability", color: "bg-purple-100 text-purple-700", icon: Link01 },
  poll: { label: "Meeting Poll", color: "bg-orange-100 text-orange-700", icon: BarChartSquare01 },
};

export default function MeetingTrackerPage() {
  const [activeTab, setActiveTab] = useState<ItemType>("all");
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<UnifiedItem | null>(null);
  const [pollResponses, setPollResponses] = useState<{ respondent_name: string; selected_options: number[] }[]>([]);
  const [availResponses, setAvailResponses] = useState<{ respondent_name: string; selected_slots: { date: string; time: string }[] }[]>([]);
  const [detailPoll, setDetailPoll] = useState<MeetingPoll | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proposedRes, availRes, pollRes] = await Promise.all([
        fetch("/api/proposed-times"),
        fetch("/api/availability"),
        fetch("/api/meeting-polls"),
      ]);

      const unified: UnifiedItem[] = [];

      if (proposedRes.ok) {
        const result = await proposedRes.json();
        const data: ProposedTime[] = result.data?.data ?? result.data ?? [];
        for (const item of data) {
          const slotCount = item.time_slots?.length ?? 0;
          unified.push({
            id: item.id,
            type: "proposed",
            title: item.title || `${slotCount} proposed time${slotCount !== 1 ? "s" : ""}`,
            status: "sent",
            responseCount: 0,
            createdAt: item.created_at,
            detail: `${slotCount} time slot${slotCount !== 1 ? "s" : ""} proposed`,
          });
        }
      }

      if (availRes.ok) {
        const result = await availRes.json();
        const data: AvailabilityLink[] = result.data?.data ?? result.data ?? [];
        for (const item of data) {
          const count = item.availability_responses?.[0]?.count ?? 0;
          unified.push({
            id: item.id,
            type: "availability",
            title: item.title || "Availability Link",
            status: item.status || "active",
            responseCount: count,
            createdAt: item.created_at,
            shareUrl: `${window.location.origin}/availability/${item.link_token}`,
            detail: `${formatShortDate(item.date_range_start)} – ${formatShortDate(item.date_range_end)}`,
          });
        }
      }

      if (pollRes.ok) {
        const result = await pollRes.json();
        const data: MeetingPoll[] = result.data?.data ?? result.data ?? [];
        for (const item of data) {
          const count = item.meeting_poll_responses?.[0]?.count ?? 0;
          unified.push({
            id: item.id,
            type: "poll",
            title: item.title,
            status: item.status || "active",
            responseCount: count,
            createdAt: item.created_at,
            shareUrl: `${window.location.origin}/poll/${item.link_token}`,
            detail: `${item.time_options.length} options · ${item.duration_minutes} min`,
          });
        }
      }

      // Sort by created_at descending
      unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(unified);
    } catch (err) {
      console.error("Failed to fetch tracking data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredItems = activeTab === "all" ? items : items.filter((i) => i.type === activeTab);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify.success("Copied", "Link copied to clipboard.");
    } catch {
      notify.error("Copy failed", "Could not copy to clipboard.");
    }
  };

  const handleViewDetail = async (item: UnifiedItem) => {
    setDetailItem(item);
    setPollResponses([]);
    setAvailResponses([]);
    setDetailPoll(null);

    // Fetch responses for polls and availability links
    if (item.type === "poll") {
      try {
        const res = await fetch("/api/meeting-polls");
        if (res.ok) {
          const result = await res.json();
          const polls: MeetingPoll[] = result.data?.data ?? result.data ?? [];
          const pollData = polls.find((p) => p.id === item.id);
          if (pollData) setDetailPoll(pollData);
        }
        // Fetch poll responses (we'd need a specific endpoint, but for now we use what we have)
      } catch {
        // silently fail
      }
    }
  };

  const tabs: { id: ItemType; label: string; count: number }[] = [
    { id: "all", label: "All", count: items.length },
    { id: "proposed", label: "Proposed Times", count: items.filter((i) => i.type === "proposed").length },
    { id: "availability", label: "Availability", count: items.filter((i) => i.type === "availability").length },
    { id: "poll", label: "Polls", count: items.filter((i) => i.type === "poll").length },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FeaturedIcon icon={BarChartSquare01} color="brand" size="md" theme="modern" />
          <div>
            <h1 className="text-xl font-semibold text-primary">Meeting Tracker</h1>
            <p className="text-sm text-tertiary">Track all scheduling activities in one place</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-secondary">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 text-[10px] font-medium ${
              activeTab === tab.id
                ? "bg-brand-50 text-brand-600"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FeaturedIcon icon={Clock} color="gray" size="lg" theme="modern" />
          <h3 className="mt-4 text-base font-semibold text-primary">No scheduling items yet</h3>
          <p className="mt-1 text-sm text-tertiary max-w-sm">
            Use the Calendar page to propose times, share availability, or create polls. They&apos;ll appear here for tracking.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="group flex items-center justify-between rounded-xl border border-secondary bg-primary p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.color.split(" ")[0]}`}>
                    <Icon className={`h-4 w-4 ${config.color.split(" ")[1]}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary truncate">{item.title}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-tertiary">{item.detail}</span>
                      <span className="text-xs text-tertiary">·</span>
                      <span className="text-xs text-tertiary">{formatDate(item.createdAt)}</span>
                      {item.responseCount > 0 && (
                        <>
                          <span className="text-xs text-tertiary">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-brand-600">
                            <Users01 className="h-3 w-3" />
                            {item.responseCount} response{item.responseCount !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.shareUrl && (
                    <button
                      onClick={() => handleCopyLink(item.shareUrl!)}
                      className="rounded-lg p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                      title="Copy link"
                    >
                      <Copy01 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetail(item)}
                    className="rounded-lg p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20" onClick={() => setDetailItem(null)}>
          <div
            className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = TYPE_CONFIG[detailItem.type].icon;
                  return <Icon className="h-5 w-5 text-brand-600" />;
                })()}
                <h2 className="text-lg font-semibold text-primary">{detailItem.title}</h2>
              </div>
              <button onClick={() => setDetailItem(null)} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                <XClose className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="text-[10px] uppercase tracking-wider text-tertiary">Type</p>
                  <p className="text-sm font-medium text-primary">{TYPE_CONFIG[detailItem.type].label}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="text-[10px] uppercase tracking-wider text-tertiary">Status</p>
                  <p className="text-sm font-medium text-primary capitalize">{detailItem.status}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="text-[10px] uppercase tracking-wider text-tertiary">Created</p>
                  <p className="text-sm font-medium text-primary">{formatDate(detailItem.createdAt)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="text-[10px] uppercase tracking-wider text-tertiary">Responses</p>
                  <p className="text-sm font-medium text-primary">{detailItem.responseCount}</p>
                </div>
              </div>

              {detailItem.shareUrl && (
                <div className="rounded-lg border border-secondary p-3">
                  <p className="text-xs text-secondary mb-1.5">Shareable Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={detailItem.shareUrl}
                      className="flex-1 rounded-md border border-secondary bg-gray-50 px-2.5 py-1.5 text-xs text-primary dark:bg-gray-800"
                    />
                    <Button size="sm" color="secondary" iconLeading={Copy01} onClick={() => handleCopyLink(detailItem.shareUrl!)}>
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-sm text-tertiary">{detailItem.detail}</p>
            </div>
            <div className="border-t border-secondary px-5 py-3">
              <Button size="sm" color="secondary" onClick={() => setDetailItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
