"use client";

/**
 * Contact Ranking List Component
 * Shows top contacts with meeting counts
 */

import { Avatar } from "@/components/base/avatar/avatar";

interface Contact {
  name: string;
  role?: string;
  meetings: number;
}

interface ContactRankingListProps {
  contacts: Contact[];
}

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};

export function ContactRankingList({ contacts }: ContactRankingListProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-tertiary">
        No contact data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="w-5 text-xs font-medium text-tertiary">{index + 1}</span>
          <Avatar initials={getInitials(contact.name)} alt={contact.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{contact.name}</p>
            {contact.role && (
              <p className="text-xs text-tertiary truncate">{contact.role}</p>
            )}
          </div>
          <span className="text-sm font-semibold text-primary">{contact.meetings}</span>
          <span className="text-xs text-tertiary">meetings</span>
        </div>
      ))}
    </div>
  );
}
