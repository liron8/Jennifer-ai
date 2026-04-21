/**
 * Tasks Hook
 * Fetch and manage tasks from the database
 */

import { useState, useEffect, useCallback } from 'react';

export interface DatabaseTask {
  id: string;
  org_id: string;
  executive_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'approval' | 'done';
  priority: 'high' | 'medium' | 'low';
  category: string | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  subtasks: any[] | null;
  tags: string[] | null;
  related_meeting_id: string | null;
  related_contact_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskFilters {
  status?: string | string[];
  priority?: string | string[];
  category?: string;
  search?: string;
  executive_id?: string;
  assigned_to?: string;
  due_before?: string;
  due_after?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'approval' | 'done';
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  due_date?: string;
  due_time?: string;
  executive_id?: string;
  assigned_to?: string;
  subtasks?: any[];
  tags?: string[];
  related_meeting_id?: string;
  related_contact_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  folder_id?: string | null;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  completed_at?: string | null;
}

interface UseTasksReturn {
  tasks: DatabaseTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<DatabaseTask | null>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<DatabaseTask | null>;
  deleteTask: (id: string) => Promise<boolean>;
  stats: {
    todo: number;
    in_progress: number;
    approval: number;
    done: number;
    total: number;
  };
}

export function useTasks(filters?: TaskFilters): UseTasksReturn {
  const [tasks, setTasks] = useState<DatabaseTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((filters?: TaskFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      statuses.forEach(s => params.append('status', s));
    }
    
    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      priorities.forEach(p => params.append('priority', p));
    }
    
    if (filters?.category) {
      params.set('category', filters.category);
    }
    
    if (filters?.search) {
      params.set('search', filters.search);
    }
    
    if (filters?.executive_id) {
      params.set('executive_id', filters.executive_id);
    }
    
    if (filters?.assigned_to) {
      params.set('assigned_to', filters.assigned_to);
    }
    
    if (filters?.due_before) {
      params.set('due_before', filters.due_before);
    }
    
    if (filters?.due_after) {
      params.set('due_after', filters.due_after);
    }
    
    // Get more results
    params.set('page_size', '100');
    
    return params.toString();
  }, []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/tasks?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setTasks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, filters]);

  const createTask = useCallback(async (data: CreateTaskData): Promise<DatabaseTask | null> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create task');
      }

      const result = await response.json();
      const created = result.data?.data ?? result.data;
      // Add to local state
      setTasks(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [created, ...safePrev];
      });
      return created;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: string, data: UpdateTaskData): Promise<DatabaseTask | null> => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update task');
      }

      const result = await response.json();
      const updated = result.data?.data ?? result.data;
      // Update local state
      setTasks(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.map(t => t.id === id ? updated : t);
      });
      return updated;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Remove from local state
      setTasks(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter(t => t.id !== id);
      });
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Calculate stats with safeguard for empty/undefined tasks
  const stats = {
    todo: Array.isArray(tasks) ? tasks.filter(t => t.status === 'todo').length : 0,
    in_progress: Array.isArray(tasks) ? tasks.filter(t => t.status === 'in_progress').length : 0,
    approval: Array.isArray(tasks) ? tasks.filter(t => t.status === 'approval').length : 0,
    done: Array.isArray(tasks) ? tasks.filter(t => t.status === 'done').length : 0,
    total: Array.isArray(tasks) ? tasks.length : 0,
  };

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    stats,
  };
}
