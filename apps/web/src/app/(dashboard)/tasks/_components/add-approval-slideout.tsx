"use client";

/**
 * AddApprovalSlideout Component
 * Slideout panel for creating new approval requests
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import { Calendar } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { CreateApprovalData } from "@/hooks/useApprovals";

interface AddApprovalSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: CreateApprovalData) => void;
}

const typeOptions = [
  { label: "Expense", value: "expense" },
  { label: "Calendar", value: "calendar" },
  { label: "Document", value: "document" },
  { label: "Travel", value: "travel" },
  { label: "Other", value: "other" },
];

const urgencyOptions = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const categoryOptions = [
  { label: "General", value: "General" },
  { label: "Finance", value: "Finance" },
  { label: "Travel", value: "Travel" },
  { label: "Operations", value: "Operations" },
  { label: "HR", value: "HR" },
  { label: "Legal", value: "Legal" },
  { label: "Marketing", value: "Marketing" },
];

export function AddApprovalSlideout({ isOpen, onOpenChange, onSubmit }: AddApprovalSlideoutProps) {
  const [dueDate, setDueDate] = useState<DateValue | null>(null);
  const [executiveOptions, setExecutiveOptions] = useState<{ label: string; value: string }[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [execRes, teamRes, contactsRes] = await Promise.all([
          fetch("/api/executives?page_size=100"),
          fetch('/api/settings/team'),
          fetch('/api/contacts?page_size=100'),
        ]);

        if (execRes.ok) {
          const result = await execRes.json();
          const list = result.data?.data ?? result.data ?? [];
          setExecutiveOptions(
            Array.isArray(list)
              ? list.map((e: any) => ({ label: e.full_name, value: e.id }))
              : []
          );
        }

        const combined: { label: string; value: string }[] = [];
        if (teamRes.ok) {
          const teamResult = await teamRes.json();
          const members = teamResult.data?.data?.members ?? teamResult.data?.members ?? teamResult.data ?? [];
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
        setAssigneeOptions(combined);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: CreateApprovalData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      approval_type: formData.get("approval_type") as CreateApprovalData["approval_type"],
      urgency: formData.get("urgency") as "high" | "medium" | "low",
      category: formData.get("category") as string || undefined,
      due_date: dueDate ? dueDate.toString() : undefined,
      executive_id: formData.get("executive_id") as string || undefined,
    };

    const amountStr = formData.get("amount") as string;
    if (amountStr && parseFloat(amountStr) > 0) {
      data.amount = parseFloat(amountStr);
      data.currency = "USD";
    }

    onSubmit?.(data);
    onOpenChange(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton
            className="absolute top-4 right-4"
            onClick={() => onOpenChange(false)}
          />
          <h2 className="text-lg font-semibold text-primary">
            New Approval Request
          </h2>
          <p className="text-sm text-tertiary">
            Submit a request for executive approval
          </p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form
            id="add-approval-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="title"
                className="text-sm font-medium text-secondary"
              >
                Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                placeholder="e.g., Q1 Marketing Budget, Conference Travel"
                isRequired
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-sm font-medium text-secondary"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Provide details about what needs to be approved..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Type & Urgency */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="approval_type"
                  className="text-sm font-medium text-secondary"
                >
                  Type
                </label>
                <NativeSelect
                  id="approval_type"
                  name="approval_type"
                  options={typeOptions}
                  defaultValue="other"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="urgency"
                  className="text-sm font-medium text-secondary"
                >
                  Urgency
                </label>
                <NativeSelect
                  id="urgency"
                  name="urgency"
                  options={urgencyOptions}
                  defaultValue="medium"
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="category"
                className="text-sm font-medium text-secondary"
              >
                Category
              </label>
              <NativeSelect
                id="category"
                name="category"
                options={categoryOptions}
                defaultValue="General"
              />
            </div>

            {/* Amount (for expense type) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-secondary"
              >
                Amount (if applicable)
              </label>
              <Input
                id="amount"
                name="amount"
                size="sm"
                type="number"
                placeholder="0.00"
              />
            </div>

            {/* Due Date with Quick Buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Due Date
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

            {/* Executive */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="executive_id"
                className="text-sm font-medium text-secondary"
              >
                Assign to Executive
              </label>
              <NativeSelect
                id="executive_id"
                name="executive_id"
                options={executiveOptions}
                defaultValue={executiveOptions[0]?.value || ""}
              />
            </div>

            {/* Assigned To (Team Member or Contact) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="assigned_to"
                className="text-sm font-medium text-secondary"
              >
                Assigned To
              </label>
              <p className="text-xs text-tertiary">Team member or contact responsible for this approval</p>
              <NativeSelect
                id="assigned_to"
                name="assigned_to"
                options={[{ label: "Assign to myself", value: "" }, ...assigneeOptions]}
                defaultValue=""
              />
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button
            size="md"
            color="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-approval-form"
            size="md"
            color="primary"
          >
            Submit Request
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
