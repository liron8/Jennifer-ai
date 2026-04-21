"use client";

/**
 * Share Availability Modal
 * Allows users to create shareable availability links
 */

import { useState } from "react";
import {
  Calendar,
  Clock,
  Copy01,
  Check,
  Link01,
  XClose,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { notify } from "@/lib/notifications";

interface ShareAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareAvailabilityModal({ isOpen, onClose }: ShareAvailabilityModalProps) {
  const [title, setTitle] = useState("");
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 8);
    return d.toISOString().split("T")[0];
  });
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Availability",
          date_range_start: dateStart,
          date_range_end: dateEnd,
          time_window_start: timeStart,
          time_window_end: timeEnd,
          slot_duration_minutes: slotDuration,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const data = result.data?.data ?? result.data;
        const token = data?.link_token;
        const link = `${window.location.origin}/availability/${token}`;
        setGeneratedLink(link);
        notify.success("Link created", "Your availability link is ready to share.");
      } else {
        notify.error("Error", "Failed to create availability link.");
      }
    } catch {
      notify.error("Error", "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      notify.success("Copied", "Link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Copy failed", "Could not copy to clipboard.");
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setTitle("");
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20" onClick={handleClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
          <div className="flex items-center gap-2">
            <Link01 className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-primary">Share Availability</h2>
          </div>
          <button onClick={handleClose} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <XClose className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {!generatedLink ? (
            <>
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Meeting with Client"
                  className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                  />
                </div>
              </div>

              {/* Time Window */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    Available From
                  </label>
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    Available Until
                  </label>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">Slot Duration</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </>
          ) : (
            /* Generated Link */
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
                <Check className="h-6 w-6 text-success-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">Link Created!</p>
                <p className="text-sm text-tertiary mt-1">Share this link with anyone to let them view your availability.</p>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-primary outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-secondary px-5 py-3">
          <Button size="sm" color="secondary" onClick={handleClose}>
            {generatedLink ? "Done" : "Cancel"}
          </Button>
          {!generatedLink && (
            <Button size="sm" color="primary" onClick={handleCreate} isDisabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Generate Link"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
