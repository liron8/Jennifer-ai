"use client";

/**
 * New Meeting Slideout
 * Slideout menu for creating new meetings/events on the calendar
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
  Clock,
  Link01,
  MarkerPin01,
  Repeat01,
  Users01,
  VideoRecorder,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";

interface NewMeetingSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: MeetingFormData) => void;
}

export interface MeetingFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingType: string;
  location: string;
  videoLink: string;
  attendees: string;
  description: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrencePattern: string;
  reminder: string;
  calendar: string;
}

const meetingTypes = [
  { label: "Internal Meeting", value: "internal" },
  { label: "External / Client", value: "external" },
  { label: "Personal", value: "personal" },
  { label: "Travel", value: "travel" },
  { label: "Focus Time", value: "focus" },
];

const recurrenceOptions = [
  { label: "Does not repeat", value: "none" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Bi-weekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];

const reminderOptions = [
  { label: "No reminder", value: "none" },
  { label: "5 minutes before", value: "5" },
  { label: "15 minutes before", value: "15" },
  { label: "30 minutes before", value: "30" },
  { label: "1 hour before", value: "60" },
  { label: "1 day before", value: "1440" },
];


export function NewMeetingSlideout({ isOpen, onOpenChange, onSubmit }: NewMeetingSlideoutProps) {
  const [isAllDay, setIsAllDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(today(getLocalTimeZone()) as unknown as DateValue);
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: MeetingFormData = {
      title: formData.get("title") as string,
      date: selectedDate ? selectedDate.toString() : "",
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
      meetingType: formData.get("meetingType") as string,
      location: formData.get("location") as string,
      videoLink: formData.get("videoLink") as string,
      attendees: attendeeEmails.join(', '),
      description: formData.get("description") as string,
      isAllDay,
      isRecurring,
      recurrencePattern: formData.get("recurrence") as string,
      reminder: formData.get("reminder") as string,
      calendar: formData.get("calendar") as string,
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
          <h2 className="text-lg font-semibold text-primary">New Meeting</h2>
          <p className="text-sm text-tertiary">Schedule a new meeting or event</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="new-meeting-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-secondary">
                Meeting Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                placeholder="e.g., Team Standup, Client Call"
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

            {/* Meeting Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meetingType" className="text-sm font-medium text-secondary">
                Meeting Type
              </label>
              <NativeSelect
                id="meetingType"
                name="meetingType"
                options={meetingTypes}
                defaultValue="internal"
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

            {/* Date & Time */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">
                  Date <span className="text-error-500">*</span>
                </label>
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  aria-label="Meeting date"
                />
              </div>
              {!isAllDay && (
                <>
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
                    <Input id="endTime" name="endTime" type="time" size="sm" defaultValue="10:00" />
                  </div>
                </>
              )}
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
              <div className="flex items-center gap-2">
                <Repeat01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">Recurring meeting</span>
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
                  defaultValue="weekly"
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
                placeholder="Add a location"
              />
            </div>

            {/* Video Link */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="videoLink" className="text-sm font-medium text-secondary">
                Video Conference Link
              </label>
              <Input
                id="videoLink"
                name="videoLink"
                size="sm"
                icon={VideoRecorder}
                placeholder="Paste Zoom, Teams, or Meet link"
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
                defaultValue="15"
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
                placeholder="Add meeting notes or agenda..."
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
          <Button type="submit" form="new-meeting-form" size="md">
            Create Meeting
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
