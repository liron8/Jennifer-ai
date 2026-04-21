"use client";

/**
 * Edit Meeting Slideout
 * Slideout menu for editing existing meetings with delete functionality
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, parseDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
  Clock,
  MarkerPin01,
  Repeat01,
  Users01,
  VideoRecorder,
  Trash01,
  Copy01,
  Link01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl,
  type CalendarEventData 
} from "@/lib/calendar-links";

export interface MeetingData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_type: string;
  location_type: string;
  location?: string;
  location_details?: string;
  video_link?: string;
  attendees?: string[];
  description?: string;
  status?: string;
}

interface EditMeetingSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: MeetingData | null;
  onUpdate?: (id: string, data: Partial<MeetingData>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const meetingTypes = [
  { label: "Internal Meeting", value: "internal" },
  { label: "External / Client", value: "external" },
  { label: "One-on-One", value: "one_on_one" },
  { label: "Team Meeting", value: "team" },
  { label: "Interview", value: "interview" },
  { label: "Other", value: "other" },
];

const locationTypes = [
  { label: "Video Call", value: "video" },
  { label: "In-Person", value: "in_person" },
  { label: "Phone Call", value: "phone" },
];

const statusOptions = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Tentative", value: "tentative" },
  { label: "Cancelled", value: "cancelled" },
];

export function EditMeetingSlideout({ 
  isOpen, 
  onOpenChange, 
  meeting,
  onUpdate,
  onDelete,
}: EditMeetingSlideoutProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    meetingType: "internal",
    locationType: "video",
    location: "",
    videoLink: "",
    description: "",
    status: "scheduled",
  });

  // Update form when meeting changes
  useEffect(() => {
    if (meeting) {
      const startDate = new Date(meeting.start_time);
      const endDate = new Date(meeting.end_time);
      
      // Parse date for DatePicker
      const dateStr = startDate.toISOString().split('T')[0];
      try {
        setSelectedDate(parseDate(dateStr) as unknown as DateValue);
      } catch {
        setSelectedDate(null);
      }
      
      setFormData({
        title: meeting.title || "",
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5),
        meetingType: meeting.meeting_type || "internal",
        locationType: meeting.location_type || "video",
        location: meeting.location || meeting.location_details || "",
        videoLink: meeting.video_link || "",
        description: meeting.description || "",
        status: meeting.status || "scheduled",
      });
    }
  }, [meeting]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!meeting || !onUpdate) return;
    
    setIsSaving(true);
    try {
      // Construct start and end times
      const dateStr = selectedDate?.toString() || new Date().toISOString().split('T')[0];
      const startTime = new Date(`${dateStr}T${formData.startTime}:00`);
      const endTime = new Date(`${dateStr}T${formData.endTime}:00`);
      
      await onUpdate(meeting.id, {
        title: formData.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        meeting_type: formData.meetingType,
        location_type: formData.locationType,
        location: formData.location,
        video_link: formData.videoLink,
        description: formData.description,
        status: formData.status,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update meeting:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(meeting.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete meeting:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Generate calendar event data for "Add to Calendar" links
  const getCalendarEventData = (): CalendarEventData | null => {
    if (!meeting) return null;
    return {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      startTime: new Date(meeting.start_time),
      endTime: new Date(meeting.end_time),
    };
  };

  const handleAddToGoogle = () => {
    const eventData = getCalendarEventData();
    if (eventData) {
      window.open(generateGoogleCalendarUrl(eventData), '_blank');
    }
  };

  const handleAddToOutlook = () => {
    const eventData = getCalendarEventData();
    if (eventData) {
      window.open(generateOutlookCalendarUrl(eventData), '_blank');
    }
  };

  if (!meeting) return null;

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Event Details</h2>
          <p className="text-sm text-tertiary">Review, edit, or cancel this event</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          {showDeleteConfirm ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/30">
                <Trash01 className="h-6 w-6 text-error-600 dark:text-error-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary">Cancel this event?</h3>
                <p className="mt-1 text-sm text-tertiary">
                  Are you sure you want to cancel "{meeting.title}"? It will be removed from your calendar (including connected Outlook / Google calendars) and cannot be recovered.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button 
                  size="md" 
                  color="secondary" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  size="md" 
                  color="primary-destructive" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Cancelling..." : "Cancel Event"}
                </Button>
              </div>
            </div>
          ) : (
            <form id="edit-meeting-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-sm font-medium text-secondary">
                  Meeting Title <span className="text-error-500">*</span>
                </label>
                <Input
                  id="title"
                  name="title"
                  size="sm"
                  value={formData.title}
                  onChange={(value) => handleInputChange("title", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                  placeholder="e.g., Team Standup, Client Call"
                  isRequired
                />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className="text-sm font-medium text-secondary">
                  Status
                </label>
                <NativeSelect
                  id="status"
                  name="status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={(value) => handleInputChange("status", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
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
                  value={formData.meetingType}
                  onChange={(value) => handleInputChange("meetingType", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                />
              </div>

              {/* Date & Time */}
              <div className="grid gap-4 md:grid-cols-3">
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
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="startTime" className="text-sm font-medium text-secondary">
                    Start Time
                  </label>
                  <Input 
                    id="startTime" 
                    name="startTime" 
                    type="time" 
                    size="sm" 
                    value={formData.startTime}
                    onChange={(value) => handleInputChange("startTime", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="endTime" className="text-sm font-medium text-secondary">
                    End Time
                  </label>
                  <Input 
                    id="endTime" 
                    name="endTime" 
                    type="time" 
                    size="sm" 
                    value={formData.endTime}
                    onChange={(value) => handleInputChange("endTime", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                  />
                </div>
              </div>

              {/* Location Type */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="locationType" className="text-sm font-medium text-secondary">
                  Location Type
                </label>
                <NativeSelect
                  id="locationType"
                  name="locationType"
                  options={locationTypes}
                  value={formData.locationType}
                  onChange={(value) => handleInputChange("locationType", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                />
              </div>

              {/* Location (for in-person) */}
              {formData.locationType === "in_person" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="location" className="text-sm font-medium text-secondary">
                    Location
                  </label>
                  <Input
                    id="location"
                    name="location"
                    size="sm"
                    icon={MarkerPin01}
                    value={formData.location}
                    onChange={(value) => handleInputChange("location", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                    placeholder="Add a location"
                  />
                </div>
              )}

              {/* Video Link (for video calls) */}
              {formData.locationType === "video" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="videoLink" className="text-sm font-medium text-secondary">
                    Video Conference Link
                  </label>
                  <Input
                    id="videoLink"
                    name="videoLink"
                    size="sm"
                    icon={VideoRecorder}
                    value={formData.videoLink}
                    onChange={(value) => handleInputChange("videoLink", typeof value === 'string' ? value : (value as any)?.target?.value ?? value)}
                    placeholder="Add Zoom, Teams, or Meet link"
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
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Add meeting notes or agenda..."
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>

              {/* Add to Calendar Section */}
              <div className="border-t border-secondary pt-4">
                <p className="text-sm font-medium text-secondary mb-3">Add to External Calendar</p>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    color="tertiary"
                    onClick={handleAddToGoogle}
                  >
                    <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    color="tertiary"
                    onClick={handleAddToOutlook}
                  >
                    <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none">
                      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.152-.353.228-.578.228h-8.333v-6.55l1.264.96c.1.076.213.114.34.114.14 0 .26-.046.36-.14l.736-.63a.456.456 0 00.164-.35.456.456 0 00-.164-.35l-3.333-2.86a.52.52 0 00-.34-.114.52.52 0 00-.34.114l-3.333 2.86a.456.456 0 00-.164.35c0 .14.055.258.164.35l.736.63c.1.094.22.14.36.14.127 0 .24-.038.34-.114l1.264-.96v6.55H.816c-.225 0-.418-.076-.578-.228A.768.768 0 010 17.865V7.387c0-.23.08-.424.238-.576.16-.152.353-.228.578-.228h22.368c.225 0 .418.076.578.228.158.152.238.346.238.576z" fill="#0078D4"/>
                    </svg>
                    Outlook
                  </Button>
                </div>
              </div>
            </form>
          )}
        </SlideoutMenu.Content>

        {/* Footer */}
        {!showDeleteConfirm && (
          <SlideoutMenu.Footer className="flex w-full items-center justify-between gap-3">
            <Button 
              size="md" 
              color="primary-destructive" 
              iconLeading={Trash01}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Cancel Event
            </Button>
            <div className="flex gap-3">
              <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button 
                type="submit" 
                form="edit-meeting-form" 
                size="md"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </SlideoutMenu.Footer>
        )}
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
