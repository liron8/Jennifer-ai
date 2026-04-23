import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLeaveByTime,
  normalizeAddress,
  resolveStopNote,
} from "./route-planner";

test("calculateLeaveByTime subtracts travel and buffer", () => {
  const meetingStart = new Date("2026-04-22T10:00:00.000Z");
  const result = calculateLeaveByTime({
    meetingStart,
    travelDurationSeconds: 20 * 60,
    bufferMinutes: 10,
  });
  assert.equal(result.leaveBy.toISOString(), "2026-04-22T09:30:00.000Z");
});

test("normalizeAddress supports structured address objects", () => {
  const value = normalizeAddress({
    line1: "123 Main St",
    city: "Austin",
    state: "TX",
    postal_code: "78701",
  });
  assert.equal(value, "123 Main St, Austin, TX, 78701");
});

test("resolveStopNote prefers description and falls back to metadata", () => {
  assert.equal(resolveStopNote("Use garage B", { route_stop_note: "Fallback note" }), "Use garage B");
  assert.equal(resolveStopNote("", { route_stop_note: "Lobby desk check-in" }), "Lobby desk check-in");
});

