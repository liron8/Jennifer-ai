# JenniferAI — Implementation Update v2 (Feb 27, 2026)

> **Source:** Four client Loom feedback recordings (February 27, 2026)
> **Purpose:** Comprehensive implementation guide for Cursor AI — work through each phase sequentially.
> **Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + RLS), Vercel AI SDK, Tailwind + shadcn/ui
> **Important:** Before implementing any change, always check the existing database schema, component structure, and API routes first. Never assume — verify.

---

## How to Use This Document

1. **Work phase by phase.** Complete all items in Phase 1 before moving to Phase 2, etc.
2. **For each issue:** Read the full description, check the current codebase, implement, then verify using the test steps provided.
3. **Database changes:** Always create Supabase migrations. Never modify the database manually or skip RLS policies.
4. **After each fix:** Run the app locally and test the specific functionality. Confirm nothing else broke.
5. **Commit often:** One commit per issue (or logical group of related issues).

---

## PHASE 1 — Critical Bugs & Broken Core Features

> These are things that are currently broken, crashing, or non-functional. Fix these FIRST — they block the client from basic usage.

---

### P1-01: Contacts — Edit Button Does Not Work

**Module:** Contacts
**Type:** Bug
**Severity:** Critical

**Current Behavior:** The edit button on a contact detail view does not allow editing. It appears to function as a "save" button instead. Users cannot modify any contact information after initial creation.

**Expected Behavior:** Clicking the "Edit" button should toggle the contact detail view into edit mode, making all fields editable. There should be separate "Save" and "Cancel" buttons that appear in edit mode.

**Implementation Steps:**
1. Find the contact detail component (likely in `/app/(dashboard)/contacts/` or similar).
2. Add an `isEditing` state variable (boolean, default `false`).
3. Wire the "Edit" button to set `isEditing = true`.
4. When `isEditing` is `true`: render all fields as input/select elements pre-filled with current values. Show "Save" and "Cancel" buttons. Hide the "Edit" button.
5. "Save" calls the Supabase update endpoint for the contact record, then sets `isEditing = false`.
6. "Cancel" discards changes and sets `isEditing = false`.

**Verification:**
- [ ] Click "Edit" → fields become editable
- [ ] Change a field, click "Save" → data persists on page refresh
- [ ] Click "Edit" then "Cancel" → no changes saved
- [ ] RLS policy allows update only for the contact's organization

---

### P1-02: Contacts — Click Opens Detail Instead of Selecting

**Module:** Contacts
**Type:** Bug
**Severity:** High

**Current Behavior:** Clicking anywhere on a contact row selects it (as if checking a checkbox). The user cannot open the contact detail view by clicking on the row.

**Expected Behavior:** Clicking on a contact row should open the contact detail panel/page (same as the current detail view). ONLY clicking the checkbox should select the contact for bulk actions.

**Implementation Steps:**
1. Locate the contacts list component.
2. Separate the click handlers: the entire row `onClick` should navigate to or open the contact detail. The checkbox `onClick` should handle selection (with `e.stopPropagation()` to prevent the row click from firing).
3. Ensure the row has a pointer cursor and the checkbox area is visually distinct.

**Verification:**
- [ ] Click on a contact name/row → contact detail opens
- [ ] Click on the checkbox → contact is selected (checkbox fills), detail does NOT open
- [ ] Select multiple contacts via checkboxes → bulk action bar appears (if applicable)

---

### P1-03: Executive Profiles — Cannot Edit After Creation

**Module:** Executive Profiles
**Type:** Bug
**Severity:** Critical

**Current Behavior:** Once an executive profile is created through onboarding, fields cannot be edited. All profile sections are read-only with no edit mechanism.

**Expected Behavior:** All sections of the executive profile should be fully editable at any time.

**Implementation Steps:**
1. Review the executive profile page component.
2. For each section (basic info, contact info, preferences, travel, medical, etc.), add an edit toggle or inline editing capability.
3. Each section should have its own "Edit" / "Save" / "Cancel" flow.
4. Wire "Save" to the appropriate Supabase update endpoint for that section's table.
5. Ensure the profile picture can also be uploaded/changed (see P1-04).

**Verification:**
- [ ] Navigate to any executive profile → each section shows an "Edit" button or pencil icon
- [ ] Click Edit on any section → fields become editable
- [ ] Save changes → they persist on refresh
- [ ] Cancel → reverts to original data

---

### P1-04: Executive Profile — Profile Picture Cannot Be Added or Modified

**Module:** Executive Profiles
**Type:** Bug
**Severity:** High

**Current Behavior:** There is no way to upload, add, or modify the executive's profile picture. The avatar area does not respond to clicks. Additionally, when no picture exists, the initials displayed do not match the executive's actual name.

**Expected Behavior:**
1. Clicking the avatar area should open a file picker to upload an image.
2. Uploaded images should be stored in Supabase Storage and the URL saved to the executive's profile record.
3. When no picture is set, the initials shown should be derived from the executive's **actual first and last name** (e.g., "John Smith" → "JS").
4. The profile picture should sync and display correctly in BOTH the profile page header AND the sidebar/navigation avatar.

**Implementation Steps:**
1. Add an `onClick` handler to the avatar component that triggers a hidden `<input type="file" accept="image/*">`.
2. On file selection, upload to Supabase Storage bucket (e.g., `avatars/`).
3. Save the public URL to the executive's profile record (`avatar_url` column).
4. For the initials fallback, parse the executive's `full_name` or `first_name` + `last_name` fields (NOT hardcoded or random).
5. Ensure both the profile page avatar AND the sidebar avatar read from the same `avatar_url` field.

**Verification:**
- [ ] Click avatar → file picker opens
- [ ] Upload image → it displays immediately in both locations
- [ ] Delete image → initials fallback shows correct initials matching the name
- [ ] Refresh page → uploaded image persists

---

### P1-05: Memberships — Cannot Edit After Adding

**Module:** Executive Profiles → Memberships
**Type:** Bug
**Severity:** High

**Current Behavior:** Once a membership or loyalty program entry is added to an executive profile, it cannot be edited or updated.

**Expected Behavior:** Each membership entry should have an "Edit" action (pencil icon or button) that opens the entry for modification. Fields include: program name, membership number, tier/status, expiration date.

**Implementation Steps:**
1. Locate the memberships list component within the executive profile.
2. Add an edit button/icon to each membership row.
3. On click, switch that row to edit mode (inline editing or open a modal pre-filled with current values).
4. Wire "Save" to a Supabase `UPDATE` call on the memberships table, scoped by membership ID.
5. Also ensure the "Delete" action works if it doesn't already.

**Verification:**
- [ ] Click edit on a membership → fields become editable
- [ ] Change values and save → persists on refresh
- [ ] Cancel edit → reverts to original
- [ ] Delete a membership → it's removed from the list and database

---

### P1-06: Approvals — Multiple Broken Functions

**Module:** Task Hub → Approvals
**Type:** Bug
**Severity:** Critical

**Current Behavior:** Multiple critical functions in the Approvals module are broken:
1. The "Request Info" button does nothing when clicked.
2. When approving an item, it does NOT log the approval or move the item to the "Approved" tab.
3. The rejection flow is similarly broken — items don't move to "Rejected."
4. Tab counters do not reflect actual counts.
5. The "All" tab breaks/crashes when clicked.

**Expected Behavior:**
1. "Request Info" should open a form/modal to send an information request back to the submitter (or at minimum, mark the approval as "Pending Info").
2. Clicking "Approve" should update the approval's status to `approved` in the database, add a timestamp, log who approved it, and move it to the "Approved" tab.
3. Clicking "Reject" should update status to `rejected`, require a reason (optional but recommended), and move to "Rejected" tab.
4. Tab counters should show: Pending (count), Approved (count), Rejected (count), All (total).
5. "All" tab should display all approvals regardless of status.

**Implementation Steps:**
1. Check the approvals table schema — ensure there is a `status` column (enum or text: `pending`, `approved`, `rejected`, `info_requested`), `approved_by`, `approved_at`, `rejection_reason` columns.
2. Fix the "Approve" button handler:
   ```
   UPDATE approvals SET status = 'approved', approved_by = current_user_id, approved_at = NOW() WHERE id = approval_id
   ```
3. Fix the "Reject" button handler similarly with `status = 'rejected'` and a reason field.
4. Fix "Request Info" to set `status = 'info_requested'`.
5. Fix tab filtering — each tab should filter by status. "All" should have no status filter.
6. Fix counters — query count for each status and display on the tab labels.
7. Debug the "All" tab crash — likely a missing null check or filter issue.

**Verification:**
- [ ] Create a test approval → it appears under "Pending" with counter = 1
- [ ] Approve it → it moves to "Approved" tab, "Pending" counter decrements, "Approved" increments
- [ ] Create another, reject it → it moves to "Rejected" tab with reason
- [ ] Click "All" → shows all approvals across all statuses without crashing
- [ ] "Request Info" → status changes appropriately

---

### P1-07: Meeting Log — Counters Don't Work, "All" Tab Broken

**Module:** Scheduling → Meeting Log
**Type:** Bug
**Severity:** High

**Current Behavior:** The meeting log tab counters don't display correct numbers. Past meetings don't appear under the "All" tab. One counter doesn't work at all.

**Expected Behavior:** Counters should accurately reflect the number of meetings in each category (Upcoming, Past, All). The "All" tab should display every meeting regardless of date — both past and future.

**Implementation Steps:**
1. Check the meeting log query — ensure the "All" query does NOT have a date filter (it should fetch all records).
2. For "Upcoming," filter where `meeting_date >= NOW()`.
3. For "Past," filter where `meeting_date < NOW()`.
4. Counter for each tab = the count of records matching that filter.
5. Ensure the component re-fetches or recomputes counts when the data changes.

**Verification:**
- [ ] Meetings with past dates appear under "Past" tab with correct count
- [ ] Future meetings appear under "Upcoming" with correct count
- [ ] "All" tab shows every meeting, counter = Past + Upcoming totals
- [ ] Counters update in real-time when a meeting is added/removed

---

### P1-08: To-Do — Search Bar Crashes the System

**Module:** Task Hub → To-Do
**Type:** Bug
**Severity:** Critical

**Current Behavior:** Typing in the search bar within the task management/to-do section crashes the entire application.

**Expected Behavior:** The search bar should filter the task list in real-time as the user types, without any errors or crashes.

**Implementation Steps:**
1. Locate the search input component in the to-do section.
2. Check for common crash causes:
   - Uncontrolled input (missing `value` or `onChange`).
   - Filtering on `undefined` or `null` task properties.
   - Missing null checks when accessing nested properties (e.g., `task.title.toLowerCase()` when `task.title` is `null`).
   - Infinite re-render loop from improper state updates.
3. Add debouncing (300ms) to the search input to prevent excessive re-renders.
4. Add a try-catch or error boundary around the task list component.
5. Add null/undefined checks on all fields being searched.

**Verification:**
- [ ] Type in search bar → tasks filter without crashing
- [ ] Clear search → all tasks reappear
- [ ] Search for a non-existent term → shows empty state, no crash
- [ ] Rapidly type/delete → no performance issues or crashes

---

### P1-09: To-Do — Completed Tasks Don't Move to Done Section

**Module:** Task Hub → To-Do
**Type:** Bug
**Severity:** High

**Current Behavior:** When a task is marked as "done" (checkbox or status change), it stays in its current position in the list. It does not move to a "Done" or "Completed" section.

**Expected Behavior:** Marking a task as done should immediately move it to a "Done" category/section at the bottom of the list (or a separate "Done" tab), visually separating active and completed tasks.

**Implementation Steps:**
1. When the task status is updated to `completed`/`done`, update the database record.
2. In the task list rendering, separate tasks into two groups: active (status != 'completed') and completed (status == 'completed').
3. Render active tasks first, then a "Done" divider/section, then completed tasks.
4. Optionally add a brief animation/transition when a task moves to the done section.

**Verification:**
- [ ] Mark a task as done → it immediately moves to the "Done" section
- [ ] Unmark a done task → it returns to the active section
- [ ] Done section shows at the bottom, visually distinct (e.g., strikethrough text, muted colors)

---

### P1-10: Concierge — Cannot Edit Items or Assign Contacts

**Module:** Concierge
**Type:** Bug
**Severity:** High

**Current Behavior:** Items in the Concierge module cannot be edited after creation. There is also no ability to assign a contact from the CRM/contacts system to a concierge item.

**Expected Behavior:**
1. Each concierge item should have an "Edit" action to modify its details.
2. There should be an "Assign Contact" field/button that opens the contacts list and allows linking a CRM contact to the concierge item.

**Implementation Steps:**
1. Add edit functionality to concierge items (edit button → editable form → save/cancel).
2. Add a `contact_id` foreign key column to the concierge items table (if not already present) that references the contacts table.
3. Add a contact picker/selector component (searchable dropdown of existing contacts).
4. On save, store the selected `contact_id` with the concierge item.
5. Display the assigned contact's name on the concierge item card/row.

**Verification:**
- [ ] Click edit on a concierge item → fields become editable
- [ ] Save edited item → changes persist
- [ ] Assign a contact → contact name displays on the item
- [ ] Change assigned contact → updates correctly

---

### P1-11: Filter & Sort Button Does Not Work

**Module:** Task Hub (To-Do, Approvals, Delegations)
**Type:** Bug
**Severity:** Medium

**Current Behavior:** The "Filter & Sort" button in the task management views does not function.

**Expected Behavior:** The button should open a dropdown/panel with filter options (by status, priority, assigned to, due date, etc.). Per client feedback, **rename this button to just "Filter"** (remove "& Sort").

**Implementation Steps:**
1. Rename the button label from "Filter & Sort" to "Filter."
2. Wire the button to open a filter dropdown/popover.
3. Include filter options relevant to the module: Status, Priority, Assigned To, Due Date range, Category/Folder.
4. Apply selected filters to the list query.
5. Show active filter indicators (e.g., badge count on the filter button).

**Verification:**
- [ ] Button reads "Filter" (not "Filter & Sort")
- [ ] Click button → filter options appear
- [ ] Select a filter → list updates accordingly
- [ ] Clear filters → full list returns

---

### P1-12: Subtasks — Cannot Edit After Adding

**Module:** Task Hub → To-Do → Subtasks
**Type:** Bug
**Severity:** Medium

**Current Behavior:** Once a subtask is added to a task, it cannot be edited or modified.

**Expected Behavior:** Each subtask should be editable (click to edit inline, or an edit icon that opens edit mode). Users should be able to change the subtask title, and in advanced mode (see P3-11), also change due date and assigned person.

**Implementation Steps:**
1. Add an edit icon/button to each subtask row.
2. On click, convert the subtask text to an editable input.
3. On blur or Enter key, save the changes via Supabase update.
4. On Escape, cancel the edit.

**Verification:**
- [ ] Click edit on a subtask → text becomes editable
- [ ] Change text and save → persists on refresh
- [ ] Press Escape → reverts to original text

---

## PHASE 2 — Missing Functionality & Feature Enhancements

> These are features that don't exist yet or need significant additions. Implement after all Phase 1 bugs are resolved.

---

### P2-01: Contacts — Add New Fields (Birthday, Time Zone, LinkedIn)

**Module:** Contacts
**Type:** Enhancement
**Severity:** High

**Description:** Add three new fields to the contact detail/edit form:
1. **Birthday** — Date picker field.
2. **Time Zone** — Dropdown with standard time zones (e.g., "America/New_York", "Europe/London", etc.).
3. **LinkedIn URL** — Text input for their LinkedIn profile link.

**Database Changes:**
```sql
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
```

**Implementation Steps:**
1. Add the three columns to the contacts table via a Supabase migration.
2. Add the three fields to the contact creation form and detail/edit view.
3. For birthday: use a date picker component. On save, also trigger the Key Dates sync (see P2-02).
4. For time zone: use a searchable dropdown populated with IANA time zones.
5. For LinkedIn: simple text input with URL validation (must start with `https://linkedin.com/` or `https://www.linkedin.com/`).

**Verification:**
- [ ] Create a new contact with all three fields → data saves correctly
- [ ] Edit an existing contact to add these fields → data persists
- [ ] Birthday value appears in Key Dates (see P2-02)
- [ ] LinkedIn URL is clickable/navigable

---

### P2-02: Contacts — Birthday Auto-Syncs to Key Dates

**Module:** Contacts + Key Dates
**Type:** Enhancement
**Severity:** High

**Description:** When a birthday is added or updated on a contact, it should automatically create or update a corresponding entry in the Key Dates module, categorized as "Birthday."

**Implementation Steps:**
1. After saving a contact with a birthday field:
   - Check if a Key Date entry already exists for this contact's birthday (query by `contact_id` + `type = 'birthday'`).
   - If exists: update the date.
   - If not: insert a new Key Date record with `type = 'birthday'`, `name = "[Contact Name]'s Birthday"`, `date = birthday`, `recurring = 'annually'`, `contact_id = contact.id`.
2. If the birthday is removed from a contact, delete the corresponding Key Date entry.
3. In the Key Dates view, birthday entries should display with a birthday icon/tag.

**Verification:**
- [ ] Add a birthday to a contact → Key Date entry appears automatically
- [ ] Change the birthday → Key Date updates
- [ ] Remove the birthday → Key Date is deleted
- [ ] Key Date shows the contact's name and "Birthday" label

---

### P2-03: Contacts — Support Multiple Emails

**Module:** Contacts
**Type:** Enhancement
**Severity:** Medium

**Description:** Allow adding multiple email addresses per contact (e.g., work email, personal email).

**Database Changes:**
Option A (recommended): Create a separate `contact_emails` table:
```sql
CREATE TABLE contact_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  label TEXT DEFAULT 'work', -- 'work', 'personal', 'other'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Option B: Use a JSONB array column on the contacts table.

**Implementation Steps:**
1. Create the `contact_emails` table (or add JSONB column).
2. In the contact form, replace the single email input with a dynamic list. Each entry has: email input + label dropdown (Work, Personal, Other) + a "Primary" radio button + a delete button.
3. Include an "+ Add Email" button to add additional rows.
4. On save, insert/update/delete rows in `contact_emails` as needed.
5. Display the primary email prominently in list views.
6. Apply RLS policies to `contact_emails` matching the contacts table policies.

**Verification:**
- [ ] Add a contact with 2 emails → both save and display
- [ ] Mark one as primary → it shows first in list views
- [ ] Edit an email → change persists
- [ ] Delete an email → it's removed

---

### P2-04: Executive Profile — Add Preferred Name Field

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a "Preferred Name" field to the executive profile. Example: Full name = "Khaled Parek", Preferred name = "KP". The preferred name should be used in greetings and casual display contexts.

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS preferred_name TEXT;
```

**Implementation Steps:**
1. Add the column via migration.
2. Add the field to the executive profile form, positioned between "Full Name" and "Title."
3. Where the executive's name is displayed in casual contexts (dashboard greeting, sidebar), use `preferred_name` if set, otherwise fall back to `first_name`.

**Verification:**
- [ ] Add a preferred name to a profile → it saves
- [ ] Dashboard greeting uses the preferred name
- [ ] If preferred name is empty, the full/first name is used as fallback

---

### P2-05: Executive Profile — Multiple Emails, Phones, and Office Locations

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** High

**Description:** Allow executives to have multiple entries for:
1. **Email addresses** — work, personal, etc.
2. **Phone numbers** — office, mobile, etc.
3. **Office locations** — multiple offices if they work from different locations.

**Implementation Steps:**
For each field type, follow the same pattern:
1. Create a child table (e.g., `executive_emails`, `executive_phones`, `executive_offices`) with a foreign key to `executive_profiles`.
2. Each entry has: value, label (e.g., "Work", "Personal", "HQ", "Remote"), is_primary flag.
3. In the profile form, render a dynamic list with "+ Add" buttons.
4. Each entry has: input field + label dropdown + primary radio + delete button.
5. Apply RLS policies matching the parent table.

**Database Changes:**
```sql
CREATE TABLE executive_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  label TEXT DEFAULT 'work',
  is_primary BOOLEAN DEFAULT false
);

CREATE TABLE executive_phones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  label TEXT DEFAULT 'office',
  is_primary BOOLEAN DEFAULT false
);

CREATE TABLE executive_offices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  is_primary BOOLEAN DEFAULT false
);
```

**Verification:**
- [ ] Add 2 emails, 2 phones, 2 offices → all save correctly
- [ ] Primary designation works for each type
- [ ] Edit/delete individual entries → changes persist

---

### P2-06: Executive Profile — Communication Preferences (Checkboxes)

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a "Communication Preferences" section with checkbox options. The executive selects their preferred communication channels.

**Options:** Email, Slack/Teams, Text, Phone, Other (free text).

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '[]';
-- Stores array like: ["email", "slack_teams", "text"]
```

**Implementation Steps:**
1. Add the column via migration.
2. In the profile form, render a group of checkboxes: Email, Slack/Teams, Text, Phone, Other.
3. If "Other" is checked, show a text input for specifying.
4. Save as a JSONB array of selected values.
5. Display the selected preferences as tags/chips in the profile view.

**Verification:**
- [ ] Select multiple preferences → they save as JSONB array
- [ ] Edit and uncheck some → array updates correctly
- [ ] "Other" shows text input when checked

---

### P2-07: Executive Profile — Meeting Preferences

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a "Meeting Preferences" section with selectable options.

**Options (checkboxes, multiple can be selected):** Morning, Afternoon, Virtual, In-Person.

**Additional Fields:**
- **Typical Meeting Hours** — A time range picker (e.g., 9:00 AM – 5:00 PM) allowing the user to define their preferred meeting window.
- **Time Zone** — Dropdown (IANA time zones).

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS meeting_preferences JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS typical_meeting_hours_start TIME,
ADD COLUMN IF NOT EXISTS typical_meeting_hours_end TIME,
ADD COLUMN IF NOT EXISTS timezone TEXT;
```

**Implementation Steps:**
1. Add columns via migration.
2. Render checkboxes for Morning/Afternoon/Virtual/In-Person.
3. Add two time pickers for "Typical Meeting Hours" (start and end).
4. Add a searchable timezone dropdown.
5. Save all values to the database.

**Verification:**
- [ ] Select meeting preferences → save correctly
- [ ] Set meeting hours range → persists
- [ ] Set timezone → displays correctly

---

### P2-08: Executive Profile — Escalation Rules

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** Medium

**Description:** Add an "Escalation Rules" section where users can define multiple free-text rules. Each rule describes: what qualifies as urgent, and who to loop in when certain things happen.

**Database Changes:**
```sql
CREATE TABLE executive_escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE CASCADE,
  rule_description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Create the table via migration with RLS policies.
2. In the executive profile, add an "Escalation Rules" section.
3. Render a list of existing rules as text blocks, each with edit/delete buttons.
4. Include an "+ Add Rule" button that adds a new text area.
5. Each rule is a free-form text field — the user writes whatever they want (e.g., "If a board member calls, always interrupt my current meeting," "Any expense over $10k needs my direct approval").

**Verification:**
- [ ] Add multiple escalation rules → all save
- [ ] Edit a rule → changes persist
- [ ] Delete a rule → removed from list and database
- [ ] Rules maintain their order

---

### P2-09: Executive Profile — Archive Capability

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** High

**Description:** Add the ability to archive an executive profile (e.g., if the executive leaves the company). Archived profiles should be hidden from active views but not deleted.

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);
```

**Implementation Steps:**
1. Add the columns via migration.
2. Add an "Archive" button to the executive profile actions (in a dropdown menu or as a secondary action).
3. On click, show a confirmation dialog: "Are you sure you want to archive [Name]'s profile? This will hide them from active views."
4. On confirm, set `archived_at = NOW()` and `archived_by = current_user_id`.
5. Update all executive list queries to filter out `WHERE archived_at IS NULL` by default.
6. Add a toggle/filter on the executive list to "Show Archived" profiles.
7. Add an "Unarchive" button on archived profiles.

**Verification:**
- [ ] Archive an executive → they disappear from the active list
- [ ] Toggle "Show Archived" → archived executive appears (visually distinct, e.g., grayed out)
- [ ] Unarchive → executive returns to active list
- [ ] Archived executive's data is fully intact

---

### P2-10: Executive Profile — Direct Reports/Family Linked to Contacts

**Module:** Executive Profiles + Contacts
**Type:** Enhancement
**Severity:** High

**Description:** The "Direct Reports" (renamed to "Stakeholders and Team") and "Family" sections should be linked to the Contacts CRM:
1. When adding a direct report or family member, the user should be able to search and select from existing contacts.
2. If the person is not in contacts, adding them here should also create a contact entry.
3. Clicking on a direct report/family member should open their full contact detail.
4. Phone number field is currently missing from these sections — add it.

**Also:** Rename "Direct Reports" to **"Stakeholders and Team"** throughout the UI.

**Implementation Steps:**
1. Rename the "Direct Reports" label to "Stakeholders and Team" in all UI components and database references (column names can stay but display labels must change).
2. Modify the add flow for stakeholders and family:
   a. Show a searchable contact picker (autocomplete from existing contacts).
   b. If the user selects an existing contact, link by `contact_id`.
   c. If the user types a new name not in contacts, offer to "Create new contact" and create the contact record simultaneously.
3. Store the relationship in a junction table or add a `contact_id` FK to the direct_reports/family table.
4. When displaying a stakeholder or family member, show data pulled from the linked contact (name, email, phone, etc.).
5. Make the name clickable — clicking navigates to the full contact detail view.
6. Ensure phone number is displayed (pull from the linked contact record).

**Verification:**
- [ ] Label reads "Stakeholders and Team" (not "Direct Reports")
- [ ] Add a stakeholder from existing contacts → links correctly
- [ ] Add a new person not in contacts → contact created and linked
- [ ] Click on a stakeholder name → navigates to their contact detail
- [ ] Phone number displays for all entries

---

### P2-11: Executive Profile — Travel Profile (Comprehensive)

**Module:** Executive Profiles → Travel
**Type:** Enhancement
**Severity:** High

**Description:** Significantly expand the travel profile section with all of the following fields:

**A. Home Airports**
- Multi-select or dynamic list of airports (searchable by airport name or IATA code).

**B. Airline Preferences**
- Multi-select from a list: United, American, Delta, JetBlue, Southwest, Alaska, etc.

**C. Hotel Preferences**
- Multi-select from a list: Marriott, Hilton, Hyatt, IHG, Four Seasons, etc.

**D. Flight Class Preferences**
- General preference: Economy, Economy Plus, Premium Economy, Business, First, Private (single select or radio).
- **Domestic Flights** preference: separate selector (e.g., Economy Plus for domestic).
- **International Flights** preference: separate selector (e.g., Business or First for international).

**E. Seat Preference**
- Radio buttons: Aisle, Window, Exit Row.

**F. Rideshare Habits**
- Checkboxes: Uber, Lyft, Other (with text field).

**G. TSA & Global Entry Numbers**
- TSA PreCheck Number (text input).
- Global Entry Number (text input).
- These should be **masked/encrypted** (display as dots, reveal on click — similar to the medical Member ID pattern in P3-04).

**H. Layover Preferences**
- Radio or select: Direct Only, Prefer Nonstop, No connections if possible, Very Short (<1hr), Short (1-2hrs), Medium (2-4hrs).

**I. Advanced Flight Preferences**
- Checkbox: "Avoid red-eye flights."
- "Avoid arrivals before" + Time picker (e.g., 6:00 AM local time).
- "Avoid departures after" + Time picker (e.g., 10:00 PM local time).

**J. Diet & Dietary Restrictions**
- Multi-select from common options: Vegetarian, Vegan, Gluten-Free, Halal, Kosher, Nut-Free, Dairy-Free, Shellfish Allergy, No Pork, Diabetic-Friendly, Low-Sodium, Other (free text).

**K. Favorite Cuisines**
- Multi-select: Italian, Asian, Mexican, Mediterranean, Indian, Japanese, French, American, Middle Eastern, Thai, Chinese, Korean, Other.

**L. Coffee & Tea Orders**
- Coffee order: Free text (e.g., "Oat milk latte, no sugar").
- Tea order: Free text (e.g., "Earl Grey, splash of milk").

**M. Snack Preferences**
- Free text field for listing preferred snacks.

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS home_airports JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS airline_preferences JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS hotel_preferences JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS flight_class_general TEXT,
ADD COLUMN IF NOT EXISTS flight_class_domestic TEXT,
ADD COLUMN IF NOT EXISTS flight_class_international TEXT,
ADD COLUMN IF NOT EXISTS seat_preference TEXT,
ADD COLUMN IF NOT EXISTS rideshare_preferences JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tsa_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS global_entry_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS layover_preference TEXT,
ADD COLUMN IF NOT EXISTS avoid_red_eye BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avoid_arrivals_before TIME,
ADD COLUMN IF NOT EXISTS avoid_departures_after TIME,
ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS favorite_cuisines JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS coffee_order TEXT,
ADD COLUMN IF NOT EXISTS tea_order TEXT,
ADD COLUMN IF NOT EXISTS snack_preferences TEXT;
```

**Implementation Steps:**
1. Run the migration to add all columns.
2. Build the travel profile form with sections A through M as described above.
3. Use appropriate input types: multi-select chips, radio groups, time pickers, text areas.
4. For TSA/Global Entry numbers, store encrypted and display masked (dots), with a toggle eye icon to reveal.
5. Group related fields visually with section headers and dividers.
6. Save all fields to the executive profile record.

**Verification:**
- [ ] Fill out every single field → all save correctly on refresh
- [ ] Edit any field → changes persist
- [ ] TSA/Global Entry numbers display masked, revealed on click
- [ ] Multi-select fields allow adding/removing items

---

### P2-12: Executive Profile — Religion & Auto-Sync Religious Holidays to Key Dates

**Module:** Executive Profiles + Key Dates
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a "Religion" field to the executive profile with options: Muslim, Jewish, Christian, Hindu, Buddhist, Other, Prefer not to disclose. When a religion is selected, automatically add the major holidays for that religion to the Key Dates module.

**Holiday Mapping:**
- **Christian:** Christmas (Dec 25), Easter (variable), Good Friday (variable)
- **Jewish:** Passover (variable), Hanukkah (variable), Rosh Hashanah (variable), Yom Kippur (variable)
- **Muslim:** Eid al-Fitr (variable), Eid al-Adha (variable), Ramadan Start (variable)
- **Hindu:** Diwali (variable), Holi (variable), Navratri (variable)
- **Buddhist:** Vesak (variable)
- (For variable dates, store the next upcoming date and set a yearly recurrence. Consider using a holiday API or pre-computed date tables.)

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS religion TEXT;
```

**Implementation Steps:**
1. Add the religion dropdown to the executive profile form.
2. When a religion is selected and saved:
   - Query Key Dates for existing religion-based entries for this executive.
   - Delete any existing religious holidays (if religion changed).
   - Insert the new religion's holidays as Key Date entries with `type = 'religious_holiday'`, `recurring = 'annually'`, linked to the executive.
3. When "Prefer not to disclose" is selected, remove any previously synced religious holidays.
4. Use hard-coded dates for fixed holidays (Christmas) and calculate or use a reference for variable dates.

**Verification:**
- [ ] Select "Christian" → Christmas, Easter, Good Friday appear in Key Dates
- [ ] Change to "Jewish" → Christian holidays removed, Jewish holidays added
- [ ] Select "Prefer not to disclose" → all religious holidays removed
- [ ] Holidays are set to annually recurring

---

### P2-13: Executive Profile — Approval Threshold (Dollar Value)

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** Medium

**Description:** Add an "Approval Threshold" field — a dollar amount representing the spending limit an EA can approve without needing the executive's direct approval.

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS approval_threshold DECIMAL(12,2);
```

**Implementation Steps:**
1. Add the column via migration.
2. Add a currency input field to the executive profile (with "$" prefix and numeric formatting).
3. Display the threshold prominently in the profile view.
4. In the Approvals module, potentially use this value to flag items that exceed the threshold and require executive sign-off (future enhancement).

**Verification:**
- [ ] Set a threshold of $5,000 → saves correctly
- [ ] Edit the threshold → change persists
- [ ] Displays with proper currency formatting ($5,000.00)

---

### P2-14: Executive Profile — Business & Personal Emergency Contacts

**Module:** Executive Profiles
**Type:** Enhancement
**Severity:** Medium

**Description:** Add two emergency contact sections:

**Business Emergency Contacts** — Roles like: Legal Counsel, CSO, PR, Other. Each entry has: Role, Name, Phone, Email.

**Personal Emergency Contacts** — Standard emergency contacts: Name, Relationship, Phone, Email.

**Database Changes:**
```sql
CREATE TABLE executive_emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executive_id UUID REFERENCES executive_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'business' or 'personal'
  role TEXT, -- for business: 'Legal Counsel', 'CSO', 'PR', etc. For personal: 'Spouse', 'Parent', etc.
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Create the table with RLS policies.
2. Add two collapsible sections to the executive profile: "Business Emergency Contacts" and "Personal Emergency Contacts."
3. Each section has a list of entries and an "+ Add" button.
4. Business contacts show a role dropdown: Legal Counsel, CSO, PR, CFO, Other (free text).
5. Personal contacts show a relationship field: Spouse, Parent, Sibling, Child, Friend, Other.
6. Each entry has: Name, Phone, Email, plus the role/relationship.

**Verification:**
- [ ] Add a business emergency contact with role "Legal Counsel" → saves
- [ ] Add a personal emergency contact → saves
- [ ] Edit either → changes persist
- [ ] Delete either → removed from list and database

---

### P2-15: Executive Profile — Medical Information

**Module:** Executive Profiles → Medical
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a comprehensive medical section:

1. **Carries EpiPen** — Checkbox (yes/no).
2. **Accessibility Needs** — Free text field.
3. **Allergies** — Multi-select + free text for common allergies.
4. **Health Insurance:** Provider name (text), Plan name (text), Member ID/Policy Number (**masked by default**, revealed on click via an eye icon).
5. **Preferred Hospital/Clinic/Urgent Care** — Free text field(s) for listing preferred medical facilities.

**Database Changes:**
```sql
ALTER TABLE executive_profiles
ADD COLUMN IF NOT EXISTS carries_epipen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accessibility_needs TEXT,
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_plan_name TEXT,
ADD COLUMN IF NOT EXISTS insurance_member_id_encrypted TEXT,
ADD COLUMN IF NOT EXISTS preferred_medical_facilities TEXT;
```

**Implementation Steps:**
1. Add columns via migration.
2. Build the medical section in the executive profile form.
3. For "Carries EpiPen": simple toggle/checkbox.
4. For "Member ID / Policy Number": store the value and display it as `••••••••` with an eye icon (👁) toggle button. When clicked, show the actual value. Use basic obfuscation in the UI (the actual value is still in the database, but not visible on screen by default).
5. Wrap the medical section with a visual indicator that this is sensitive information.

**Verification:**
- [ ] Fill out all medical fields → save correctly
- [ ] Member ID shows as dots by default
- [ ] Click eye icon → Member ID is revealed
- [ ] Click again → re-hidden
- [ ] EpiPen checkbox toggles correctly

---

### P2-16: Key Dates — Expanded Recurring Options

**Module:** Key Dates
**Type:** Enhancement
**Severity:** Medium

**Description:** Currently, Key Dates only supports "Yearly" and "Monthly" recurrence. Expand to include: Weekly, Bi-Weekly, Monthly, Quarterly, Bi-Annual, Annually.

**Implementation Steps:**
1. Update the recurring field options in the Key Dates form (dropdown or radio group).
2. Update the database enum or constraint if one exists:
   ```sql
   -- If using an enum, alter it. If using text, just update the UI options.
   -- Options: 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'bi_annual', 'annually', 'none'
   ```
3. Update any reminder/notification logic to handle the new recurrence intervals.
4. Ensure the Key Dates calendar or list view correctly displays the next occurrence for each recurrence type.

**Verification:**
- [ ] Create a key date with each recurrence option → saves correctly
- [ ] Verify next occurrence calculation is correct for bi-weekly, quarterly, bi-annual
- [ ] Edit recurrence on an existing key date → updates correctly

---

### P2-17: To-Do — Add Folders and Task Assignment to Folders

**Module:** Task Hub → To-Do
**Type:** Enhancement
**Severity:** High

**Description:** Add the ability to create folders (categories/groups) and assign tasks to them. This allows organizing tasks by project, context, or any custom grouping.

**Database Changes:**
```sql
CREATE TABLE task_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT, -- optional color coding
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES task_folders(id) ON DELETE SET NULL;
```

**Implementation Steps:**
1. Create the `task_folders` table with RLS policies.
2. Add a `folder_id` column to the tasks table.
3. In the To-Do sidebar or header, add a "Folders" section showing all folders.
4. Add a "+ Create Folder" button with a name input (and optional color picker).
5. In the task creation/edit form, add a "Folder" dropdown to assign the task to a folder.
6. In the task list view, allow filtering by folder (clicking a folder in the sidebar shows only its tasks).
7. Allow moving tasks between folders via drag-and-drop or a "Move to Folder" action.
8. Allow renaming and deleting folders (deleting a folder sets `folder_id = NULL` on its tasks, not deleting the tasks).

**Verification:**
- [ ] Create a folder → appears in sidebar/list
- [ ] Assign a task to a folder → task appears under that folder
- [ ] Filter by folder → only shows assigned tasks
- [ ] Move a task to a different folder → updates correctly
- [ ] Delete a folder → tasks remain but become unassigned

---

### P2-18: Quick Due Dates for Approvals and Delegations

**Module:** Task Hub → Approvals & Delegations
**Type:** Enhancement
**Severity:** Medium

**Description:** The quick due date buttons (Today, Tomorrow, Next Week) that exist on the To-Do task creation form are missing from the Approvals and Delegations creation forms. Add them.

**Implementation Steps:**
1. Extract the quick due date button component into a shared/reusable component if it isn't already.
2. Add it to the Approvals creation form and the Delegations creation form.
3. Behavior: clicking "Today" sets due date to today, "Tomorrow" to tomorrow, "Next Week" to next Monday (or 7 days from now).

**Verification:**
- [ ] Create an approval → quick due date buttons appear and function correctly
- [ ] Create a delegation → quick due date buttons appear and function correctly
- [ ] Selected quick date populates the due date field

---

### P2-19: "Assigned To" Should Show All Users and Contacts

**Module:** Task Hub (To-Do, Approvals, Delegations)
**Type:** Enhancement
**Severity:** High

**Description:** Currently, the "Assigned To" dropdown only shows the current user (yourself). It should show ALL system users in the organization AND contacts from the CRM.

**Implementation Steps:**
1. Modify the "Assigned To" dropdown/selector to query two data sources:
   - **System users:** All users in the same `organization_id` from the users/profiles table.
   - **Contacts:** All contacts in the same organization.
2. Display them in grouped sections: "Team Members" and "Contacts" (or similar labeling).
3. Make the dropdown searchable.
4. Store the assignment as: `assigned_to_user_id` (for system users) or `assigned_to_contact_id` (for contacts). One or the other should be set.
5. Display the assigned person's name and avatar in the task list.

**Verification:**
- [ ] Open "Assigned To" → see all team members and contacts
- [ ] Assign to another team member → saves correctly
- [ ] Assign to a contact → saves correctly
- [ ] Search within the dropdown → filters correctly

---

### P2-20: Subtasks — Advanced Settings (Due Date, Assigned To)

**Module:** Task Hub → To-Do → Subtasks
**Type:** Enhancement
**Severity:** Medium

**Description:** Add advanced settings to subtasks: each subtask should optionally have its own due date and "Assigned To" field, since different subtasks may be assigned to different people.

**Database Changes:**
```sql
ALTER TABLE subtasks
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_to_contact_id UUID REFERENCES contacts(id);
```

**Implementation Steps:**
1. Add the columns via migration.
2. Add an expand/collapse arrow or "..." menu on each subtask that reveals advanced fields: Due Date (date picker) and Assigned To (same selector as P2-19).
3. These fields are optional — subtasks work fine without them.
4. Display due date and assignee in the subtask row when set.

**Verification:**
- [ ] Add a subtask with due date and assignee → saves correctly
- [ ] Edit the subtask's advanced fields → changes persist
- [ ] Subtask without advanced fields still works normally

---

### P2-21: Concierge — Add Favorite Star

**Module:** Concierge
**Type:** Enhancement
**Severity:** Low

**Description:** Add a "Favorite" star/toggle to concierge items so users can mark important vendors, restaurants, or services as favorites for quick access.

**Database Changes:**
```sql
ALTER TABLE concierge_items
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
```

**Implementation Steps:**
1. Add the column via migration.
2. Add a star icon (⭐ or outline star) to each concierge item card/row.
3. Click toggles `is_favorite` in the database.
4. Add a "Favorites" filter or section to quickly view only favorited items.

**Verification:**
- [ ] Click star → item marked as favorite, star fills in
- [ ] Click again → unfavorited
- [ ] Filter by favorites → only favorited items show

---

### P2-22: Calendar — Add "Pending" Column to Meetings

**Module:** Scheduling → Calendar
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a "Pending" status/column to the calendar meetings view. This helps distinguish between confirmed and tentative/pending meetings.

**Implementation Steps:**
1. Add a `status` column to the meetings table if it doesn't exist: `confirmed`, `pending`, `cancelled`.
2. In the meeting list/calendar view, add visual differentiation for pending meetings (e.g., dotted border, different color, "Pending" badge).
3. If there's a meetings list view with columns/tabs, add a "Pending" tab/filter.

**Verification:**
- [ ] Create a meeting with "Pending" status → displays with visual indicator
- [ ] Confirm a pending meeting → status updates, visual changes
- [ ] Filter by pending → only pending meetings show

---

## PHASE 3 — Integrations, Settings & Advanced Features

> These are integration updates, settings enhancements, and advanced features. Implement after Phases 1 and 2.

---

### P3-01: Integrations Page — Fix Icons and Reorder

**Module:** Settings → Integrations
**Type:** UI Fix
**Severity:** Medium

**Description:** The integration icons/pictures on the Integrations page are invalid/broken. Also, the order needs to be changed.

**Required Order:**
1. **Outlook** (first)
2. **Teams**
3. **Zoom**
4. **Google Calendar**
5. **Gmail** — Label as "Coming Soon"
6. **Slack** — Label as "Coming Soon"

**Implementation Steps:**
1. Replace all integration icons with proper, valid images. Use official brand icons:
   - Outlook: Microsoft Outlook logo
   - Teams: Microsoft Teams logo
   - Zoom: Zoom logo
   - Google Calendar: Google Calendar logo
   - Gmail: Gmail logo
   - Slack: Slack logo
2. Store icons in the `/public/` directory or use SVG components.
3. Reorder the integration cards/items to match the specified order.
4. For Gmail and Slack, add a "Coming Soon" badge/overlay that disables the connect button and shows the label.

**Verification:**
- [ ] All 6 integration icons display correctly (no broken images)
- [ ] Order matches: Outlook → Teams → Zoom → Google Calendar → Gmail → Slack
- [ ] Gmail and Slack show "Coming Soon" badge and connect button is disabled

---

### P3-02: Dashboard — Personalized Greeting with First Name and Local Time

**Module:** Dashboard
**Type:** Enhancement
**Severity:** Medium

**Description:** The dashboard greeting should:
1. Show the user's **first name** (e.g., "Good Evening, Sarah").
2. Use the correct time-of-day greeting based on **local time zone** (Good Morning / Good Afternoon / Good Evening).
3. Display the current local time and time zone somewhere visible.

**Implementation Steps:**
1. Fetch the user's first name from the profile/session data.
2. Get the user's local time using `Intl.DateTimeFormat().resolvedOptions().timeZone` or from their profile timezone setting.
3. Determine greeting based on local hour: Morning (5-11), Afternoon (12-16), Evening (17-4).
4. Display: "Good [TimeOfDay], [FirstName]" as the main heading.
5. Below or beside it, show the current time and timezone (e.g., "8:45 PM EST").

**Verification:**
- [ ] Dashboard shows "Good [Afternoon/Morning/Evening], [User's First Name]"
- [ ] Time of day matches the user's actual local time
- [ ] Local time and timezone are displayed

---

### P3-03: Settings — Preferences Section

**Module:** Settings
**Type:** Enhancement
**Severity:** Medium

**Description:** Add a "Preferences" section under Settings → Organization (or as a top-level settings tab) with the following configurable options:

1. **Week Start Day:** Saturday, Sunday, or Monday (dropdown).
2. **Time Format:** 12-hour (AM/PM) or 24-hour (dropdown).
3. **Concierge Categories:** Manage the list of categories available in the Concierge module (add/edit/delete/reorder).
4. **Contact Categories:** Manage the list of categories for contacts.
5. **Key Dates Categories:** Manage the list of categories for Key Dates.
6. **Priority Levels:** Customize priority options. Defaults: Critical, High, Medium, Low. Users can add, rename, reorder, or remove priority levels.
7. **To-Do Customization:** Any additional to-do specific settings (default view, etc.).

**Database Changes:**
```sql
CREATE TABLE organization_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,
  week_start_day TEXT DEFAULT 'monday', -- 'saturday', 'sunday', 'monday'
  time_format TEXT DEFAULT '12h', -- '12h' or '24h'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE category_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  category_type TEXT NOT NULL, -- 'concierge', 'contact', 'key_date', 'priority'
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Create the tables with RLS policies.
2. Seed default category options (the current hardcoded categories) on organization creation.
3. Build a "Preferences" settings page with sections for each configurable area.
4. For category management (concierge, contacts, key dates, priorities): render a sortable list with add/edit/delete. Use drag-and-drop for reordering.
5. Apply the week start day and time format preferences globally: all calendar views, date pickers, and time displays should respect these settings.
6. For priorities: default to Critical, High, Medium, Low. Allow adding custom levels and renaming existing ones.

**Verification:**
- [ ] Change week start day → calendar view updates accordingly
- [ ] Switch time format to 24h → all times display in 24h format throughout the app
- [ ] Add a new concierge category → it appears as an option in the Concierge module
- [ ] Add a custom priority level → it appears in task/approval priority dropdowns
- [ ] Delete a category → it's removed (with confirmation dialog)
- [ ] Reorder categories → new order is reflected in dropdown menus

---

### P3-04: Profile Picture Sync Across the App

**Module:** Global / User Profile
**Type:** Bug Fix
**Severity:** Medium

**Description:** The user's profile picture does not sync across the application. The picture shown in the sidebar/header may differ from the one in the profile page, or may not show at all.

**Implementation Steps:**
1. Ensure there is a single source of truth for the profile picture URL (e.g., `avatar_url` on the user's profile in Supabase).
2. All components that display the user's avatar (sidebar, header, profile page, etc.) should read from this same field.
3. When the picture is updated, invalidate any cached version (React Query cache, local state).
4. Ensure the Supabase Storage bucket has public read access for avatar images (or use signed URLs with appropriate TTL).

**Verification:**
- [ ] Upload a profile picture → it appears in the header, sidebar, and profile page simultaneously
- [ ] Change the picture → all locations update
- [ ] Other users see the correct picture for team members

---

### P3-05: Ask Jennifer — Knowledge Base Sidebar

**Module:** Ask Jennifer (AI Chat)
**Type:** New Feature
**Severity:** High

**Description:** Add a knowledge base sidebar panel to the "Ask Jennifer" AI chat interface. This allows users to provide context to the AI by uploading files, pasting text, and adding links.

**Types of Knowledge:**
1. **Files** — Upload documents (PDF, DOCX, TXT, etc.) that the AI can reference.
2. **Text** — Paste or type freeform text notes that the AI should know about.
3. **Links** — Add URLs to websites that the AI can reference.

**Database Changes:**
```sql
CREATE TABLE knowledge_base_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'file', 'text', 'link'
  title TEXT,
  content TEXT, -- for text type: the actual text. For link type: the URL. For file type: description.
  file_url TEXT, -- for file type: Supabase Storage URL
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Create the table with RLS policies.
2. Build a sidebar panel (collapsible) on the right side of the Ask Jennifer chat interface.
3. The sidebar has three tabs or sections: Files, Text, Links.
4. **Files:** "+ Upload File" button → file picker → upload to Supabase Storage → save record. Display list of uploaded files with name, size, and delete button.
5. **Text:** "+ Add Text" button → opens a text area modal → save content. Display list of text entries with title/preview and view/delete buttons.
6. **Links:** "+ Add Link" button → URL input → save. Display list of links with favicon/title and delete button.
7. Each item shows a "View" action (opens file, shows full text, or opens link) and a "Delete" action (with confirmation).
8. When the AI processes a message, include the knowledge base items as context.

**Verification:**
- [ ] Upload a file → appears in the sidebar list
- [ ] Add a text note → appears in sidebar
- [ ] Add a link → appears in sidebar
- [ ] View each item type → works correctly
- [ ] Delete an item → removed from list and database
- [ ] AI chat uses the knowledge base for context (future enhancement for actual AI integration)

---

### P3-06: Calendar — Proposed Times Feature

**Module:** Scheduling → Calendar
**Type:** New Feature
**Severity:** High

**Description:** A feature that allows the user to select multiple time slots on the calendar and generate a formatted email/text template with those proposed times, including timezone conversions.

**Workflow:**
1. User enters "Propose Times" mode on the calendar.
2. User clicks/selects several available time slots.
3. System generates a text template like:
   ```
   Here are some times that work for [Executive Name]:
   
   - Tuesday, March 3 at 2:00 PM EST / 11:00 AM PST / 7:00 PM GMT
   - Wednesday, March 4 at 10:00 AM EST / 7:00 AM PST / 3:00 PM GMT
   - Thursday, March 5 at 4:00 PM EST / 1:00 PM PST / 9:00 PM GMT
   
   Please let me know which works best for you.
   ```
4. User can add additional timezone columns (e.g., add Central time).
5. User copies the text and pastes into their email client.

**Database Changes:**
```sql
CREATE TABLE proposed_times (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  executive_id UUID REFERENCES executive_profiles(id),
  title TEXT,
  time_slots JSONB NOT NULL, -- array of { start: ISO timestamp, end: ISO timestamp }
  timezone_columns JSONB DEFAULT '["America/New_York"]', -- which TZs to display
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Add a "Propose Times" button to the calendar toolbar.
2. When active, allow clicking on time slots to toggle them as selected (highlight them).
3. Show a side panel with the selected times, formatted with timezone conversions.
4. Include a timezone adder: "+ Add Timezone" → searchable dropdown → adds a column.
5. Include a "Copy to Clipboard" button that copies the formatted text.
6. Save the proposed times to the database for tracking (see P3-09 Meeting Tracker).

**Verification:**
- [ ] Enter Propose Times mode → can select time slots on calendar
- [ ] Selected times appear in formatted text with timezone conversions
- [ ] Add another timezone → column appears with correct conversions
- [ ] Copy to clipboard → formatted text is on clipboard
- [ ] Saved to database for tracking

---

### P3-07: Calendar — Availability Sharing Feature

**Module:** Scheduling → Calendar
**Type:** New Feature
**Severity:** High

**Description:** Create a shareable availability link. The user defines their available window, generates a link, and the recipient can select from available times.

**Workflow:**
1. User clicks "Share Availability."
2. User selects date range (e.g., next 5 business days) and time window (e.g., 8 AM – 5 PM).
3. System generates a unique shareable link.
4. Recipient opens the link → sees a grid of available time slots (excluding already-booked calendar events).
5. Recipient selects their preferred time(s), enters their name/email, and submits.
6. The EA receives a notification with the recipient's selections.

**Database Changes:**
```sql
CREATE TABLE availability_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  executive_id UUID REFERENCES executive_profiles(id),
  title TEXT,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  time_window_start TIME NOT NULL,
  time_window_end TIME NOT NULL,
  link_token TEXT UNIQUE NOT NULL, -- for the shareable URL
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE availability_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_link_id UUID REFERENCES availability_links(id) ON DELETE CASCADE,
  respondent_name TEXT NOT NULL,
  respondent_email TEXT,
  selected_slots JSONB NOT NULL, -- array of selected time slots
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Build the "Share Availability" flow — form for date range and time window.
2. Generate a unique link token (UUID or nanoid) → shareable URL like `https://app.jenniferai.com/availability/{token}`.
3. Build the public-facing availability page (no auth required): shows a time grid with available slots.
4. Exclude times that are already blocked on the executive's calendar (requires calendar integration).
5. Recipient selects slots, enters name/email, submits.
6. Save the response to `availability_responses`.
7. Notify the EA via in-app notification.
8. Track in the Meeting Tracker (P3-09).

**Verification:**
- [ ] Create an availability link → unique URL is generated
- [ ] Open the link (incognito/logged out) → availability grid shows
- [ ] Select times and submit → response is saved
- [ ] EA receives notification of the response
- [ ] Link tracks in the Meeting Tracker

---

### P3-08: Calendar — Meeting Poll Feature

**Module:** Scheduling → Calendar
**Type:** New Feature
**Severity:** High

**Description:** Create a meeting poll (similar to Doodle) where multiple participants can vote on their preferred times.

**Workflow:**
1. User creates a poll: sets meeting title, duration (e.g., 45 minutes), and several proposed time options.
2. System generates a shareable link.
3. Recipients open the link → see the proposed time options → select which ones work for them → enter name → submit.
4. The EA can view all responses and see which time has the most votes.

**Database Changes:**
```sql
CREATE TABLE meeting_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  time_options JSONB NOT NULL, -- array of proposed date/times
  link_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE meeting_poll_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES meeting_polls(id) ON DELETE CASCADE,
  respondent_name TEXT NOT NULL,
  respondent_email TEXT,
  selected_options JSONB NOT NULL, -- indices or timestamps they voted for
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Steps:**
1. Build a "Create Meeting Poll" form: title, duration, and a list of proposed time slots (add/remove slots).
2. Generate a shareable link.
3. Build the public poll page: shows the proposed times, respondent enters name, checks available times, submits.
4. Build a poll results view for the EA: shows a grid with respondent names as rows and time options as columns, with checkmarks for each vote.
5. Highlight the time with the most votes.
6. Track in the Meeting Tracker (P3-09).

**Verification:**
- [ ] Create a poll with 4 time options → shareable link generated
- [ ] Open link → poll interface displays correctly
- [ ] Submit a response → appears in the results view
- [ ] Multiple responses → grid shows all votes, best time highlighted

---

### P3-09: Calendar — Meeting Tracker

**Module:** Scheduling → Calendar
**Type:** New Feature
**Severity:** Medium

**Description:** A tracking view that shows all issued scheduling items: Proposed Times, Availability Links, and Meeting Polls. Acts as a dashboard for all scheduling activities.

**Implementation Steps:**
1. Create a "Meeting Tracker" page/tab under Scheduling.
2. Query `proposed_times`, `availability_links`, and `meeting_polls` tables.
3. Display them in a unified list or tabbed view:
   - **Type column:** "Proposed Times" / "Availability" / "Poll"
   - **Title/Description**
   - **Date Created**
   - **Status:** Active, Expired, Completed
   - **Responses:** Count of responses received
   - **Actions:** View Details, Copy Link, Close/Expire
4. Clicking "View Details" opens the detail view showing responses.

**Verification:**
- [ ] Creating a proposed times, availability link, or poll → each appears in the tracker
- [ ] Status reflects correctly (active, expired)
- [ ] Response count is accurate
- [ ] "View Details" opens the appropriate detail view

---

### P3-10: Time Zone Calculator Tool

**Module:** Scheduling (new utility)
**Type:** New Feature
**Severity:** Medium

**Description:** A built-in time zone calculator/converter tool. Users can add multiple time zones and see the current time across all of them, plus convert specific times between zones.

**Implementation Steps:**
1. Create a "Time Zones" page or modal accessible from the Scheduling section.
2. Allow the user to add multiple time zones from a searchable dropdown.
3. Display a clock/grid showing the current time in each selected zone.
4. Include a time converter: user selects a source timezone, enters a time, selects target timezones → shows the converted times.
5. Save the user's frequently used time zones for quick access.

**Verification:**
- [ ] Add multiple time zones → current time displays for each
- [ ] Convert a time between zones → correct result
- [ ] Saved timezones persist across sessions

---

## PHASE 4 — UX Polish & Visual Improvements

> These are cosmetic and usability improvements. Implement last.

---

### P4-01: Integrations — Gmail and Slack "Coming Soon" State

**Module:** Settings → Integrations
**Type:** UX Polish
**Severity:** Low

**Description:** For integrations that aren't available yet (Gmail, Slack), the UI should clearly indicate they're upcoming. This was partially covered in P3-01 but ensuring the "Coming Soon" badge is visually polished.

**Implementation Steps:**
1. Add a semi-transparent overlay or badge that says "Coming Soon."
2. Disable the "Connect" button with a tooltip: "This integration will be available soon."
3. Optionally, add a "Notify Me" button that saves the user's interest.

---

### P4-02: Global — Confirmation Dialogs for Destructive Actions

**Module:** All Modules
**Type:** UX Polish
**Severity:** Medium

**Description:** Ensure every destructive action (delete, archive, reject) has a confirmation dialog. Review all modules and add confirmation where missing.

**Implementation Steps:**
1. Create a reusable `ConfirmationDialog` component if one doesn't exist.
2. Audit all delete, archive, and reject actions across every module.
3. Wrap each with the confirmation dialog: "Are you sure you want to [action]? This cannot be undone."
4. For non-reversible actions, use a red/danger-styled confirmation button.

---

### P4-03: All Modules — Consistent Loading States and Empty States

**Module:** All Modules
**Type:** UX Polish
**Severity:** Low

**Description:** Ensure every list view, detail view, and data-dependent component has:
1. A loading skeleton/spinner while data is being fetched.
2. An empty state illustration/message when there's no data (e.g., "No tasks yet. Create your first task.").

---

## PHASE 5 — Testing & Verification Checklist

> Run through this comprehensive checklist after implementing all phases. Every item should pass.

---

### Full Regression Test

**Contacts Module:**
- [ ] Click on contact row → opens detail (not select)
- [ ] Click checkbox → selects contact
- [ ] Edit contact → all fields editable and saveable
- [ ] Add multiple emails → all persist
- [ ] Birthday field → saves and syncs to Key Dates
- [ ] Time zone field → saves correctly
- [ ] LinkedIn field → saves and is clickable

**Executive Profiles:**
- [ ] All profile sections are editable
- [ ] Preferred name field exists and works
- [ ] Multiple emails, phones, office locations → all CRUD operations work
- [ ] Communication preferences → checkboxes save correctly
- [ ] Meeting preferences → checkboxes and time range save
- [ ] Escalation rules → add/edit/delete multiple rules
- [ ] Archive/unarchive an executive → works correctly
- [ ] Stakeholders and Team (renamed from Direct Reports) → linked to contacts
- [ ] Family section → linked to contacts
- [ ] Travel profile → ALL fields (A through M) save correctly
- [ ] Religion → saves, holidays sync to Key Dates
- [ ] Approval threshold → saves with currency format
- [ ] Business and personal emergency contacts → CRUD works
- [ ] Medical section → all fields save, Member ID is masked
- [ ] Profile picture → upload, display, change, initials fallback
- [ ] Memberships → editable after creation

**Task Hub:**
- [ ] To-Do: Search doesn't crash
- [ ] To-Do: Completed tasks move to Done section
- [ ] To-Do: Folders → create, assign, filter, delete
- [ ] To-Do: Filter button works and is labeled "Filter" (not "Filter & Sort")
- [ ] To-Do: Subtasks editable, with optional due date and assignee
- [ ] Approvals: Approve/Reject/Request Info all work
- [ ] Approvals: Counters accurate across all tabs
- [ ] Approvals: "All" tab doesn't crash
- [ ] Approvals: Quick due dates (Today, Tomorrow, Next Week)
- [ ] Delegations: Quick due dates work
- [ ] Assigned To: Shows all org users and contacts

**Meeting Log:**
- [ ] Counters work correctly
- [ ] "All" tab shows past and future meetings
- [ ] Past meetings appear under "Past" tab

**Calendar:**
- [ ] "Pending" column/status exists
- [ ] Proposed Times feature works end-to-end
- [ ] Availability sharing → link generates, public page works, responses tracked
- [ ] Meeting Poll → create, share, vote, view results
- [ ] Meeting Tracker shows all scheduling items

**Concierge:**
- [ ] Items editable after creation
- [ ] Contacts assignable from CRM
- [ ] Favorite star toggles correctly

**Key Dates:**
- [ ] All recurring options available (weekly through annually)
- [ ] Birthday sync from contacts works
- [ ] Religious holiday sync from executive profiles works

**Settings:**
- [ ] Integrations page: correct icons, correct order, Coming Soon on Gmail/Slack
- [ ] Preferences: week start day, time format, category management, priority customization
- [ ] Profile picture syncs across the app

**Dashboard:**
- [ ] Greeting shows correct first name
- [ ] Time-of-day greeting matches local time
- [ ] Local time and timezone displayed

**Ask Jennifer:**
- [ ] Knowledge base sidebar: upload files, add text, add links
- [ ] View and delete knowledge base items

**Time Zones:**
- [ ] Calculator tool accessible
- [ ] Multiple timezone display works
- [ ] Time conversion is accurate

---

> **End of Implementation Update v2**
> **Total Issues:** 46 items across 5 phases
> **Priority:** Phase 1 (12 critical bugs) → Phase 2 (22 features) → Phase 3 (10 advanced features) → Phase 4 (3 polish items) → Phase 5 (regression testing)
