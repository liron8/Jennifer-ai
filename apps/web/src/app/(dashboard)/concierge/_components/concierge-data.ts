/**
 * Concierge Services Types and Utilities
 */

export interface Service {
  id: string;
  name: string;
  category: "restaurants" | "hotels" | "transportation" | "entertainment" | "wellness" | "shopping" | "travel" | "other";
  description: string;
  contact?: string;
  phone?: string;
  address?: string;
  website?: string;
  rating?: number;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
  contactId?: string;
  contactName?: string;
}

export const categoryIcons: Record<Service["category"], string> = {
  restaurants: "🍽️",
  hotels: "🏨",
  transportation: "🚗",
  entertainment: "🎭",
  wellness: "💆",
  shopping: "🛍️",
  travel: "✈️",
  other: "📌",
};

export const categoryLabels: Record<Service["category"], string> = {
  restaurants: "Restaurants",
  hotels: "Hotels",
  transportation: "Transportation",
  entertainment: "Entertainment",
  wellness: "Wellness",
  shopping: "Shopping",
  travel: "Travel",
  other: "Other",
};
