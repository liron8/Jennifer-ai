"use client";

/**
 * AddExecutiveSlideout Component
 * Slideout panel for adding new executives to the team
 */

import { useState } from "react";
import {
  User01,
  Mail01,
  Phone01,
  MarkerPin01,
  Building07,
  Clock,
} from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Executive } from "./executive-data";

interface AddExecutiveSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (executive: Omit<Executive, "id">) => void;
}

const departmentOptions = [
  { label: "Executive", value: "Executive" },
  { label: "Finance", value: "Finance" },
  { label: "Engineering", value: "Engineering" },
  { label: "Marketing", value: "Marketing" },
  { label: "Operations", value: "Operations" },
  { label: "Human Resources", value: "Human Resources" },
  { label: "Sales", value: "Sales" },
  { label: "Legal", value: "Legal" },
  { label: "Product", value: "Product" },
];

const timezoneOptions = [
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "GMT", value: "Europe/London" },
  { label: "CET", value: "Europe/Paris" },
];

const meetingBufferOptions = [
  { label: "No buffer", value: "0" },
  { label: "5 minutes", value: "5" },
  { label: "10 minutes", value: "10" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
];

export function AddExecutiveSlideout({ isOpen, onOpenChange, onSubmit }: AddExecutiveSlideoutProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const executive: Omit<Executive, "id"> = {
      name: formData.get("name") as string,
      title: formData.get("title") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || "",
      location: formData.get("location") as string || "",
      timezone: formData.get("timezone") as string,
      department: formData.get("department") as string,
      bio: formData.get("bio") as string || undefined,
      preferences: {
        meetingBuffer: parseInt(formData.get("meetingBuffer") as string, 10),
        preferredMeetingTimes: [],
        dietary: formData.get("dietary") as string || undefined,
        travel: formData.get("travel") as string || undefined,
      },
    };

    onSubmit?.(executive);
    onOpenChange(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Add Executive</h2>
          <p className="text-sm text-tertiary">Add a new executive to your organization</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-executive-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">Basic Information</h3>
              
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-secondary">
                  Full Name <span className="text-error-500">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  size="sm"
                  icon={User01}
                  placeholder="e.g., John Smith"
                  isRequired
                />
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-sm font-medium text-secondary">
                  Job Title <span className="text-error-500">*</span>
                </label>
                <Input
                  id="title"
                  name="title"
                  size="sm"
                  placeholder="e.g., Chief Executive Officer"
                  isRequired
                />
              </div>

              {/* Department */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="department" className="text-sm font-medium text-secondary">
                  Department <span className="text-error-500">*</span>
                </label>
                <NativeSelect
                  id="department"
                  name="department"
                  options={departmentOptions}
                  defaultValue="Executive"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 border-t border-secondary pt-5">
              <h3 className="text-sm font-semibold text-primary">Contact Information</h3>
              
              {/* Email & Phone */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-secondary">
                    Email <span className="text-error-500">*</span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    size="sm"
                    icon={Mail01}
                    placeholder="john@company.com"
                    isRequired
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-sm font-medium text-secondary">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    size="sm"
                    icon={Phone01}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Location & Timezone */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="location" className="text-sm font-medium text-secondary">
                    Location
                  </label>
                  <Input
                    id="location"
                    name="location"
                    size="sm"
                    icon={MarkerPin01}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="timezone" className="text-sm font-medium text-secondary">
                    Timezone <span className="text-error-500">*</span>
                  </label>
                  <NativeSelect
                    id="timezone"
                    name="timezone"
                    options={timezoneOptions}
                    defaultValue="America/Los_Angeles"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-4 border-t border-secondary pt-5">
              <h3 className="text-sm font-semibold text-primary">Biography</h3>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bio" className="text-sm font-medium text-secondary">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  placeholder="Brief biography or background..."
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4 border-t border-secondary pt-5">
              <h3 className="text-sm font-semibold text-primary">Preferences</h3>
              
              {/* Meeting Buffer */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meetingBuffer" className="text-sm font-medium text-secondary">
                  Meeting Buffer
                </label>
                <NativeSelect
                  id="meetingBuffer"
                  name="meetingBuffer"
                  options={meetingBufferOptions}
                  defaultValue="15"
                />
              </div>

              {/* Dietary & Travel */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dietary" className="text-sm font-medium text-secondary">
                    Dietary Restrictions
                  </label>
                  <Input
                    id="dietary"
                    name="dietary"
                    size="sm"
                    placeholder="e.g., Vegetarian, No shellfish"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="travel" className="text-sm font-medium text-secondary">
                    Travel Preferences
                  </label>
                  <Input
                    id="travel"
                    name="travel"
                    size="sm"
                    placeholder="e.g., Window seat, Business class"
                  />
                </div>
              </div>
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-executive-form" size="md" color="primary">
            Add Executive
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
