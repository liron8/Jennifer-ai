"use client";

/**
 * AddTaskSlideout Component
 * Slideout panel for creating/editing tasks
 * P2-09: Enhanced with quick dates, dual assignment, dynamic categories, no status field on create
 */

import { useState, useEffect, useCallback } from "react";
import { getLocalTimeZone, today, CalendarDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { type Task, type Subtask, type TaskStatus, type TaskPriority } from "./task-types";

interface AddTaskSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
  editTask?: Task | null;
  defaultStatus?: TaskStatus;
}

const priorityOptions = [
  { label: "High / Urgent", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low / Informative", value: "low" },
];

const statusOptions = [
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Approval", value: "approval" },
  { label: "Done", value: "done" },
];

interface ReminderEntry {
  id: string;
  offset: string;
  note: string;
}

let reminderCounter = 0;

export function AddTaskSlideout({ isOpen, onOpenChange, onSubmit, editTask, defaultStatus }: AddTaskSlideoutProps) {
  const [dueDate, setDueDate] = useState<DateValue | null>(null);
  const [reminders, setReminders] = useState<ReminderEntry[]>([]);
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; due_date?: string; assigned_to?: string }>>([]);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [executiveOptions, setExecutiveOptions] = useState<{ label: string; value: string }[]>([]);
  const [teamMemberOptions, setTeamMemberOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const isEditing = !!editTask;

  // Initialize subtasks from editTask
  useEffect(() => {
    if (isOpen && editTask?.subtasks) {
      setSubtasks(editTask.subtasks.map(st => ({ id: st.id, title: st.title, due_date: (st as any).due_date, assigned_to: (st as any).assigned_to })));
    } else if (isOpen && !editTask) {
      setSubtasks([]);
    }
    if (isOpen) {
      setNewSubtaskTitle("");
    }
  }, [isOpen, editTask]);

  // Fetch executives, team members, and categories when slideout opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchExecutives = async () => {
      try {
        const response = await fetch('/api/executives?page_size=100');
        if (response.ok) {
          const result = await response.json();
          const list = result.data?.data ?? result.data ?? [];
          setExecutiveOptions(
            Array.isArray(list) ? list.map((e: any) => ({ label: e.full_name, value: e.full_name })) : []
          );
        }
      } catch (err) {
        console.error('Failed to fetch executives:', err);
      }
    };

    const fetchTeamMembers = async () => {
      try {
        const [teamRes, contactsRes] = await Promise.all([
          fetch('/api/settings/team'),
          fetch('/api/contacts?page_size=100'),
        ]);
        const teamOptions: { label: string; value: string }[] = [];
        const contactOptions: { label: string; value: string }[] = [];

        if (teamRes.ok) {
          const teamResult = await teamRes.json();
          const members = teamResult.data?.data?.members ?? teamResult.data?.members ?? teamResult.data ?? [];
          if (Array.isArray(members)) {
            members.filter((m: any) => m.is_active !== false).forEach((m: any) => {
              teamOptions.push({ label: `${m.full_name || m.email}`, value: m.id });
            });
          }
        }

        if (contactsRes.ok) {
          const contactResult = await contactsRes.json();
          const contacts = contactResult.data?.data ?? contactResult.data ?? [];
          if (Array.isArray(contacts)) {
            contacts.forEach((c: any) => {
              contactOptions.push({ label: `${c.full_name}${c.company ? ` (${c.company})` : ''}`, value: `contact:${c.id}` });
            });
          }
        }

        const combined: { label: string; value: string }[] = [];
        if (teamOptions.length > 0) {
          combined.push({ label: '── Team Members ──', value: '_header_team' });
          combined.push(...teamOptions);
        }
        if (contactOptions.length > 0) {
          combined.push({ label: '── Contacts ──', value: '_header_contacts' });
          combined.push(...contactOptions);
        }
        setTeamMemberOptions(combined);
      } catch (err) {
        console.error('Failed to fetch assignable people:', err);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/tasks/categories');
        if (response.ok) {
          const result = await response.json();
          const cats = result.data?.data ?? result.data ?? result;
          if (Array.isArray(cats)) {
            setCategoryOptions(cats.map((c: any) => ({ label: c.name, value: c.name })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };

    fetchExecutives();
    fetchTeamMembers();
    fetchCategories();
  }, [isOpen]);

  // Reminder helpers
  const addReminder = useCallback(() => {
    reminderCounter++;
    setReminders(prev => [...prev, { id: `r-${reminderCounter}`, offset: '1d', note: '' }]);
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const updateReminder = useCallback((id: string, field: 'offset' | 'note', value: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  // Subtask helpers
  const addSubtask = useCallback(() => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks(prev => [...prev, { id: `new-${Date.now()}-${prev.length}`, title: trimmed }]);
    setNewSubtaskTitle("");
  }, [newSubtaskTitle]);

  const removeSubtask = useCallback((id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  }, []);

  // Quick date helpers
  const setToday = () => {
    const t = today(getLocalTimeZone());
    setDueDate(t);
  };
  const setTomorrow = () => {
    const t = today(getLocalTimeZone()).add({ days: 1 });
    setDueDate(t);
  };
  const setNextWeek = () => {
    const t = today(getLocalTimeZone()).add({ weeks: 1 });
    setDueDate(t);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const assignedToRaw = formData.get("assigned_to") as string;
    // Contact IDs are prefixed with "contact:" to distinguish from user UUIDs
    const assignedTo = assignedToRaw && !assignedToRaw.startsWith('_header_') ? assignedToRaw : undefined;

    const task = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as TaskPriority,
      status: isEditing ? (formData.get("status") as TaskStatus) : (defaultStatus || "todo"),
      category: formData.get("category") as string,
      dueDate: dueDate ? dueDate.toString() : "",
      executive: formData.get("executive") as string,
      assignedTo,
      comments: 0,
      attachments: 0,
      subtasks: subtasks.map(st => ({
        id: st.id,
        title: st.title,
        completed: editTask?.subtasks?.find(es => es.id === st.id)?.completed ?? false,
        completed_at: editTask?.subtasks?.find(es => es.id === st.id)?.completed_at ?? null,
        due_date: st.due_date,
        assigned_to: st.assigned_to,
      })),
    };

    onSubmit?.(task);
    onOpenChange(false);
  };

  // Fallback category options if API returned nothing
  const effectiveCategoryOptions = categoryOptions.length > 0
    ? categoryOptions
    : [
        { label: "Personal", value: "Personal" },
        { label: "Work", value: "Work" },
        { label: "Travel", value: "Travel" },
        { label: "Admin", value: "Admin" },
      ];

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isEditing ? "Edit Task" : "Add Task"}</h2>
          <p className="text-sm text-gray-500">
            {isEditing
              ? "Update task details"
              : defaultStatus && defaultStatus !== "todo"
                ? `Create a new task in "${statusOptions.find(s => s.value === defaultStatus)?.label || defaultStatus}"`
                : "Create a new task for your team"}
          </p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Task Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                placeholder="e.g., Book flight, Review contract"
                isRequired
                defaultValue={editTask?.title || ""}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Add details about this task..."
                defaultValue={editTask?.description || ""}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            {/* Priority & Status (status only in edit mode) */}
            <div className={`grid gap-4 ${isEditing ? "md:grid-cols-2" : ""}`}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </label>
                <NativeSelect
                  id="priority"
                  name="priority"
                  options={priorityOptions}
                  defaultValue={editTask?.priority || "medium"}
                />
              </div>
              {isEditing && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <NativeSelect
                    id="status"
                    name="status"
                    options={statusOptions}
                    defaultValue={editTask?.status || "todo"}
                  />
                </div>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <NativeSelect
                id="category"
                name="category"
                options={effectiveCategoryOptions}
                defaultValue={editTask?.category || effectiveCategoryOptions[0]?.value || ""}
              />
            </div>

            {/* Due Date with Quick Buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Due Date <span className="text-error-500">*</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={setToday}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={setTomorrow}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={setNextWeek}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next Week
                </button>
              </div>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                aria-label="Due date"
              />
            </div>

            {/* Executive Assignment */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="executive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Executive
              </label>
              <p className="text-xs text-gray-400">Which executive this task relates to</p>
              <NativeSelect
                id="executive"
                name="executive"
                options={[{ label: "Select an executive...", value: "" }, ...executiveOptions]}
                defaultValue={editTask?.executive && editTask.executive !== "Unassigned" ? editTask.executive : ""}
              />
            </div>

            {/* Assigned To (Team Member) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="assigned_to" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Assigned To
              </label>
              <p className="text-xs text-gray-400">Who is responsible for completing this task</p>
              <NativeSelect
                id="assigned_to"
                name="assigned_to"
                options={[{ label: "Assign to myself", value: "" }, ...teamMemberOptions]}
                defaultValue=""
              />
            </div>

            {/* Sub-tasks Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sub-tasks</span>
                <span className="text-xs text-gray-400">{subtasks.length} {subtasks.length === 1 ? "item" : "items"}</span>
              </div>

              {subtasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  {subtasks.map((st, idx) => (
                    <div key={st.id} className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm text-gray-900 dark:text-white">
                          {st.title}
                          {(st.due_date || st.assigned_to) && (
                            <span className="ml-2 text-xs text-gray-400">
                              {st.due_date && `Due: ${st.due_date}`}
                              {st.due_date && st.assigned_to && ' · '}
                              {st.assigned_to && `Assigned`}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedSubtaskId(expandedSubtaskId === st.id ? null : st.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Advanced settings"
                        >
                          {expandedSubtaskId === st.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSubtask(st.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-error-500 dark:hover:bg-gray-700"
                        >
                          <Trash01 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {expandedSubtaskId === st.id && (
                        <div className="border-t border-gray-200 px-3 py-2.5 dark:border-gray-700">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Due Date</label>
                              <input
                                type="date"
                                value={st.due_date || ''}
                                onChange={(e) => setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, due_date: e.target.value || undefined } : s))}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Assigned To</label>
                              <select
                                value={st.assigned_to || ''}
                                onChange={(e) => setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, assigned_to: e.target.value || undefined } : s))}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                              >
                                <option value="">None</option>
                                {teamMemberOptions.filter(o => !o.value.startsWith('_header_')).map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a sub-task..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-brand-400 dark:hover:bg-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Reminders Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reminders</span>
                </div>
                <button
                  type="button"
                  onClick={addReminder}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:text-brand-400 dark:hover:bg-gray-700"
                >
                  + Add Reminder
                </button>
              </div>
              {reminders.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">No reminders set. Click &quot;Add Reminder&quot; to add one.</p>
              )}
              {reminders.map((reminder, index) => (
                <div key={reminder.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Reminder {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeReminder(reminder.id)}
                      className="text-xs text-error-500 hover:text-error-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <select
                      value={reminder.offset}
                      onChange={(e) => updateReminder(reminder.id, 'offset', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="15m">15 minutes before</option>
                      <option value="30m">30 minutes before</option>
                      <option value="1h">1 hour before</option>
                      <option value="1d">1 day before</option>
                      <option value="3d">3 days before</option>
                      <option value="1w">1 week before</option>
                      <option value="0d">On due date</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Optional note..."
                      value={reminder.note}
                      onChange={(e) => updateReminder(reminder.id, 'note', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-task-form" size="md" color="primary">
            {isEditing ? "Save Changes" : "Create Task"}
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
