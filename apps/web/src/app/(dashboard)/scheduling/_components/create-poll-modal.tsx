"use client";

/**
 * Create Meeting Poll Modal
 * Allows creating a Doodle-style poll where participants vote on preferred times
 */

import { useState } from "react";
import {
  BarChartSquare01,
  Plus,
  Trash01,
  XClose,
  Copy01,
  Check,
  Link01,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { notify } from "@/lib/notifications";

interface TimeOption {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDateForDisplay = (date: string): string => {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export function CreatePollModal({ isOpen, onClose }: CreatePollModalProps) {
  const [step, setStep] = useState<"create" | "share">("create");
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // New option form
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");

  const handleAddOption = () => {
    setTimeOptions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      },
    ]);
  };

  const handleRemoveOption = (id: string) => {
    setTimeOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim() || timeOptions.length < 2) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/meeting-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          duration_minutes: durationMinutes,
          time_options: timeOptions.map((o) => ({
            date: o.date,
            start_time: o.start_time,
            end_time: o.end_time,
          })),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const linkToken = result.data?.data?.link_token ?? result.data?.link_token;
        const url = `${window.location.origin}/poll/${linkToken}`;
        setShareUrl(url);
        setStep("share");
        notify.success("Poll created", "Share the link with participants.");
      } else {
        notify.error("Error", "Failed to create poll.");
      }
    } catch {
      notify.error("Error", "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notify.success("Copied", "Poll link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Copy failed", "Could not copy to clipboard.");
    }
  };

  const handleClose = () => {
    setStep("create");
    setTitle("");
    setDurationMinutes(30);
    setTimeOptions([]);
    setShareUrl("");
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20" onClick={handleClose}>
      <div
        className="mx-4 w-full max-w-xl rounded-xl bg-white shadow-xl dark:bg-gray-900 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
          <div className="flex items-center gap-2">
            <BarChartSquare01 className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-primary">
              {step === "create" ? "Create Meeting Poll" : "Poll Created!"}
            </h2>
          </div>
          <button onClick={handleClose} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <XClose className="h-5 w-5" />
          </button>
        </div>

        {step === "create" ? (
          <div className="p-5 flex flex-col gap-5">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-secondary mb-1.5 block">Meeting Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q2 Planning Session"
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-secondary mb-1.5 block">Meeting Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
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

            {/* Add Time Option */}
            <div>
              <label className="text-sm font-medium text-secondary mb-2 block">
                Proposed Time Options (min 2)
              </label>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-tertiary">Date</span>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-tertiary">Start</span>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-tertiary">End</span>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
                  />
                </div>
                <Button size="sm" color="secondary" iconLeading={Plus} onClick={handleAddOption}>
                  Add
                </Button>
              </div>
            </div>

            {/* Listed Options */}
            {timeOptions.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {timeOptions.map((opt, idx) => (
                  <li key={opt.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{formatDateForDisplay(opt.date)}</span>
                      <span className="text-tertiary">
                        {opt.start_time} – {opt.end_time}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveOption(opt.id)}
                      className="rounded p-1 text-gray-400 hover:text-error-600"
                    >
                      <Trash01 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* Share Step */
          <div className="p-5 flex flex-col gap-4">
            <div className="rounded-lg border border-secondary bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm text-secondary mb-2">Share this link with participants:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-md border border-secondary bg-white px-3 py-2 text-sm text-primary dark:bg-gray-900"
                />
                <Button
                  size="sm"
                  color="primary"
                  iconLeading={copied ? Check : Copy01}
                  onClick={handleCopyLink}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-tertiary">
              Participants will see the proposed time options and can vote on which ones work for them.
              View responses in the Meeting Tracker.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-secondary px-5 py-3">
          <Button size="sm" color="secondary" onClick={handleClose}>
            {step === "share" ? "Done" : "Cancel"}
          </Button>
          {step === "create" && (
            <Button
              size="sm"
              color="primary"
              onClick={handleCreate}
              disabled={!title.trim() || timeOptions.length < 2 || isSubmitting}
              iconLeading={Link01}
            >
              {isSubmitting ? "Creating..." : "Create Poll & Get Link"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
