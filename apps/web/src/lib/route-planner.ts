export interface StopTimingInput {
  meetingStart: Date;
  travelDurationSeconds: number;
  bufferMinutes: number;
}

export interface StopTimingResult {
  meetingStart: Date;
  travelDurationSeconds: number;
  bufferMinutes: number;
  leaveBy: Date;
}

export function calculateLeaveByTime(input: StopTimingInput): StopTimingResult {
  const totalOffsetMs = (input.travelDurationSeconds + input.bufferMinutes * 60) * 1000;
  return {
    ...input,
    leaveBy: new Date(input.meetingStart.getTime() - totalOffsetMs),
  };
}

export function toTimeInputValue(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function fromDateAndTime(dateIso: string, timeValue: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function addDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function normalizeAddress(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    try {
      const v = value as Record<string, unknown>;
      const joined = [
        v.line1,
        v.line2,
        v.city,
        v.state,
        v.postal_code,
        v.country,
      ]
        .filter(Boolean)
        .map((part) => String(part).trim())
        .filter(Boolean)
        .join(", ");
      return joined || JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function resolveStopNote(
  description: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): string {
  if (description && description.trim()) return description;
  const metaNote = metadata?.route_stop_note;
  return typeof metaNote === "string" ? metaNote : "";
}

