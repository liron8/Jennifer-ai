"use client";

/**
 * Add Event Slideout
 * Slideout menu for creating calendar events (distinct from meetings)
 * Events are typically all-day or multi-day items like conferences, holidays, deadlines
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
  Flag01,
  MarkerPin01,
  Repeat01,
  Tag01,
  Users01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";

interface AddEventSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: EventFormData) => void;
}

export interface EventFormData {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  eventType: string;
  location: string;
  attendees: string;
  description: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrencePattern: string;
  reminder: string;
  calendar: string;
  color: string;
}

const eventTypes = [
  { label: "Conference", value: "conference" },
  { label: "Workshop", value: "workshop" },
  { label: "Deadline", value: "deadline" },
  { label: "Holiday", value: "holiday" },
  { label: "Out of Office", value: "ooo" },
  { label: "Team Event", value: "team" },
  { label: "Personal", value: "personal" },
  { label: "Other", value: "other" },
];

const recurrenceOptions = [
  { label: "Does not repeat", value: "none" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const reminderOptions = [
  { label: "No reminder", value: "none" },
  { label: "At time of event", value: "0" },
  { label: "1 hour before", value: "60" },
  { label: "1 day before", value: "1440" },
  { label: "1 week before", value: "10080" },
];


const colorOptions = [
  { label: "Blue", value: "blue" },
  { label: "Purple", value: "purple" },
  { label: "Green", value: "green" },
  { label: "Orange", value: "orange" },
  { label: "Pink", value: "pink" },
  { label: "Gray", value: "gray" },
];

export function AddEventSlideout({ isOpen, onOpenChange, onSubmit }: AddEventSlideoutProps) {
  const [isAllDay, setIsAllDay] = useState(true);
  const [calendarOptions, setCalendarOptions] = useState<{ label: string; value: string }[]>([]);
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState("");

  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const response = await fetch('/api/executives?page_size=100');
        if (response.ok) {
          const result = await response.json();
          const list = result.data?.data ?? result.data ?? [];
          const options = Array.isArray(list)
            ? list.map((e: any) => ({ label: `${e.full_name} - Work`, value: `${e.id}-work` }))
            : [];
          setCalendarOptions(options.length > 0 ? options : [{ label: 'Default Calendar', value: 'default' }]);
        }
      } catch (err) {
        console.error('Failed to fetch executives:', err);
        setCalendarOptions([{ label: 'Default Calendar', value: 'default' }]);
      }
    };
    if (isOpen) fetchExecutives();
  }, [isOpen]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [startDate, setStartDate] = useState<DateValue | null>(today(getLocalTimeZone()) as unknown as DateValue);
  const [endDate, setEndDate] = useState<DateValue | null>(today(getLocalTimeZone()) as unknown as DateValue);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: EventFormData = {
      title: formData.get("title") as string,
      startDate: startDate ? startDate.toString() : "",
      endDate: endDate ? endDate.toString() : "",
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
      eventType: formData.get("eventType") as string,
      location: formData.get("location") as string,
      attendees: attendeeEmails.join(', '),
      description: formData.get("description") as string,
      isAllDay,
      isRecurring,
      recurrencePattern: formData.get("recurrence") as string,
      reminder: formData.get("reminder") as string,
      calendar: formData.get("calendar") as string,
      color: formData.get("color") as string,
    };
    onSubmit?.(data);
    setAttendeeEmails([]);
    setAttendeeInput('');
    onOpenChange(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Add Event</h2>
          <p className="text-sm text-tertiary">Create a new calendar event</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-event-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-secondary">
                Event Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                placeholder="e.g., Annual Conference, Team Offsite"
                isRequired
              />
            </div>

            {/* Calendar Selection */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="calendar" className="text-sm font-medium text-secondary">
                Calendar
              </label>
              <NativeSelect
                id="calendar"
                name="calendar"
                options={calendarOptions}
                defaultValue={calendarOptions[0]?.value || ""}
              />
            </div>

            {/* Event Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="eventType" className="text-sm font-medium text-secondary">
                Event Type
              </label>
              <NativeSelect
                id="eventType"
                name="eventType"
                options={eventTypes}
                defaultValue="conference"
              />
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="color" className="text-sm font-medium text-secondary">
                Color
              </label>
              <NativeSelect
                id="color"
                name="color"
                options={colorOptions}
                defaultValue="purple"
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">All-day event</span>
              </div>
              <Toggle size="sm" isSelected={isAllDay} onChange={setIsAllDay} />
            </div>

            {/* Date Range */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">
                  Start Date <span className="text-error-500">*</span>
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  aria-label="Start date"
                />
              </div>
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
            </div>

            {/* Time (if not all-day) */}
            {!isAllDay && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="startTime" className="text-sm font-medium text-secondary">
                    Start Time
                  </label>
                  <Input id="startTime" name="startTime" type="time" size="sm" defaultValue="09:00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="endTime" className="text-sm font-medium text-secondary">
                    End Time
                  </label>
                  <Input id="endTime" name="endTime" type="time" size="sm" defaultValue="17:00" />
                </div>
              </div>
            )}

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
              <div className="flex items-center gap-2">
                <Repeat01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">Recurring event</span>
              </div>
              <Toggle size="sm" isSelected={isRecurring} onChange={setIsRecurring} />
            </div>

            {isRecurring && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="recurrence" className="text-sm font-medium text-secondary">
                  Repeat
                </label>
                <NativeSelect
                  id="recurrence"
                  name="recurrence"
                  options={recurrenceOptions}
                  defaultValue="yearly"
                />
              </div>
            )}

            {/* Location */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="location" className="text-sm font-medium text-secondary">
                Location
              </label>
              <Input
                id="location"
                name="location"
                size="sm"
                icon={MarkerPin01}
                placeholder="Add a location or venue"
              />
            </div>

            {/* Attendees (Multi-input) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Attendees
              </label>
              {attendeeEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {attendeeEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                      {email}
                      <button
                        type="button"
                        onClick={() => setAttendeeEmails(prev => prev.filter(e => e !== email))}
                        className="ml-0.5 text-brand-400 hover:text-brand-600 dark:hover:text-brand-300"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Users01 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-quaternary" />
                  <input
                    type="email"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const email = attendeeInput.trim().replace(/,$/, '');
                        if (email && email.includes('@') && !attendeeEmails.includes(email)) {
                          setAttendeeEmails(prev => [...prev, email]);
                          setAttendeeInput('');
                        }
                      }
                    }}
                    placeholder={attendeeEmails.length > 0 ? "Add another email..." : "Type email and press Enter"}
                    className="w-full rounded-lg border border-secondary bg-primary pl-9 pr-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const email = attendeeInput.trim();
                    if (email && email.includes('@') && !attendeeEmails.includes(email)) {
                      setAttendeeEmails(prev => [...prev, email]);
                      setAttendeeInput('');
                    }
                  }}
                  className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-secondary hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Add
                </button>
              </div>
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
                defaultValue="1440"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-secondary">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Add event details, agenda, or notes..."
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
          <Button type="submit" form="add-event-form" size="md">
            Add Event
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
