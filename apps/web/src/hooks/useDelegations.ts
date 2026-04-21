/**
 * Delegations Hook
 * Fetch and manage delegations from the database
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface DatabaseDelegation {
  id: string;
  org_id: string;
  task_id: string;
  delegated_by: string;
  delegated_to: string;
  delegation_notes: string | null;
  due_date: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
  tasks?: {
    id: string;
    title: string;
    description: string | null;
    priority: 'high' | 'medium' | 'low';
    status: string;
    category: string | null;
    due_date: string | null;
  };
}

export interface DelegationFilters {
  status?: 'pending' | 'accepted' | 'completed' | 'rejected' | 'all';
  direction?: 'sent' | 'received' | 'all';
}

export interface CreateDelegationData {
  task_id: string;
  delegated_to: string;
  message?: string;
  due_date?: string;
}

interface UseDelegationsReturn {
  delegations: DatabaseDelegation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createDelegation: (data: CreateDelegationData) => Promise<DatabaseDelegation | null>;
  updateDelegationStatus: (id: string, status: 'accepted' | 'completed' | 'rejected') => Promise<DatabaseDelegation | null>;
  stats: {
    sent: number;
    received: number;
    pending: number;
    completed: number;
    total: number;
  };
}

export function useDelegations(filters?: DelegationFilters): UseDelegationsReturn {
  const [delegations, setDelegations] = useState<DatabaseDelegation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize filters to prevent infinite re-fetch loop from new object references
  const filtersKey = useMemo(
    () => JSON.stringify({ status: filters?.status, direction: filters?.direction }),
    [filters?.status, filters?.direction]
  );

  const fetchDelegations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const stableFilters: DelegationFilters = JSON.parse(filtersKey);
      
      if (stableFilters?.status && stableFilters.status !== 'all') {
        params.set('status', stableFilters.status);
      }
      if (stableFilters?.direction && stableFilters.direction !== 'all') {
        params.set('direction', stableFilters.direction);
      }
      params.set('page_size', '100');

      const queryString = params.toString();
      const response = await fetch(`/api/delegations?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch delegations');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setDelegations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching delegations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch delegations');
      setDelegations([]);
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  const createDelegation = useCallback(async (data: CreateDelegationData): Promise<DatabaseDelegation | null> => {
    try {
      const response = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create delegation');
      }

      const result = await response.json();
      setDelegations(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [result.data, ...safePrev];
      });
      return result.data;
    } catch (err) {
      console.error('Error creating delegation:', err);
      throw err;
    }
  }, []);

  const updateDelegationStatus = useCallback(async (
    id: string, 
    status: 'accepted' | 'completed' | 'rejected'
  ): Promise<DatabaseDelegation | null> => {
    try {
      const response = await fetch(`/api/delegations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update delegation');
      }

      const result = await response.json();
      setDelegations(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.map(d => d.id === id ? result.data : d);
      });
      return result.data;
    } catch (err) {
      console.error('Error updating delegation:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  // Note: These stats would need user context to accurately calculate sent vs received
  const stats = {
    sent: 0, // Would need current user ID to calculate
    received: 0, // Would need current user ID to calculate
    pending: Array.isArray(delegations) ? delegations.filter(d => d.status === 'pending').length : 0,
    completed: Array.isArray(delegations) ? delegations.filter(d => d.status === 'completed').length : 0,
    total: Array.isArray(delegations) ? delegations.length : 0,
  };

  return {
    delegations,
    isLoading,
    error,
    refetch: fetchDelegations,
    createDelegation,
    updateDelegationStatus,
    stats,
  };
}
