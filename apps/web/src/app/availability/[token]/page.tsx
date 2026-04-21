"use client";

/**
 * Public Availability Page
 * Allows recipients to view and select available time slots
 * No authentication required
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

interface AvailabilityLink {
  id: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  time_window_start: string;
  time_window_end: string;
  slot_duration_minutes: number;
  status: string;
}

interface TimeSlot {
  date: string;
  time: string;
  label: string;
}

export default function PublicAvailabilityPage() {
  const params = useParams();
  const token = params.token as string;
  const [link, setLink] = useState<AvailabilityLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    async function fetchLink() {
      try {
        const res = await fetch(`/api/availability/${token}`);
        if (res.ok) {
          const result = await res.json();
          setLink(result.data?.data ?? result.data);
        } else {
          setError("This availability link is invalid or has expired.");
        }
      } catch {
        setError("Failed to load availability.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchLink();
  }, [token]);

  // Generate time slots
  const slots = useMemo(() => {
    if (!link) return [];

    const result: TimeSlot[] = [];
    const startDate = new Date(link.date_range_start + "T00:00:00");
    const endDate = new Date(link.date_range_end + "T00:00:00");
    const [startH, startM] = link.time_window_start.split(":").map(Number);
    const [endH, endM] = link.time_window_end.split(":").map(Number);
    const duration = link.slot_duration_minutes;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = d.toISOString().split("T")[0];
      let currentMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      while (currentMin + duration <= endMin) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const displayTime = new Date(`${dateStr}T${timeStr}:00`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        result.push({
          date: dateStr,
          time: timeStr,
          label: displayTime,
        });
        currentMin += duration;
      }
    }

    return result;
  }, [link]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of slots) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }
    return grouped;
  }, [slots]);

  const toggleSlot = (key: string) => {
    setSelectedSlots((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || selectedSlots.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/availability/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondent_name: name.trim(),
          respondent_email: email.trim() || undefined,
          selected_slots: selectedSlots.map((key) => {
            const [date, time] = key.split("_");
            return { date, time };
          }),
          message: message.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        alert("Failed to submit. Please try again.");
      }
    } catch {
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Availability Not Found</h1>
          <p className="text-gray-500">{error || "This link may have expired."}</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Times Submitted!</h1>
          <p className="text-gray-500">
            Your preferred times have been sent. You&apos;ll receive a confirmation once a time is selected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 mb-3">
            <span className="text-lg font-bold text-purple-600">J</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{link.title || "Select a Time"}</h1>
          <p className="text-gray-500 mt-1">
            Choose your preferred time slot(s) below
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {link.slot_duration_minutes} minute slots
          </p>
        </div>

        {/* Time Grid */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5 mb-6">
          {Object.entries(slotsByDate).map(([date, dateSlots]) => (
            <div key={date} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="flex flex-wrap gap-2">
                {dateSlots.map((slot) => {
                  const key = `${slot.date}_${slot.time}`;
                  const isSelected = selectedSlots.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSlot(key)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                          : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50/50"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Response Form */}
        {selectedSlots.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Your Information ({selectedSlots.length} time{selectedSlots.length > 1 ? "s" : ""} selected)
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name *"
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                required
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional)"
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message (optional)"
                rows={2}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isSubmitting}
                className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Confirm Selection"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by JeniferAI
        </p>
      </div>
    </div>
  );
}
