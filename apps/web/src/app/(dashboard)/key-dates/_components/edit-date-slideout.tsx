"use client";

/**
 * EditDateSlideout Component
 * Slideout panel for editing existing key dates
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, parseDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
  User01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import type { KeyDate, KeyDateCategory } from "./key-dates-data";

interface EditDateSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  keyDate: KeyDate | null;
  onSubmit?: (id: string, data: Omit<KeyDate, "id">) => void;
}

const categoryOptions = [
  { label: "🎂 Birthdays", value: "birthdays" },
  { label: "💍 Anniversaries", value: "anniversaries" },
  { label: "⏰ Deadlines", value: "deadlines" },
  { label: "🎯 Milestones", value: "milestones" },
  { label: "✈️ Travel", value: "travel" },
  { label: "💰 Financial", value: "financial" },
  { label: "👥 Team", value: "team" },
  { label: "🏠 Personal", value: "personal" },
  { label: "⭐ VIP/Client", value: "vip" },
  { label: "📋 Expirations", value: "expirations" },
  { label: "🎉 Holidays", value: "holidays" },
  { label: "📌 Other", value: "other" },
];

const reminderOptions = [
  { label: "No reminder", value: "0" },
  { label: "1 day before", value: "1" },
  { label: "2 days before", value: "2" },
  { label: "3 days before", value: "3" },
  { label: "7 days before", value: "7" },
  { label: "14 days before", value: "14" },
  { label: "30 days before", value: "30" },
];

const recurringOptions = [
  { label: "Does not repeat", value: "none" },
  { label: "Weekly", value: "weekly" },
  { label: "Bi-Weekly", value: "bi_weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Bi-Annual", value: "bi_annual" },
  { label: "Annually", value: "annually" },
];

/**
 * Try to parse a display date string (e.g. "Jan 15, 2026") into a DateValue.
 * Returns null if parsing fails.
 */
function parseDateString(dateStr: string): DateValue | null {
  try {
    // Handle date ranges — take the first date
    const firstPart = dateStr.split("-")[0].trim().replace(/,$/, "");
    const parsed = new Date(firstPart);
    if (isNaN(parsed.getTime())) return null;
    const iso = parsed.toISOString().split("T")[0]; // "2026-01-15"
    return parseDate(iso);
  } catch {
    return null;
  }
}

/**
 * Check if the date string represents a range (has end date).
 */
function parseEndDate(dateStr: string): DateValue | null {
  try {
    // Formats: "Jan 20-22, 2026" or "Jan 20, 2026 - Feb 1, 2026"
    if (!dateStr.includes("-")) return null;

    const parts = dateStr.split("-");
    if (parts.length < 2) return null;

    const secondPart = parts[parts.length - 1].trim();

    // "22, 2026" (same month range) or "Feb 1, 2026" (different month)
    let endParsed = new Date(secondPart);
    if (isNaN(endParsed.getTime())) {
      // Try combining with the month from the first part: "Jan 22, 2026"
      const firstMonth = dateStr.split(" ")[0];
      endParsed = new Date(`${firstMonth} ${secondPart}`);
    }
    if (isNaN(endParsed.getTime())) return null;

    const iso = endParsed.toISOString().split("T")[0];
    return parseDate(iso);
  } catch {
    return null;
  }
}

export function EditDateSlideout({ isOpen, onOpenChange, keyDate, onSubmit }: EditDateSlideoutProps) {
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<DateValue | null>(null);

  // Populate form when keyDate changes
  useEffect(() => {
    if (keyDate) {
      const startDate = parseDateString(keyDate.date);
      setSelectedDate(startDate);

      const end = parseEndDate(keyDate.date);
      setHasEndDate(!!end);
      setEndDate(end);
    }
  }, [keyDate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!keyDate) return;

    const formData = new FormData(e.currentTarget);
    const reminderValue = parseInt(formData.get("reminder") as string, 10);

    // Format date string
    let dateString = "";
    if (selectedDate) {
      const date = selectedDate.toDate(getLocalTimeZone());
      dateString = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      if (hasEndDate && endDate) {
        const end = endDate.toDate(getLocalTimeZone());
        const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        if (date.getMonth() === end.getMonth() && date.getFullYear() === end.getFullYear()) {
          dateString = `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}-${end.getDate()}, ${date.getFullYear()}`;
        } else {
          dateString = `${dateString} - ${endStr}`;
        }
      }
    }

    const updatedData: Omit<KeyDate, "id"> = {
      title: formData.get("title") as string,
      date: dateString,
      category: formData.get("category") as KeyDateCategory,
      description: (formData.get("description") as string) || undefined,
      reminder: reminderValue > 0 ? reminderValue : undefined,
      recurring: formData.get("recurring") as KeyDate["recurring"],
      relatedPerson: (formData.get("relatedPerson") as string) || undefined,
    };

    onSubmit?.(keyDate.id, updatedData);
    onOpenChange(false);
  };

  if (!keyDate) return null;

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Edit Date</h2>
          <p className="text-sm text-tertiary">Update key date details</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="edit-date-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-title" className="text-sm font-medium text-secondary">
                Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="edit-title"
                name="title"
                size="sm"
                defaultValue={keyDate.title}
                placeholder="e.g., John's Birthday, Q4 Report Deadline"
                isRequired
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-category" className="text-sm font-medium text-secondary">
                Category <span className="text-error-500">*</span>
              </label>
              <NativeSelect
                id="edit-category"
                name="category"
                options={categoryOptions}
                defaultValue={keyDate.category}
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Date <span className="text-error-500">*</span>
              </label>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                aria-label="Date"
              />
            </div>

            {/* Date Range Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">Date range (e.g., for travel)</span>
              </div>
              <Toggle size="sm" isSelected={hasEndDate} onChange={setHasEndDate} />
            </div>

            {/* End Date (if date range) */}
            {hasEndDate && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">
                  End Date
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  aria-label="End date"
                />
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-description" className="text-sm font-medium text-secondary">
                Description
              </label>
              <textarea
                id="edit-description"
                name="description"
                rows={2}
                defaultValue={keyDate.description || ""}
                placeholder="Add notes or details..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Related Person */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-relatedPerson" className="text-sm font-medium text-secondary">
                Related Person / Company
              </label>
              <Input
                id="edit-relatedPerson"
                name="relatedPerson"
                size="sm"
                icon={User01}
                defaultValue={keyDate.relatedPerson || ""}
                placeholder="e.g., John Doe, Acme Corp"
              />
            </div>

            {/* Reminder */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-reminder" className="text-sm font-medium text-secondary">
                Reminder
              </label>
              <NativeSelect
                id="edit-reminder"
                name="reminder"
                options={reminderOptions}
                defaultValue={String(keyDate.reminder || 0)}
              />
            </div>

            {/* Recurring */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-recurring" className="text-sm font-medium text-secondary">
                Recurring
              </label>
              <NativeSelect
                id="edit-recurring"
                name="recurring"
                options={recurringOptions}
                defaultValue={keyDate.recurring || "none"}
              />
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-date-form" size="md" color="primary">
            Save Changes
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
