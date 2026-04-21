/**
 * Concierge Service Entity Types
 */

export type ServiceCategory = 
  | 'restaurant'
  | 'hotel'
  | 'transportation'
  | 'venue'
  | 'gift'
  | 'florist'
  | 'catering'
  | 'entertainment'
  | 'spa'
  | 'fitness'
  | 'other';

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export interface ConciergeService {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  subcategory?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  price_range?: PriceRange;
  rating?: number;
  notes?: string;
  special_instructions?: string;
  tags: string[];
  is_favorite: boolean;
  times_used: number;
  last_used_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConciergeServiceCreateInput {
  name: string;
  description?: string;
  category: ServiceCategory;
  subcategory?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  price_range?: PriceRange;
  rating?: number;
  notes?: string;
  special_instructions?: string;
  tags?: string[];
}

export interface ConciergeServiceUpdateInput {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  subcategory?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  price_range?: PriceRange;
  rating?: number;
  notes?: string;
  special_instructions?: string;
  tags?: string[];
  is_favorite?: boolean;
}

export interface ConciergeServiceFilters {
  category?: ServiceCategory | ServiceCategory[];
  city?: string;
  price_range?: PriceRange | PriceRange[];
  favorites_only?: boolean;
  search?: string;
  tags?: string[];
}
