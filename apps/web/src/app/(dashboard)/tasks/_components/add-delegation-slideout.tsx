"use client";

/**
 * AddDelegationSlideout Component
 * Slideout panel for creating new task delegations
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Users01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";

interface AddDelegationSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (delegation: DelegationFormData) => void;
}

export interface DelegationFormData {
  taskTitle: string;
  taskDescription: string;
  taskId?: string;
  delegateToId: string;
  delegateToName: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  notes: string;
}

const priorityOptions = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export function AddDelegationSlideout({ isOpen, onOpenChange, onSubmit }: AddDelegationSlideoutProps) {
  const [dueDate, setDueDate] = useState<DateValue | null>(null);
  const [teamMemberOptions, setTeamMemberOptions] = useState<{ label: string; value: string }[]>([]);
  const [existingTaskOptions, setExistingTaskOptions] = useState<{ label: string; value: string }[]>([{ label: 'Create new task', value: 'new' }]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team members and contacts
        const [teamRes, contactsRes] = await Promise.all([
          fetch('/api/settings/team'),
          fetch('/api/contacts?page_size=100'),
        ]);
        const combined: { label: string; value: string }[] = [];
        if (teamRes.ok) {
          const teamResult = await teamRes.json();
          const members = (teamResult.data?.data ?? teamResult.data)?.members ?? [];
          if (Array.isArray(members) && members.length > 0) {
            combined.push({ label: '── Team Members ──', value: '_header_team' });
            members.filter((m: any) => m.is_active !== false).forEach((m: any) => {
              combined.push({ label: m.full_name || m.email, value: m.id });
            });
          }
        }
        if (contactsRes.ok) {
          const contactResult = await contactsRes.json();
          const contacts = contactResult.data?.data ?? contactResult.data ?? [];
          if (Array.isArray(contacts) && contacts.length > 0) {
            combined.push({ label: '── Contacts ──', value: '_header_contacts' });
            contacts.forEach((c: any) => {
              combined.push({ label: `${c.full_name}${c.company ? ` (${c.company})` : ''}`, value: `contact:${c.id}` });
            });
          }
        }
        setTeamMemberOptions(combined.length > 0 ? combined : [{ label: 'No team members', value: '' }]);

        // Fetch existing tasks
        const tasksRes = await fetch('/api/tasks?page_size=100');
        if (tasksRes.ok) {
          const tasksResult = await tasksRes.json();
          const tasks = tasksResult.data?.data ?? tasksResult.data ?? [];
          const taskOpts = Array.isArray(tasks)
            ? tasks.map((t: any) => ({ label: t.title, value: t.id }))
            : [];
          setExistingTaskOptions([{ label: 'Create new task', value: 'new' }, ...taskOpts]);
        }
      } catch (err) {
        console.error('Failed to fetch delegation data:', err);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);
  const [selectedTask, setSelectedTask] = useState("new");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const delegateToId = formData.get("delegateTo") as string;
    const delegateToName = teamMemberOptions.find(m => m.value === delegateToId)?.label || "";

    const delegation: DelegationFormData = {
      taskTitle: selectedTask === "new" 
        ? (formData.get("taskTitle") as string)
        : existingTaskOptions.find(t => t.value === selectedTask)?.label || "",
      taskDescription: formData.get("taskDescription") as string,
      taskId: selectedTask !== "new" ? selectedTask : undefined,
      delegateToId,
      delegateToName,
      dueDate: dueDate ? dueDate.toString() : "",
      priority: formData.get("priority") as "high" | "medium" | "low",
      notes: formData.get("notes") as string,
    };

    onSubmit?.(delegation);
    onOpenChange(false);
    
    // Reset form state
    setSelectedTask("new");
    setDueDate(null);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">New Delegation</h2>
          <p className="text-sm text-tertiary">Delegate a task to a team member</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-delegation-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Select Existing Task or Create New */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="existingTask" className="text-sm font-medium text-secondary">
                Task to Delegate
              </label>
              <NativeSelect
                id="existingTask"
                name="existingTask"
                options={existingTaskOptions}
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
              />
            </div>

            {/* New Task Title (only if creating new) */}
            {selectedTask === "new" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="taskTitle" className="text-sm font-medium text-secondary">
                  Task Title <span className="text-error-500">*</span>
                </label>
                <Input
                  id="taskTitle"
                  name="taskTitle"
                  size="sm"
                  placeholder="e.g., Book conference room, Review document"
                  isRequired={selectedTask === "new"}
                />
              </div>
            )}

            {/* Task Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="taskDescription" className="text-sm font-medium text-secondary">
                Description
              </label>
              <textarea
                id="taskDescription"
                name="taskDescription"
                rows={3}
                placeholder="Add details about what needs to be done..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Delegate To */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="delegateTo" className="text-sm font-medium text-secondary">
                Delegate To <span className="text-error-500">*</span>
              </label>
              <NativeSelect
                id="delegateTo"
                name="delegateTo"
                options={teamMemberOptions}
                defaultValue={teamMemberOptions[0]?.value || ""}
              />
            </div>

            {/* Due Date with Quick Buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Due Date <span className="text-error-500">*</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDueDate(today(getLocalTimeZone()))}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(today(getLocalTimeZone()).add({ days: 1 }))}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(today(getLocalTimeZone()).add({ weeks: 1 }))}
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

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="priority" className="text-sm font-medium text-secondary">
                Priority
              </label>
              <NativeSelect
                id="priority"
                name="priority"
                options={priorityOptions}
                defaultValue="medium"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-secondary">
                Notes for Delegate
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Any special instructions or context..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-delegation-form" size="md" color="primary">
            Create Delegation
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
