"use client";

/**
 * AddStopSlideout Component
 * Slideout panel for adding new stops to the route planner
 */

import { useState } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  MarkerPin01,
  Clock,
  Building07,
} from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";

interface AddStopSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (stop: StopFormData) => void;
}

export interface StopFormData {
  title: string;
  address: string;
  time: string;
  duration: string;
  type: "client" | "personal" | "internal";
  notes?: string;
}

const typeOptions = [
  { label: "Client Meeting", value: "client" },
  { label: "Personal", value: "personal" },
  { label: "Internal", value: "internal" },
];

const durationOptions = [
  { label: "15 minutes", value: "15 min" },
  { label: "30 minutes", value: "30 min" },
  { label: "45 minutes", value: "45 min" },
  { label: "1 hour", value: "1 hr" },
  { label: "1.5 hours", value: "1.5 hr" },
  { label: "2 hours", value: "2 hr" },
  { label: "2.5 hours", value: "2.5 hr" },
  { label: "3 hours", value: "3 hr" },
];

const timeOptions = [
  { label: "8:00 AM", value: "8:00 AM" },
  { label: "8:30 AM", value: "8:30 AM" },
  { label: "9:00 AM", value: "9:00 AM" },
  { label: "9:30 AM", value: "9:30 AM" },
  { label: "10:00 AM", value: "10:00 AM" },
  { label: "10:30 AM", value: "10:30 AM" },
  { label: "11:00 AM", value: "11:00 AM" },
  { label: "11:30 AM", value: "11:30 AM" },
  { label: "12:00 PM", value: "12:00 PM" },
  { label: "12:30 PM", value: "12:30 PM" },
  { label: "1:00 PM", value: "1:00 PM" },
  { label: "1:30 PM", value: "1:30 PM" },
  { label: "2:00 PM", value: "2:00 PM" },
  { label: "2:30 PM", value: "2:30 PM" },
  { label: "3:00 PM", value: "3:00 PM" },
  { label: "3:30 PM", value: "3:30 PM" },
  { label: "4:00 PM", value: "4:00 PM" },
  { label: "4:30 PM", value: "4:30 PM" },
  { label: "5:00 PM", value: "5:00 PM" },
  { label: "5:30 PM", value: "5:30 PM" },
  { label: "6:00 PM", value: "6:00 PM" },
  { label: "6:30 PM", value: "6:30 PM" },
  { label: "7:00 PM", value: "7:00 PM" },
  { label: "7:30 PM", value: "7:30 PM" },
  { label: "8:00 PM", value: "8:00 PM" },
];

export function AddStopSlideout({ isOpen, onOpenChange, onSubmit }: AddStopSlideoutProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const stop: StopFormData = {
      title: formData.get("title") as string,
      address: formData.get("address") as string,
      time: formData.get("time") as string,
      duration: formData.get("duration") as string,
      type: formData.get("type") as "client" | "personal" | "internal",
      notes: formData.get("notes") as string || undefined,
    };

    onSubmit?.(stop);
    onOpenChange(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Add Stop</h2>
          <p className="text-sm text-tertiary">Add a new location to your route</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-stop-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Meeting Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-secondary">
                Meeting Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                icon={Building07}
                placeholder="e.g., Client Meeting - Acme Corp"
                isRequired
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-secondary">
                Address <span className="text-error-500">*</span>
              </label>
              <Input
                id="address"
                name="address"
                size="sm"
                icon={MarkerPin01}
                placeholder="Full address of the location"
                isRequired
              />
            </div>

            {/* Time & Duration */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="time" className="text-sm font-medium text-secondary">
                  Time <span className="text-error-500">*</span>
                </label>
                <NativeSelect
                  id="time"
                  name="time"
                  options={timeOptions}
                  defaultValue="9:00 AM"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="duration" className="text-sm font-medium text-secondary">
                  Duration <span className="text-error-500">*</span>
                </label>
                <NativeSelect
                  id="duration"
                  name="duration"
                  options={durationOptions}
                  defaultValue="1 hr"
                />
              </div>
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="type" className="text-sm font-medium text-secondary">
                Meeting Type <span className="text-error-500">*</span>
              </label>
              <NativeSelect
                id="type"
                name="type"
                options={typeOptions}
                defaultValue="client"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-secondary">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Any additional notes about this stop..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Drive time and distance will be calculated automatically after adding this stop.
              </p>
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-stop-form" size="md" color="primary">
            Add Stop
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
