/**
 * Executives Hook
 * Fetch and manage executive profiles from the database
 */

import { useState, useEffect, useCallback } from 'react';

export interface ExecutivePhone {
  type: 'mobile' | 'office' | 'home' | 'other';
  number: string;
  is_primary?: boolean;
}

export interface DatabaseExecutive {
  id: string;
  org_id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  office_location: string | null;
  timezone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutiveFilters {
  is_active?: boolean;
  search?: string;
}

export interface CreateExecutiveData {
  full_name: string;
  title?: string;
  email?: string;
  phones?: ExecutivePhone[];
  main_office_location?: string;
  timezone?: string;
  avatar_url?: string;
  bio?: string;
}

export interface UpdateExecutiveData extends Partial<CreateExecutiveData> {
  is_active?: boolean;
}

interface UseExecutivesReturn {
  executives: DatabaseExecutive[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createExecutive: (data: CreateExecutiveData) => Promise<DatabaseExecutive | null>;
  updateExecutive: (id: string, data: UpdateExecutiveData) => Promise<DatabaseExecutive | null>;
  deleteExecutive: (id: string) => Promise<boolean>;
  getExecutive: (id: string) => Promise<DatabaseExecutive | null>;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export function useExecutives(filters?: ExecutiveFilters): UseExecutivesReturn {
  const [executives, setExecutives] = useState<DatabaseExecutive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((filters?: ExecutiveFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.is_active !== undefined) {
      params.set('is_active', String(filters.is_active));
    }
    
    if (filters?.search) {
      params.set('search', filters.search);
    }
    
    params.set('page_size', '100');
    
    return params.toString();
  }, []);

  const fetchExecutives = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/executives?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch executives');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setExecutives(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching executives:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch executives');
      setExecutives([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, filters]);

  const getExecutive = useCallback(async (id: string): Promise<DatabaseExecutive | null> => {
    try {
      const response = await fetch(`/api/executives/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch executive');
      }

      const result = await response.json();
      return result.data?.data ?? result.data;
    } catch (err) {
      console.error('Error fetching executive:', err);
      throw err;
    }
  }, []);

  const createExecutive = useCallback(async (data: CreateExecutiveData): Promise<DatabaseExecutive | null> => {
    try {
      const response = await fetch('/api/executives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create executive');
      }

      const result = await response.json();
      const created = result.data?.data ?? result.data;
      setExecutives(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const newExecutives = [created, ...safePrev];
        return newExecutives.sort((a, b) => a.full_name.localeCompare(b.full_name));
      });
      return created;
    } catch (err) {
      console.error('Error creating executive:', err);
      throw err;
    }
  }, []);

  const updateExecutive = useCallback(async (id: string, data: UpdateExecutiveData): Promise<DatabaseExecutive | null> => {
    try {
      const response = await fetch(`/api/executives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update executive');
      }

      const result = await response.json();
      const updatedExec = result.data?.data ?? result.data;
      setExecutives(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const updated = safePrev.map(exec => exec.id === id ? updatedExec : exec);
        return updated.sort((a, b) => a.full_name.localeCompare(b.full_name));
      });
      return updatedExec;
    } catch (err) {
      console.error('Error updating executive:', err);
      throw err;
    }
  }, []);

  const deleteExecutive = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/executives/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete executive');
      }

      // The API soft-deletes by setting is_active to false
      // Remove from list or update status depending on current filter
      setExecutives(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter(exec => exec.id !== id);
      });
      return true;
    } catch (err) {
      console.error('Error deleting executive:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchExecutives();
  }, [fetchExecutives]);

  const safeExecutives = Array.isArray(executives) ? executives : [];
  
  const stats = {
    total: safeExecutives.length,
    active: safeExecutives.filter(exec => exec.is_active).length,
    inactive: safeExecutives.filter(exec => !exec.is_active).length,
  };

  return {
    executives,
    isLoading,
    error,
    refetch: fetchExecutives,
    createExecutive,
    updateExecutive,
    deleteExecutive,
    getExecutive,
    stats,
  };
}
