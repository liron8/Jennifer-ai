/**
 * Executive Types and Utilities
 */

export interface Executive {
  id: string;
  name: string;
  preferredName?: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  department: string;
  bio?: string;
  preferences?: {
    meetingBuffer: number;
    preferredMeetingTimes: string[];
    dietary?: string;
    travel?: string;
  };
}

export interface DirectReport {
  id: string;
  name: string;
  title: string;
  email: string;
  department: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birthday?: string;
  notes?: string;
}

export interface Membership {
  id: string;
  name: string;
  category: "airlines" | "hotels" | "lounges" | "travel" | "other";
  memberNumber?: string;
  tier?: string;
  expirationDate?: string;
}

export const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};
