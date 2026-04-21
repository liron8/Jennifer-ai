/**
 * Key Dates Hook
 * Fetch and manage key dates from the database
 */

import { useState, useEffect, useCallback } from 'react';

export type KeyDateCategory = 
  | 'birthdays'
  | 'anniversaries'
  | 'deadlines'
  | 'milestones'
  | 'travel'
  | 'financial'
  | 'team'
  | 'personal'
  | 'vip'
  | 'expirations'
  | 'holidays'
  | 'other';

export interface DatabaseKeyDate {
  id: string;
  org_id: string;
  executive_id: string | null;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  category: KeyDateCategory;
  related_person: string | null;
  related_contact_id: string | null;
  related_family_member_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  reminder_days: number[] | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface KeyDateFilters {
  category?: KeyDateCategory | KeyDateCategory[];
  executive_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface CreateKeyDateData {
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  category: KeyDateCategory;
  related_person?: string;
  related_contact_id?: string;
  related_family_member_id?: string;
  executive_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  reminder_days?: number[];
  tags?: string[];
}

export interface UpdateKeyDateData extends Partial<CreateKeyDateData> {}

interface UseKeyDatesReturn {
  keyDates: DatabaseKeyDate[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createKeyDate: (data: CreateKeyDateData) => Promise<DatabaseKeyDate | null>;
  updateKeyDate: (id: string, data: UpdateKeyDateData) => Promise<DatabaseKeyDate | null>;
  deleteKeyDate: (id: string) => Promise<boolean>;
  stats: {
    total: number;
    birthdays: number;
    anniversaries: number;
    deadlines: number;
    milestones: number;
    travel: number;
    financial: number;
    team: number;
    personal: number;
    vip: number;
    expirations: number;
    holidays: number;
    other: number;
  };
}

export function useKeyDates(filters?: KeyDateFilters): UseKeyDatesReturn {
  const [keyDates, setKeyDates] = useState<DatabaseKeyDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((filters?: KeyDateFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      categories.forEach(c => params.append('category', c));
    }
    
    if (filters?.executive_id) {
      params.set('executive_id', filters.executive_id);
    }
    
    if (filters?.start_date) {
      params.set('start_date', filters.start_date);
    }
    
    if (filters?.end_date) {
      params.set('end_date', filters.end_date);
    }
    
    if (filters?.search) {
      params.set('search', filters.search);
    }
    
    params.set('page_size', '100');
    
    return params.toString();
  }, []);

  const fetchKeyDates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/key-dates?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch key dates');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setKeyDates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching key dates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch key dates');
      setKeyDates([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, filters]);

  const createKeyDate = useCallback(async (data: CreateKeyDateData): Promise<DatabaseKeyDate | null> => {
    try {
      const response = await fetch('/api/key-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create key date');
      }

      const result = await response.json();
      const created = result.data?.data ?? result.data;
      setKeyDates(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        // Insert in sorted order by date
        const newDates = [created, ...safePrev];
        return newDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
      return created;
    } catch (err) {
      console.error('Error creating key date:', err);
      throw err;
    }
  }, []);

  const updateKeyDate = useCallback(async (id: string, data: UpdateKeyDateData): Promise<DatabaseKeyDate | null> => {
    try {
      const response = await fetch(`/api/key-dates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update key date');
      }

      const result = await response.json();
      const updatedItem = result.data?.data ?? result.data;
      setKeyDates(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const updated = safePrev.map(kd => kd.id === id ? updatedItem : kd);
        return updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
      return updatedItem;
    } catch (err) {
      console.error('Error updating key date:', err);
      throw err;
    }
  }, []);

  const deleteKeyDate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/key-dates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete key date');
      }

      setKeyDates(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter(kd => kd.id !== id);
      });
      return true;
    } catch (err) {
      console.error('Error deleting key date:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchKeyDates();
  }, [fetchKeyDates]);

  const safeKeyDates = Array.isArray(keyDates) ? keyDates : [];
  
  const stats = {
    total: safeKeyDates.length,
    birthdays: safeKeyDates.filter(kd => kd.category === 'birthdays').length,
    anniversaries: safeKeyDates.filter(kd => kd.category === 'anniversaries').length,
    deadlines: safeKeyDates.filter(kd => kd.category === 'deadlines').length,
    milestones: safeKeyDates.filter(kd => kd.category === 'milestones').length,
    travel: safeKeyDates.filter(kd => kd.category === 'travel').length,
    financial: safeKeyDates.filter(kd => kd.category === 'financial').length,
    team: safeKeyDates.filter(kd => kd.category === 'team').length,
    personal: safeKeyDates.filter(kd => kd.category === 'personal').length,
    vip: safeKeyDates.filter(kd => kd.category === 'vip').length,
    expirations: safeKeyDates.filter(kd => kd.category === 'expirations').length,
    holidays: safeKeyDates.filter(kd => kd.category === 'holidays').length,
    other: safeKeyDates.filter(kd => kd.category === 'other').length,
  };

  return {
    keyDates,
    isLoading,
    error,
    refetch: fetchKeyDates,
    createKeyDate,
    updateKeyDate,
    deleteKeyDate,
    stats,
  };
}
