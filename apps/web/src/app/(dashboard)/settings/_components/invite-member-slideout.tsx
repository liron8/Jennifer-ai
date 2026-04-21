"use client";

/**
 * InviteMemberSlideout Component
 * Slideout panel for inviting new team members
 */

import { useState } from "react";
import {
  Mail01,
  User01,
} from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";

interface InviteMemberSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (member: InviteMemberData) => void;
}

export interface InviteMemberData {
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  message?: string;
}

const roleOptions = [
  { label: "Admin - Full access to all features", value: "admin" },
  { label: "User - Can create and edit content", value: "user" },
  { label: "Viewer - Read-only access", value: "viewer" },
];

export function InviteMemberSlideout({ isOpen, onOpenChange, onSubmit }: InviteMemberSlideoutProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const member: InviteMemberData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as "admin" | "user" | "viewer",
      message: formData.get("message") as string || undefined,
    };

    onSubmit?.(member);
    onOpenChange(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Invite Team Member</h2>
          <p className="text-sm text-tertiary">Send an invitation to join your workspace</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="invite-member-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name */}
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

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-secondary">
                Email Address <span className="text-error-500">*</span>
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

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm font-medium text-secondary">
                Role <span className="text-error-500">*</span>
              </label>
              <NativeSelect
                id="role"
                name="role"
                options={roleOptions}
                defaultValue="user"
              />
              <p className="text-xs text-tertiary mt-1">
                Choose the access level for this team member
              </p>
            </div>

            {/* Personal Message */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm font-medium text-secondary">
                Personal Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                placeholder="Add a personal note to the invitation email..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                An email invitation will be sent to the provided address. The invitation will expire in 7 days.
              </p>
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="invite-member-form" size="md" color="primary">
            Send Invitation
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
