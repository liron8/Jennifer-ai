/**
 * Contacts Hook
 * Fetch and manage contacts from the database
 */

import { useState, useEffect, useCallback } from 'react';

export interface DatabaseContact {
  id: string;
  org_id: string;
  executive_id: string | null;
  full_name: string;
  title: string | null;
  company: string;
  email: string;
  additional_emails: string[] | null;
  phone: string | null;
  mobile: string | null;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  category: 'vip' | 'client' | 'vendor' | 'partner' | 'personal' | 'colleague' | 'other';
  tags: string[] | null;
  relationship_notes: string | null;
  relationship_strength: number | null;
  assistant_name: string | null;
  assistant_email: string | null;
  assistant_phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContactFilters {
  category?: string | string[];
  search?: string;
  executive_id?: string;
  has_followup?: boolean;
  sort_by?: 'name' | 'company' | 'last_contacted';
  sort_order?: 'asc' | 'desc';
}

export interface CreateContactData {
  full_name: string;
  email: string;
  additional_emails?: string[];
  company: string;
  title?: string;
  phone?: string;
  mobile?: string;
  category: 'vip' | 'client' | 'vendor' | 'partner' | 'personal' | 'colleague' | 'other';
  tags?: string[];
  relationship_notes?: string;
  relationship_strength?: number;
  assistant_name?: string;
  assistant_email?: string;
  linkedin_url?: string;
}

export interface UpdateContactData {
  full_name?: string;
  email?: string;
  additional_emails?: string[] | null;
  company?: string;
  title?: string | null;
  phone?: string | null;
  mobile?: string | null;
  category?: 'vip' | 'client' | 'vendor' | 'partner' | 'personal' | 'colleague' | 'other';
  tags?: string[];
  relationship_notes?: string | null;
  relationship_strength?: number | null;
  last_contacted_at?: string | null;
  next_followup_at?: string | null;
  birthday?: string | null;
  timezone?: string | null;
  linkedin_url?: string | null;
}

interface UseContactsReturn {
  contacts: DatabaseContact[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createContact: (data: CreateContactData) => Promise<DatabaseContact | null>;
  updateContact: (id: string, data: UpdateContactData) => Promise<DatabaseContact | null>;
  deleteContact: (id: string) => Promise<boolean>;
  stats: {
    total: number;
    vip: number;
    client: number;
    vendor: number;
    partner: number;
    personal: number;
  };
}

export function useContacts(filters?: ContactFilters): UseContactsReturn {
  const [contacts, setContacts] = useState<DatabaseContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((filters?: ContactFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      categories.forEach(c => params.append('category', c));
    }
    
    if (filters?.search) {
      params.set('search', filters.search);
    }
    
    if (filters?.executive_id) {
      params.set('executive_id', filters.executive_id);
    }
    
    if (filters?.has_followup !== undefined) {
      params.set('has_followup', String(filters.has_followup));
    }
    
    if (filters?.sort_by) {
      params.set('sort_by', filters.sort_by);
    }
    
    if (filters?.sort_order) {
      params.set('sort_order', filters.sort_order);
    }
    
    params.set('page_size', '100');
    
    return params.toString();
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/contacts?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setContacts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, filters]);

  const createContact = useCallback(async (data: CreateContactData): Promise<DatabaseContact | null> => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create contact');
      }

      const result = await response.json();
      const created = result.data?.data ?? result.data;
      setContacts(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [created, ...safePrev];
      });
      return created;
    } catch (err) {
      console.error('Error creating contact:', err);
      throw err;
    }
  }, []);

  const updateContact = useCallback(async (id: string, data: UpdateContactData): Promise<DatabaseContact | null> => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update contact');
      }

      const result = await response.json();
      const updated = result.data?.data ?? result.data;
      setContacts(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.map(c => c.id === id ? updated : c);
      });
      return updated;
    } catch (err) {
      console.error('Error updating contact:', err);
      throw err;
    }
  }, []);

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      setContacts(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter(c => c.id !== id);
      });
      return true;
    } catch (err) {
      console.error('Error deleting contact:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const stats = {
    total: Array.isArray(contacts) ? contacts.length : 0,
    vip: Array.isArray(contacts) ? contacts.filter(c => c.category === 'vip').length : 0,
    client: Array.isArray(contacts) ? contacts.filter(c => c.category === 'client').length : 0,
    vendor: Array.isArray(contacts) ? contacts.filter(c => c.category === 'vendor').length : 0,
    partner: Array.isArray(contacts) ? contacts.filter(c => c.category === 'partner').length : 0,
    personal: Array.isArray(contacts) ? contacts.filter(c => c.category === 'personal').length : 0,
  };

  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    stats,
  };
}
