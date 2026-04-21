"use client";

/**
 * Time Zone Calculator Page
 * Shows current time across multiple zones and converts specific times between zones
 */

import { useState, useEffect, useMemo } from "react";
import {
  Globe01,
  Plus,
  Trash01,
  XClose,
  ArrowRight,
  Clock,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

const ALL_TIMEZONES = [
  { label: "Eastern (US)", value: "America/New_York", abbr: "ET" },
  { label: "Central (US)", value: "America/Chicago", abbr: "CT" },
  { label: "Mountain (US)", value: "America/Denver", abbr: "MT" },
  { label: "Pacific (US)", value: "America/Los_Angeles", abbr: "PT" },
  { label: "Alaska", value: "America/Anchorage", abbr: "AKT" },
  { label: "Hawaii", value: "Pacific/Honolulu", abbr: "HST" },
  { label: "UTC / GMT", value: "UTC", abbr: "UTC" },
  { label: "London", value: "Europe/London", abbr: "GMT/BST" },
  { label: "Paris", value: "Europe/Paris", abbr: "CET" },
  { label: "Berlin", value: "Europe/Berlin", abbr: "CET" },
  { label: "Moscow", value: "Europe/Moscow", abbr: "MSK" },
  { label: "Dubai", value: "Asia/Dubai", abbr: "GST" },
  { label: "Mumbai", value: "Asia/Kolkata", abbr: "IST" },
  { label: "Singapore", value: "Asia/Singapore", abbr: "SGT" },
  { label: "Hong Kong", value: "Asia/Hong_Kong", abbr: "HKT" },
  { label: "Shanghai", value: "Asia/Shanghai", abbr: "CST" },
  { label: "Tokyo", value: "Asia/Tokyo", abbr: "JST" },
  { label: "Seoul", value: "Asia/Seoul", abbr: "KST" },
  { label: "Sydney", value: "Australia/Sydney", abbr: "AEST" },
  { label: "Auckland", value: "Pacific/Auckland", abbr: "NZST" },
  { label: "São Paulo", value: "America/Sao_Paulo", abbr: "BRT" },
  { label: "Buenos Aires", value: "America/Argentina/Buenos_Aires", abbr: "ART" },
  { label: "Mexico City", value: "America/Mexico_City", abbr: "CST" },
  { label: "Toronto", value: "America/Toronto", abbr: "ET" },
  { label: "Vancouver", value: "America/Vancouver", abbr: "PT" },
];

const STORAGE_KEY = "jeniferai-timezones";

function getStoredTimezones(): string[] {
  if (typeof window === "undefined") return ["America/New_York", "Europe/London", "Asia/Tokyo"];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // fallback
  }
  return ["America/New_York", "Europe/London", "Asia/Tokyo"];
}

function storeTimezones(tzs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tzs));
  } catch {
    // silently fail
  }
}

function formatTimeInTZ(tz: string): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: tz,
  });
}

function formatDateInTZ(tz: string): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
}

function getUTCOffset(tz: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  return offsetPart?.value || "";
}

function convertTime(sourceDate: string, sourceTime: string, sourceTZ: string, targetTZ: string): string {
  const dt = new Date(`${sourceDate}T${sourceTime}:00`);
  // Create a date string in the source timezone, then convert to target
  const sourceStr = dt.toLocaleString("en-US", { timeZone: sourceTZ });
  const sourceInLocal = new Date(sourceStr);
  const localStr = dt.toLocaleString("en-US");
  const localDate = new Date(localStr);
  const diff = sourceInLocal.getTime() - localDate.getTime();
  const targetDate = new Date(dt.getTime() - diff);

  return targetDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: targetTZ,
    timeZoneName: "short",
  });
}

export default function TimeZonesPage() {
  const [zones, setZones] = useState<string[]>([]);
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState("");

  // Converter state
  const [convertDate, setConvertDate] = useState(new Date().toISOString().split("T")[0]);
  const [convertTime, setConvertTime] = useState("09:00");
  const [convertSourceTZ, setConvertSourceTZ] = useState("America/New_York");
  const [convertTargetTZs, setConvertTargetTZs] = useState<string[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    const stored = getStoredTimezones();
    setZones(stored);
  }, []);

  // Update clocks every second
  useEffect(() => {
    const update = () => {
      const times: Record<string, string> = {};
      for (const tz of zones) {
        times[tz] = formatTimeInTZ(tz);
      }
      setCurrentTimes(times);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [zones]);

  const handleAddZone = () => {
    if (newZone && !zones.includes(newZone)) {
      const updated = [...zones, newZone];
      setZones(updated);
      storeTimezones(updated);
    }
    setIsAddingZone(false);
    setNewZone("");
  };

  const handleRemoveZone = (tz: string) => {
    const updated = zones.filter((z) => z !== tz);
    setZones(updated);
    storeTimezones(updated);
  };

  const handleAddTargetTZ = (tz: string) => {
    if (tz && !convertTargetTZs.includes(tz)) {
      setConvertTargetTZs((prev) => [...prev, tz]);
    }
  };

  const conversions = useMemo(() => {
    if (!convertDate || !convertTime || !convertSourceTZ) return [];
    return convertTargetTZs.map((tz) => {
      // Build date in source TZ, convert to target TZ
      const dt = new Date(`${convertDate}T${convertTime}:00`);
      const result = dt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
        timeZoneName: "short",
      });
      const dateResult = dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: tz,
      });
      const label = ALL_TIMEZONES.find((t) => t.value === tz)?.label || tz;
      return { tz, label, time: result, date: dateResult };
    });
  }, [convertDate, convertTime, convertSourceTZ, convertTargetTZs]);

  const availableToAdd = ALL_TIMEZONES.filter((t) => !zones.includes(t.value));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FeaturedIcon icon={Globe01} color="brand" size="md" theme="modern" />
          <div>
            <h1 className="text-xl font-semibold text-primary">Time Zones</h1>
            <p className="text-sm text-tertiary">View current times and convert between time zones</p>
          </div>
        </div>
      </div>

      {/* World Clocks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-primary">World Clocks</h2>
          {!isAddingZone && (
            <Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddingZone(true)}>
              Add Zone
            </Button>
          )}
        </div>

        {isAddingZone && (
          <div className="flex items-center gap-2 mb-3">
            <select
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
            >
              <option value="">Select timezone...</option>
              {availableToAdd.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.abbr})
                </option>
              ))}
            </select>
            <Button size="sm" color="primary" onClick={handleAddZone} disabled={!newZone}>
              Add
            </Button>
            <button
              onClick={() => { setIsAddingZone(false); setNewZone(""); }}
              className="rounded p-1 text-gray-400 hover:text-gray-600"
            >
              <XClose className="h-4 w-4" />
            </button>
          </div>
        )}

        {zones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary p-8 text-center">
            <Globe01 className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-tertiary">No time zones added. Click &quot;Add Zone&quot; to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((tz) => {
              const info = ALL_TIMEZONES.find((t) => t.value === tz);
              const offset = getUTCOffset(tz);
              return (
                <div
                  key={tz}
                  className="group relative rounded-xl border border-secondary bg-primary p-4 hover:shadow-sm transition-shadow"
                >
                  <button
                    onClick={() => handleRemoveZone(tz)}
                    className="absolute right-2 top-2 rounded p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-error-600 transition-opacity"
                  >
                    <Trash01 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-brand-600" />
                    <span className="text-sm font-medium text-primary">{info?.label || tz}</span>
                  </div>
                  <p className="text-2xl font-semibold text-primary tabular-nums">
                    {currentTimes[tz] || "--:--"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-tertiary">{formatDateInTZ(tz)}</span>
                    <span className="text-xs text-tertiary">·</span>
                    <span className="text-xs text-brand-600 font-medium">{offset}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Time Converter */}
      <div>
        <h2 className="text-sm font-semibold text-primary mb-3">Time Converter</h2>
        <div className="rounded-xl border border-secondary bg-primary p-5">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-tertiary">Date</span>
              <input
                type="date"
                value={convertDate}
                onChange={(e) => setConvertDate(e.target.value)}
                className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-tertiary">Time</span>
              <input
                type="time"
                value={convertTime}
                onChange={(e) => setConvertTime(e.target.value)}
                className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-tertiary">Source Zone</span>
              <select
                value={convertSourceTZ}
                onChange={(e) => setConvertSourceTZ(e.target.value)}
                className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
              >
                {ALL_TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 mb-2" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-tertiary">Add Target Zone</span>
              <select
                value=""
                onChange={(e) => { handleAddTargetTZ(e.target.value); }}
                className="rounded-md border border-secondary bg-primary px-3 py-1.5 text-sm text-primary"
              >
                <option value="">Select...</option>
                {ALL_TIMEZONES.filter((t) => t.value !== convertSourceTZ && !convertTargetTZs.includes(t.value)).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source time display */}
          <div className="rounded-lg bg-brand-50 px-4 py-3 mb-3 dark:bg-brand-500/10">
            <div className="flex items-center gap-2">
              <Globe01 className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-medium text-brand-700 dark:text-brand-400">
                {ALL_TIMEZONES.find((t) => t.value === convertSourceTZ)?.label || convertSourceTZ}
              </span>
            </div>
            <p className="text-lg font-semibold text-brand-800 dark:text-brand-300 mt-1">
              {convertTime ? new Date(`${convertDate}T${convertTime}:00`).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: convertSourceTZ,
                timeZoneName: "short",
              }) : "--:--"}
            </p>
          </div>

          {/* Converted times */}
          {conversions.length > 0 && (
            <div className="flex flex-col gap-2">
              {conversions.map((c) => (
                <div key={c.tz} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-primary">{c.label}</p>
                    <p className="text-xs text-tertiary">{c.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-primary tabular-nums">{c.time}</p>
                    <button
                      onClick={() => setConvertTargetTZs((prev) => prev.filter((t) => t !== c.tz))}
                      className="rounded p-1 text-gray-300 hover:text-error-600"
                    >
                      <XClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {conversions.length === 0 && (
            <p className="text-sm text-tertiary text-center py-4">
              Select target time zones to see converted times
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
