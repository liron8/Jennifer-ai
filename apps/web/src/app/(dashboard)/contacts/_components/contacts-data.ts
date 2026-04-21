/**
 * Contacts Types and Utilities
 */

export interface Contact {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  additionalEmails?: string[];
  phone: string;
  category: "client" | "vendor" | "partner" | "personal" | "vip";
  tags?: string[];
  notes?: string;
  lastContact?: string;
  birthday?: string;
  timezone?: string;
  linkedinUrl?: string;
}

export const categoryColors: Record<Contact["category"], string> = {
  vip: "purple",
  client: "blue",
  vendor: "orange",
  partner: "success",
  personal: "gray",
};

export const categoryLabels: Record<Contact["category"], string> = {
  vip: "VIP",
  client: "Client",
  vendor: "Vendor",
  partner: "Partner",
  personal: "Personal",
};

export const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};
