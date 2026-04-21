"use client";

/**
 * Propose Times Panel
 * Allows selecting time slots and generating formatted email text with timezone conversions
 */

import { useState, useMemo } from "react";
import {
  Clock,
  Copy01,
  Plus,
  Trash01,
  XClose,
  Check,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { notify } from "@/lib/notifications";

interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

interface ProposeTimesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  executiveName?: string;
}

const COMMON_TIMEZONES = [
  { label: "Eastern (EST/EDT)", value: "America/New_York" },
  { label: "Central (CST/CDT)", value: "America/Chicago" },
  { label: "Mountain (MST/MDT)", value: "America/Denver" },
  { label: "Pacific (PST/PDT)", value: "America/Los_Angeles" },
  { label: "GMT/UTC", value: "UTC" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris (CET/CEST)", value: "Europe/Paris" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Singapore (SGT)", value: "Asia/Singapore" },
  { label: "Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Sydney (AEST/AEDT)", value: "Australia/Sydney" },
];

const getLocalTZ = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const formatTimeInTZ = (date: string, time: string, tz: string): string => {
  const dt = new Date(`${date}T${time}:00`);
  return dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  });
};

const formatDateForDisplay = (date: string): string => {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export function ProposeTimesPanel({ isOpen, onClose, executiveName }: ProposeTimesPanelProps) {
  const localTZ = getLocalTZ();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timezones, setTimezones] = useState<string[]>([localTZ]);
  const [addingTZ, setAddingTZ] = useState(false);
  const [newTZ, setNewTZ] = useState("");
  const [copied, setCopied] = useState(false);

  // New slot form
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");

  const handleAddSlot = () => {
    setTimeSlots((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
      },
    ]);
  };

  const handleRemoveSlot = (id: string) => {
    setTimeSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddTimezone = () => {
    if (newTZ && !timezones.includes(newTZ)) {
      setTimezones((prev) => [...prev, newTZ]);
    }
    setAddingTZ(false);
    setNewTZ("");
  };

  const handleRemoveTimezone = (tz: string) => {
    if (timezones.length <= 1) return;
    setTimezones((prev) => prev.filter((t) => t !== tz));
  };

  const formattedText = useMemo(() => {
    if (timeSlots.length === 0) return "";

    const name = executiveName || "our team";
    let text = `Here are some times that work for ${name}:\n\n`;

    for (const slot of timeSlots) {
      const dateStr = formatDateForDisplay(slot.date);
      const timeStrs = timezones.map(
        (tz) => formatTimeInTZ(slot.date, slot.startTime, tz)
      );
      text += `- ${dateStr} at ${timeStrs.join(" / ")}\n`;
    }

    text += "\nPlease let me know which works best for you.";
    return text;
  }, [timeSlots, timezones, executiveName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      notify.success("Copied", "Proposed times copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Copy failed", "Could not copy to clipboard.");
    }
  };

  const handleSave = async () => {
    try {
      await fetch("/api/proposed-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Proposed times for ${executiveName || "meeting"}`,
          time_slots: timeSlots.map((s) => ({
            start: `${s.date}T${s.startTime}:00`,
            end: `${s.date}T${s.endTime}:00`,
          })),
          timezone_columns: timezones,
        }),
      });
      notify.success("Saved", "Proposed times saved for tracking.");
    } catch {
      // Non-critical, silently fail
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-900 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-primary">Propose Times</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <XClose className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Add Time Slot */}
          <div>
            <label className="text-sm font-medium text-secondary mb-2 block">Add Time Slot</label>
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
              <Button size="sm" color="secondary" iconLeading={Plus} onClick={handleAddSlot}>
                Add
              </Button>
            </div>
          </div>

          {/* Selected Time Slots */}
          {timeSlots.length > 0 && (
            <div>
              <label className="text-sm font-medium text-secondary mb-2 block">
                Selected Slots ({timeSlots.length})
              </label>
              <ul className="flex flex-col gap-1.5">
                {timeSlots.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{formatDateForDisplay(slot.date)}</span>
                      <span className="text-tertiary">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveSlot(slot.id)}
                      className="rounded p-1 text-gray-400 hover:text-error-600"
                    >
                      <Trash01 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timezones */}
          <div>
            <label className="text-sm font-medium text-secondary mb-2 block">
              Timezone Columns
            </label>
            <div className="flex flex-wrap gap-2">
              {timezones.map((tz) => (
                <span
                  key={tz}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                >
                  {COMMON_TIMEZONES.find((t) => t.value === tz)?.label || tz}
                  {timezones.length > 1 && (
                    <button onClick={() => handleRemoveTimezone(tz)} className="hover:text-brand-900">
                      <XClose className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              {addingTZ ? (
                <div className="flex items-center gap-1">
                  <select
                    value={newTZ}
                    onChange={(e) => setNewTZ(e.target.value)}
                    className="rounded-md border border-secondary bg-primary px-2 py-1 text-xs text-primary"
                  >
                    <option value="">Select timezone</option>
                    {COMMON_TIMEZONES.filter((t) => !timezones.includes(t.value)).map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleAddTimezone} className="rounded p-0.5 text-success-600 hover:bg-success-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setAddingTZ(false)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100">
                    <XClose className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTZ(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-tertiary hover:border-brand-300 hover:text-brand-600 dark:border-gray-600"
                >
                  <Plus className="h-3 w-3" />
                  Add Timezone
                </button>
              )}
            </div>
          </div>

          {/* Formatted Output */}
          {timeSlots.length > 0 && (
            <div>
              <label className="text-sm font-medium text-secondary mb-2 block">
                Generated Text
              </label>
              <div className="rounded-lg border border-secondary bg-gray-50 p-4 dark:bg-gray-800">
                <pre className="whitespace-pre-wrap text-sm text-primary font-sans leading-relaxed">
                  {formattedText}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-secondary px-5 py-3">
          <Button size="sm" color="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {timeSlots.length > 0 && (
              <>
                <Button size="sm" color="secondary" onClick={handleSave}>
                  Save for Tracking
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  iconLeading={copied ? Check : Copy01}
                  onClick={handleCopy}
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
