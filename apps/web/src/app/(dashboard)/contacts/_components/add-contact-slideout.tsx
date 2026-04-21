"use client";

/**
 * AddContactSlideout Component
 * Slideout panel for adding new contacts to the directory
 */

import { useState } from "react";
import {
  Mail01,
  Phone01,
  Building02,
  User01,
  Tag01,
} from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Contact } from "./contacts-data";

interface AddContactSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (contact: Omit<Contact, "id">) => void;
}

const categoryOptions = [
  { label: "VIP", value: "vip" },
  { label: "Client", value: "client" },
  { label: "Vendor", value: "vendor" },
  { label: "Partner", value: "partner" },
  { label: "Personal", value: "personal" },
];

export function AddContactSlideout({ isOpen, onOpenChange, onSubmit }: AddContactSlideoutProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const contact: Omit<Contact, "id"> = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      additionalEmails: additionalEmails.length > 0 ? additionalEmails : undefined,
      phone: formData.get("phone") as string,
      company: formData.get("company") as string,
      title: formData.get("title") as string,
      category: formData.get("category") as Contact["category"],
      tags: tags.length > 0 ? tags : undefined,
      notes: formData.get("notes") as string || undefined,
      birthday: formData.get("birthday") as string || undefined,
      timezone: formData.get("timezone") as string || undefined,
      linkedinUrl: formData.get("linkedin_url") as string || undefined,
    };

    onSubmit?.(contact);
    onOpenChange(false);

    // Reset form state
    setTags([]);
    setTagInput("");
    setAdditionalEmails([]);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">Add Contact</h2>
          <p className="text-sm text-tertiary">Add a new contact to your directory</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-contact-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            {/* Additional Emails */}
            {additionalEmails.map((ae, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    Additional Email {idx + 1}
                  </label>
                  <Input
                    type="email"
                    size="sm"
                    icon={Mail01}
                    placeholder="alternate@company.com"
                    value={ae}
                    onChange={(val) => {
                      const updated = [...additionalEmails];
                      updated[idx] = val;
                      setAdditionalEmails(updated);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAdditionalEmails(additionalEmails.filter((_, i) => i !== idx))}
                  className="mb-0.5 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  &times;
                </button>
              </div>
            ))}
            {additionalEmails.length < 5 && (
              <button
                type="button"
                onClick={() => setAdditionalEmails([...additionalEmails, ""])}
                className="self-start text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                + Add another email
              </button>
            )}

            {/* Company & Title */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="company" className="text-sm font-medium text-secondary">
                  Company
                </label>
                <Input
                  id="company"
                  name="company"
                  size="sm"
                  icon={Building02}
                  placeholder="Company name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-sm font-medium text-secondary">
                  Job Title
                </label>
                <Input
                  id="title"
                  name="title"
                  size="sm"
                  placeholder="e.g., CEO, Manager"
                />
              </div>
            </div>

            {/* Birthday & Time Zone */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="birthday" className="text-sm font-medium text-secondary">
                  Birthday
                </label>
                <input
                  id="birthday"
                  name="birthday"
                  type="date"
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="timezone" className="text-sm font-medium text-secondary">
                  Time Zone
                </label>
                <NativeSelect
                  id="timezone"
                  name="timezone"
                  options={[
                    { label: "Select time zone...", value: "" },
                    { label: "US Eastern (ET)", value: "America/New_York" },
                    { label: "US Central (CT)", value: "America/Chicago" },
                    { label: "US Mountain (MT)", value: "America/Denver" },
                    { label: "US Pacific (PT)", value: "America/Los_Angeles" },
                    { label: "US Alaska", value: "America/Anchorage" },
                    { label: "US Hawaii", value: "Pacific/Honolulu" },
                    { label: "UK / London (GMT/BST)", value: "Europe/London" },
                    { label: "Central Europe (CET)", value: "Europe/Berlin" },
                    { label: "Eastern Europe (EET)", value: "Europe/Helsinki" },
                    { label: "India (IST)", value: "Asia/Kolkata" },
                    { label: "China (CST)", value: "Asia/Shanghai" },
                    { label: "Japan (JST)", value: "Asia/Tokyo" },
                    { label: "Australia Eastern", value: "Australia/Sydney" },
                    { label: "Singapore (SGT)", value: "Asia/Singapore" },
                    { label: "Dubai (GST)", value: "Asia/Dubai" },
                    { label: "Sao Paulo (BRT)", value: "America/Sao_Paulo" },
                  ]}
                  defaultValue=""
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="linkedin_url" className="text-sm font-medium text-secondary">
                LinkedIn URL
              </label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                size="sm"
                placeholder="https://linkedin.com/in/username"
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
                defaultValue="client"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tagInput" className="text-sm font-medium text-secondary">
                Tags
              </label>
              <div className="flex gap-2">
                <Input
                  id="tagInput"
                  size="sm"
                  icon={Tag01}
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(value) => setTagInput(value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" size="sm" color="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-secondary">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Add any notes about this contact..."
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
          <Button type="submit" form="add-contact-form" size="md" color="primary">
            Add Contact
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
