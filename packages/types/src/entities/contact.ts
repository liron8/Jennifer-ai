/**
 * Contact Entity Types
 */

export type ContactCategory = 'vip' | 'client' | 'vendor' | 'partner' | 'personal' | 'colleague' | 'other';
export type RelationshipStrength = 1 | 2 | 3 | 4 | 5;

export interface ContactAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Contact {
  id: string;
  org_id: string;
  executive_id?: string;
  full_name: string;
  title?: string;
  company: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: ContactAddress;
  category: ContactCategory;
  tags: string[];
  relationship_notes?: string;
  relationship_strength?: RelationshipStrength;
  assistant_name?: string;
  assistant_email?: string;
  assistant_phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  last_contacted_at?: string;
  next_followup_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContactCreateInput {
  full_name: string;
  title?: string;
  company: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: ContactAddress;
  category: ContactCategory;
  tags?: string[];
  relationship_notes?: string;
  relationship_strength?: RelationshipStrength;
  executive_id?: string;
  assistant_name?: string;
  assistant_email?: string;
  linkedin_url?: string;
}

export interface ContactUpdateInput {
  full_name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: ContactAddress;
  category?: ContactCategory;
  tags?: string[];
  relationship_notes?: string;
  relationship_strength?: RelationshipStrength;
  assistant_name?: string;
  assistant_email?: string;
  assistant_phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  last_contacted_at?: string;
  next_followup_at?: string;
}

export interface ContactFilters {
  executive_id?: string;
  category?: ContactCategory | ContactCategory[];
  search?: string;
  tags?: string[];
  has_followup?: boolean;
}

export interface ContactEnrichment {
  company_info?: {
    description: string;
    industry: string;
    size: string;
    website: string;
    logo_url?: string;
  };
  social_profiles?: {
    platform: string;
    url: string;
  }[];
  recent_news?: {
    title: string;
    url: string;
    date: string;
  }[];
}
