/**
 * Approvals Hook
 * Fetch and manage approvals from the database
 */

import { useState, useEffect, useCallback } from 'react';

export interface DatabaseApproval {
  id: string;
  org_id: string;
  executive_id: string | null;
  title: string;
  description: string | null;
  approval_type: 'expense' | 'calendar' | 'document' | 'travel' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  urgency: 'high' | 'medium' | 'low';
  amount: number | null;
  currency: string | null;
  category: string | null;
  due_date: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  attachments: any[] | null;
  comments: any[] | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalFilters {
  status?: string | string[];
  approval_type?: string;
  urgency?: string | string[];
  executive_id?: string;
  submitted_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateApprovalData {
  title: string;
  description?: string;
  approval_type: 'expense' | 'calendar' | 'document' | 'travel' | 'purchase' | 'time_off' | 'other';
  urgency?: 'high' | 'medium' | 'low' | 'urgent';
  amount?: number;
  currency?: string;
  category?: string;
  due_date?: string;
  executive_id?: string;
  attachments?: any[];
}

interface UseApprovalsReturn {
  approvals: DatabaseApproval[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createApproval: (data: CreateApprovalData) => Promise<DatabaseApproval | null>;
  updateApprovalStatus: (id: string, status: 'approved' | 'rejected' | 'info_requested', comment?: string) => Promise<DatabaseApproval | null>;
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    info_requested: number;
    total: number;
  };
}

export function useApprovals(filters?: ApprovalFilters): UseApprovalsReturn {
  const [approvals, setApprovals] = useState<DatabaseApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((filters?: ApprovalFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      statuses.forEach(s => params.append('status', s));
    }
    
    if (filters?.approval_type) {
      params.set('approval_type', filters.approval_type);
    }
    
    if (filters?.urgency) {
      const urgencies = Array.isArray(filters.urgency) ? filters.urgency : [filters.urgency];
      urgencies.forEach(u => params.append('urgency', u));
    }
    
    if (filters?.executive_id) {
      params.set('executive_id', filters.executive_id);
    }
    
    if (filters?.submitted_by) {
      params.set('submitted_by', filters.submitted_by);
    }
    
    if (filters?.date_from) {
      params.set('date_from', filters.date_from);
    }
    
    if (filters?.date_to) {
      params.set('date_to', filters.date_to);
    }
    
    params.set('page_size', '100');
    
    return params.toString();
  }, []);

  const fetchApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/approvals?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setApprovals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, filters]);

  const createApproval = useCallback(async (data: CreateApprovalData): Promise<DatabaseApproval | null> => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create approval');
      }

      const result = await response.json();
      const created = result.data?.data ?? result.data;
      setApprovals(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [created, ...safePrev];
      });
      return created;
    } catch (err) {
      console.error('Error creating approval:', err);
      throw err;
    }
  }, []);

  const updateApprovalStatus = useCallback(async (
    id: string, 
    status: 'approved' | 'rejected' | 'info_requested',
    comment?: string
  ): Promise<DatabaseApproval | null> => {
    try {
      const response = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update approval');
      }

      const result = await response.json();
      const updated = result.data?.data ?? result.data;
      setApprovals(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.map(a => a.id === id ? updated : a);
      });
      return updated;
    } catch (err) {
      console.error('Error updating approval:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const stats = {
    pending: Array.isArray(approvals) ? approvals.filter(a => a.status === 'pending').length : 0,
    approved: Array.isArray(approvals) ? approvals.filter(a => a.status === 'approved').length : 0,
    rejected: Array.isArray(approvals) ? approvals.filter(a => a.status === 'rejected').length : 0,
    info_requested: Array.isArray(approvals) ? approvals.filter(a => a.status === 'info_requested').length : 0,
    total: Array.isArray(approvals) ? approvals.length : 0,
  };

  return {
    approvals,
    isLoading,
    error,
    refetch: fetchApprovals,
    createApproval,
    updateApprovalStatus,
    stats,
  };
}
