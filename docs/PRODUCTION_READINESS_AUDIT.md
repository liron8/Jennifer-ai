# Production Readiness Audit — Findings

**Legend:** 🔴 = silent data loss / broken feature / user-visible bug | 🟡 = cosmetic or incomplete feature | 🟢 = production-ready

---

## Severity-ordered summary

### 🔴 MUST FIX before production (silent data loss / broken features)

1. **New Meeting slideout drops `reminder` and `calendar` fields** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/scheduling/calendar/page.tsx:305-319` (`handleCreateMeeting`). Same pattern I fixed for Add Event. User fills these in, app silently ignores.
2. **Meeting Log row action buttons have no handlers** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/scheduling/meeting-log/page.tsx:375-377` (View/Edit/Delete buttons are rendered but do nothing).
3. **Route Planner `handleAddStop` just `console.log`s** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/scheduling/route-planner/page.tsx:296-299`. User adds a stop, it's never saved.
4. **Dead "Add Zoom / Teams / Meet" buttons** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/scheduling/_components/new-meeting-slideout.tsx:272-274`. Buttons exist with no `onClick`.
5. **Route Planner "Get Directions" button** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/scheduling/route-planner/page.tsx:881-883` no `onClick`.
6. **Approvals "View Response" button** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/tasks/approvals/page.tsx:316-322` no `onClick`.
7. **Meeting Log "Filters" button** — line 245 no `onClick`.
8. **Route Planner uses `alert()` for feedback** — 4 instances at lines 354, 407, 423, 438. Should use `notify.*`.

### 🟡 Incomplete features (ship with known limitation)

9. **Key Dates Calendar view is a placeholder** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/key-dates/page.tsx:435-447` shows "Calendar visualization coming soon".
10. **Calendar Insights hardcoded empties** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/reports/calendar-insights/page.tsx:57` empty `topContacts`, lines 60-68 zero heatmap, `change="--"` on all metric cards.
11. **Throughput Team Performance card** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/reports/throughput/page.tsx:223-226` always says "No team performance data available".
12. **Throughput/Calendar Insights date range is hardcoded** — `useState("Last 30 days")` with no picker; only Inbox Insights has a working 7/30/90 day toggle.
13. **Time Zones `convertTime` dead code** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/scheduling/time-zones/page.tsx:98` function declared but never called (UI uses inline logic).
14. **Concierge website shown as plain text** — `@/Users/blackpanther/Desktop/JenAI/apps/web/src/app/(dashboard)/concierge/page.tsx:465` not clickable.
15. **Meeting Tracker has no delete/cancel action** — only copy/view details.

### 🟢 Production-ready

- Scheduling Calendar (after today's fixes)
- Scheduling Time Zones (clocks + converter work)
- Tasks Todo (full CRUD, categories, folders, filters)
- Tasks Approvals (full workflow — except "View Response")
- Tasks Delegations (full lifecycle)
- Key Dates list + card views (calendar view is the placeholder)
- Inbox Insights
- Executives list + detail
- Contacts (CRUD, groups, import, search, sort)
- Concierge (CRUD, favorites, edit)

---

## Fixes applied in this pass (commit after audit)

### Scheduling
- ✅ **New Meeting slideout**: wired `reminder`, `calendar` (executive_id), and `metadata` into API payload (`handleCreateMeeting`).
- ✅ **New Meeting slideout**: removed the three dead "Add Zoom / Teams / Meet" buttons; input placeholder now says "Paste Zoom, Teams, or Meet link".
- ✅ **Meeting Log**: View, Edit, Delete row buttons now wired — View/Edit navigate to calendar with meeting id; Delete opens a `ConfirmDeleteDialog` that calls `DELETE /api/meetings/[id]` (which also cascades to external calendar).
- ✅ **Meeting Log Filters**: replaced dead button with a popover offering Type + Location filters, live-filtering the table and showing active count.
- ✅ **Route Planner `handleAddStop`**: previously only `console.log`'d — now parses the clock/duration, maps type → `meeting_type` enum, and persists via `POST /api/meetings` with `location_type=in_person`. Shows success/error toast.
- ✅ **Route Planner Get Directions**: wired to open `googleMapsUrl` in new tab, disabled when no meetings.
- ✅ **Route Planner alert()**: replaced all 4 `alert()` calls with `notify.*` for consistent UX.

### Tasks
- ✅ **Approvals "View Response"**: dead button replaced with functional Approve + Reject actions when an approval is in `info-requested` state (previously only showed a badge that went nowhere).

## Remaining 🟡 incomplete features (ship-blockers depend on product priority)

These are acknowledged gaps, not silent bugs. The UI shows graceful empty states, so they won't crash — but they need follow-up:

- **Key Dates Calendar view**: "coming soon" placeholder. List + card views are production-ready; the calendar grid view needs a component build.
- **Calendar Insights**: `topContacts` and `peakMeetingHours` heatmap both hardcoded empty (API doesn't return them). Change deltas all show `--` because the API response lacks period-over-period comparison. Fix requires extending `/api/reports/calendar-insights`.
- **Throughput**: "Team Performance" card always empty. Needs API extension for per-user stats.
- **Throughput / Calendar Insights date range**: no picker (Inbox Insights has one — port it).
- **Meeting Tracker**: no delete/cancel action for proposed times / availability / polls.
- **Concierge website**: shown as plain text (minor — easy to make a clickable link).

## Remaining ⚪ not in this pass
- Ask Jenifer (knowledge base sidebar has 6 TODO/mock matches — separate audit pass recommended)
- Settings → Preferences tab (4 matches)
- Contact import mapping step (2 matches)


