"use client";

/**
 * AddDateSlideout Component
 * Slideout panel for adding new key dates
 */

import { useState } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
  Bell01,
  Repeat01,
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

interface AddDateSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (keyDate: Omit<KeyDate, "id">) => void;
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

export function AddDateSlideout({ isOpen, onOpenChange, onSubmit }: AddDateSlideoutProps) {
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<DateValue | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const reminderValue = parseInt(formData.get("reminder") as string, 10);
    
    // Format date string
    let dateString = "";
    if (selectedDate) {
      const date = selectedDate.toDate(getLocalTimeZone());
      dateString = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      
      // Add end date for date ranges (e.g., travel)
      if (hasEndDate && endDate) {
        const end = endDate.toDate(getLocalTimeZone());
        const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        // Format as "Jan 20-22, 2026" if same month, otherwise full range
        if (date.getMonth() === end.getMonth() && date.getFullYear() === end.getFullYear()) {
          dateString = `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}-${end.getDate()}, ${date.getFullYear()}`;
        } else {
          dateString = `${dateString} - ${endStr}`;
        }
      }
    }

    const keyDate: Omit<KeyDate, "id"> = {
      title: formData.get("title") as string,
      date: dateString,
      category: formData.get("category") as KeyDateCategory,
      description: formData.get("description") as string || undefined,
      reminder: reminderValue > 0 ? reminderValue : undefined,
      recurring: formData.get("recurring") as KeyDate["recurring"],
      relatedPerson: formData.get("relatedPerson") as string || undefined,
    };

    onSubmit?.(keyDate);
    onOpenChange(false);
    
    // Reset form state
    setSelectedDate(null);
    setEndDate(null);
    setHasEndDate(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Add Date</h2>
          <p className="text-sm text-tertiary">Add a new key date to track</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-date-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-secondary">
                Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                placeholder="e.g., John's Birthday, Q4 Report Deadline"
                isRequired
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-secondary">
                Category <span className="text-error-500">*</span>
              </label>
              <NativeSelect
                id="category"
                name="category"
                options={categoryOptions}
                defaultValue="deadlines"
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
              <label htmlFor="description" className="text-sm font-medium text-secondary">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                placeholder="Add notes or details..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Related Person */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="relatedPerson" className="text-sm font-medium text-secondary">
                Related Person / Company
              </label>
              <Input
                id="relatedPerson"
                name="relatedPerson"
                size="sm"
                icon={User01}
                placeholder="e.g., John Doe, Acme Corp"
              />
            </div>

            {/* Reminder */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reminder" className="text-sm font-medium text-secondary">
                Reminder
              </label>
              <NativeSelect
                id="reminder"
                name="reminder"
                options={reminderOptions}
                defaultValue="7"
              />
            </div>

            {/* Recurring */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recurring" className="text-sm font-medium text-secondary">
                Recurring
              </label>
              <NativeSelect
                id="recurring"
                name="recurring"
                options={recurringOptions}
                defaultValue="none"
              />
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-date-form" size="md" color="primary">
            Add Date
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
