"use client";

/**
 * Public Meeting Poll Page
 * Allows participants to vote on their preferred meeting times
 * No authentication required
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface TimeOption {
  date: string;
  start_time: string;
  end_time: string;
}

interface MeetingPoll {
  id: string;
  title: string;
  duration_minutes: number;
  time_options: TimeOption[];
  status: string;
}

const formatDateForDisplay = (date: string): string => {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const formatTimeForDisplay = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const dt = new Date();
  dt.setHours(h, m, 0);
  return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export default function PublicPollPage() {
  const params = useParams();
  const token = params.token as string;
  const [poll, setPoll] = useState<MeetingPoll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    async function fetchPoll() {
      try {
        const res = await fetch(`/api/meeting-polls/${token}`);
        if (res.ok) {
          const result = await res.json();
          setPoll(result.data?.data ?? result.data);
        } else {
          setError("This poll is invalid or has expired.");
        }
      } catch {
        setError("Failed to load poll.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPoll();
  }, [token]);

  const toggleOption = (index: number) => {
    setSelectedOptions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || selectedOptions.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/meeting-polls/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondent_name: name.trim(),
          respondent_email: email.trim() || undefined,
          selected_options: selectedOptions,
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
          <p className="text-sm text-gray-500">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Poll Not Found</h1>
          <p className="text-gray-500">{error || "This poll may have expired."}</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vote Submitted!</h1>
          <p className="text-gray-500">
            Your preferences have been recorded. The organizer will choose the best time based on all responses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 mb-3">
            <span className="text-lg font-bold text-purple-600">J</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{poll.title}</h1>
          <p className="text-gray-500 mt-1">
            Vote for the time(s) that work for you
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {poll.duration_minutes} minute meeting · Select all that apply
          </p>
        </div>

        {/* Time Options */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5 mb-6">
          <div className="flex flex-col gap-2">
            {poll.time_options.map((option, idx) => {
              const isSelected = selectedOptions.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleOption(idx)}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-purple-600 bg-purple-50 ring-2 ring-purple-200"
                      : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? "border-purple-600 bg-purple-600"
                      : "border-gray-300"
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateForDisplay(option.date)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTimeForDisplay(option.start_time)} – {formatTimeForDisplay(option.end_time)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Response Form */}
        {selectedOptions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Your Information ({selectedOptions.length} option{selectedOptions.length > 1 ? "s" : ""} selected)
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
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isSubmitting}
                className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Vote"}
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
