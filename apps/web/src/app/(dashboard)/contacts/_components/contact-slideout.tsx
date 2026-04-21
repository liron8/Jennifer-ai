"use client";

/**
 * ContactSlideout Component
 * Slideout panel for viewing and editing contact details
 */

import { useState, useEffect } from "react";
import {
  Mail01,
  Phone01,
  Building02,
  User01,
  Tag01,
  Calendar,
  Star01,
} from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Avatar } from "@/components/base/avatar/avatar";
import { type Contact, categoryLabels, getInitials } from "./contacts-data";

interface ContactSlideoutProps {
  contact: Contact | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (contact: Contact) => void;
}

const categoryOptions = [
  { label: "VIP", value: "vip" },
  { label: "Client", value: "client" },
  { label: "Vendor", value: "vendor" },
  { label: "Partner", value: "partner" },
  { label: "Personal", value: "personal" },
];

const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
  vip: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  client: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  vendor: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
  partner: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  personal: { bg: "bg-gray-50 dark:bg-gray-900/20", text: "text-gray-700 dark:text-gray-400", border: "border-gray-200 dark:border-gray-800" },
};

export function ContactSlideout({ contact, isOpen, onOpenChange, mode, onSave }: ContactSlideoutProps) {
  const [isEditing, setIsEditing] = useState(mode === "edit");
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(contact?.additionalEmails || []);

  // Sync isEditing when mode prop changes (e.g. clicking Edit vs View from table)
  useEffect(() => {
    setIsEditing(mode === "edit");
    setAdditionalEmails(contact?.additionalEmails || []);
  }, [mode, contact]);

  if (!contact) return null;

  const colors = categoryColorMap[contact.category] || categoryColorMap.personal;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const filteredEmails = additionalEmails.filter((e) => e.trim() !== "");
    const updatedContact: Contact = {
      ...contact,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      additionalEmails: filteredEmails.length > 0 ? filteredEmails : undefined,
      phone: formData.get("phone") as string,
      company: formData.get("company") as string,
      title: formData.get("title") as string,
      category: formData.get("category") as Contact["category"],
      notes: formData.get("notes") as string,
      birthday: formData.get("birthday") as string || undefined,
      timezone: formData.get("timezone") as string || undefined,
      linkedinUrl: formData.get("linkedin_url") as string || undefined,
    };

    onSave?.(updatedContact);
    setIsEditing(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className={`relative w-full border-b px-4 py-5 md:px-6 ${colors.bg} ${colors.border}`}>
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          
          <div className="flex items-center gap-4">
            <Avatar
              initials={getInitials(contact.name)}
              alt={contact.name}
              size="xl"
              className="ring-4 ring-white dark:ring-gray-900 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{contact.name}</h2>
                {contact.category === "vip" && (
                  <Star01 className="h-5 w-5 text-amber-500 fill-amber-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{contact.title} at {contact.company}</p>
              <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {categoryLabels[contact.category]}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          {isEditing ? (
            <form id="edit-contact-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <Input name="name" size="sm" defaultValue={contact.name} isRequired />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <Input name="email" type="email" size="sm" defaultValue={contact.email} isRequired />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <Input name="phone" size="sm" defaultValue={contact.phone} />
                </div>
              </div>

              {/* Additional Emails */}
              {additionalEmails.map((ae, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Additional Email {idx + 1}
                    </label>
                    <Input
                      type="email"
                      size="sm"
                      defaultValue={ae}
                      onChange={(val) => {
                        const updated = [...additionalEmails];
                        updated[idx] = val;
                        setAdditionalEmails(updated);
                      }}
                      placeholder="alternate@company.com"
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                  <Input name="company" size="sm" defaultValue={contact.company} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <Input name="title" size="sm" defaultValue={contact.title} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <NativeSelect name="category" options={categoryOptions} defaultValue={contact.category} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Birthday</label>
                  <input
                    name="birthday"
                    type="date"
                    defaultValue={contact.birthday || ""}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Zone</label>
                  <NativeSelect
                    name="timezone"
                    options={[
                      { label: "Select...", value: "" },
                      { label: "US Eastern (ET)", value: "America/New_York" },
                      { label: "US Central (CT)", value: "America/Chicago" },
                      { label: "US Mountain (MT)", value: "America/Denver" },
                      { label: "US Pacific (PT)", value: "America/Los_Angeles" },
                      { label: "UK / London", value: "Europe/London" },
                      { label: "Central Europe", value: "Europe/Berlin" },
                      { label: "India (IST)", value: "Asia/Kolkata" },
                      { label: "China (CST)", value: "Asia/Shanghai" },
                      { label: "Japan (JST)", value: "Asia/Tokyo" },
                      { label: "Australia Eastern", value: "Australia/Sydney" },
                      { label: "Singapore", value: "Asia/Singapore" },
                      { label: "Dubai", value: "Asia/Dubai" },
                    ]}
                    defaultValue={contact.timezone || ""}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">LinkedIn URL</label>
                <Input name="linkedin_url" size="sm" defaultValue={contact.linkedinUrl || ""} placeholder="https://linkedin.com/in/username" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={contact.notes || ""}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contact Information</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <Mail01 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.email}</p>
                    </div>
                  </div>

                  {contact.additionalEmails && contact.additionalEmails.length > 0 && (
                    contact.additionalEmails.map((ae, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                          <Mail01 className="h-5 w-5 text-blue-400 dark:text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Email {idx + 2}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ae}</p>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                      <Phone01 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                      <Building02 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.company}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                      <User01 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Title</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.title}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(contact.birthday || contact.timezone || contact.linkedinUrl) && (
                <div className="space-y-3">
                  {contact.birthday && (
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/50">
                        <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Birthday</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(contact.birthday + 'T12:00:00').toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                  {contact.timezone && (
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                        <span className="text-lg">🌍</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Time Zone</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.timezone.replace('_', ' ').replace('/', ' / ')}</p>
                      </div>
                    </div>
                  )}
                  {contact.linkedinUrl && (
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                        <span className="text-lg font-bold text-blue-700">in</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">LinkedIn</p>
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                          View Profile
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <Tag01 className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    {contact.notes}
                  </p>
                </div>
              )}

              {/* Last Contact */}
              {contact.lastContact && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  Last contacted: {contact.lastContact}
                </div>
              )}
            </div>
          )}
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          {isEditing ? (
            <>
              <Button size="md" color="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" form="edit-contact-form" size="md" color="primary">
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button size="md" color="primary" onClick={() => setIsEditing(true)}>
                Edit Contact
              </Button>
            </>
          )}
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
