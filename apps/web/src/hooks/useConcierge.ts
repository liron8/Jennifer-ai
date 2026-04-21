/**
 * Concierge Services Hook
 * Fetch and manage concierge services from the database
 * Note: This is a Pro tier feature
 */

import { useState, useEffect, useCallback } from 'react';

export type ConciergeCategory = 
  | 'restaurants'
  | 'hotels'
  | 'transportation'
  | 'entertainment'
  | 'wellness'
  | 'shopping'
  | 'travel'
  | 'other';

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export interface DatabaseConciergeService {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: ConciergeCategory;
  subcategory: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  price_range: PriceRange | null;
  rating: number | null;
  notes: string | null;
  special_instructions: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  contact_id: string | null;
}

export interface ConciergeFilters {
  category?: ConciergeCategory | ConciergeCategory[];
  city?: string;
  price_range?: PriceRange | PriceRange[];
  favorites_only?: boolean;
  search?: string;
}

export interface CreateConciergeServiceData {
  name: string;
  description?: string;
  category: ConciergeCategory;
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

export interface UpdateConciergeServiceData extends Partial<CreateConciergeServiceData> {
  is_favorite?: boolean;
  contact_id?: string | null;
}

interface UseConciergeReturn {
  services: DatabaseConciergeService[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createService: (data: CreateConciergeServiceData) => Promise<DatabaseConciergeService | null>;
  updateService: (id: string, data: UpdateConciergeServiceData) => Promise<DatabaseConciergeService | null>;
  deleteService: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<DatabaseConciergeService | null>;
  stats: {
    total: number;
    favorites: number;
    restaurants: number;
    hotels: number;
    transportation: number;
    entertainment: number;
    wellness: number;
    shopping: number;
    travel: number;
    other: number;
  };
}

export function useConcierge(filters?: ConciergeFilters): UseConciergeReturn {
  const [services, setServices] = useState<DatabaseConciergeService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((filters?: ConciergeFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      categories.forEach(c => params.append('category', c));
    }
    
    if (filters?.city) {
      params.set('city', filters.city);
    }
    
    if (filters?.price_range) {
      const ranges = Array.isArray(filters.price_range) ? filters.price_range : [filters.price_range];
      ranges.forEach(r => params.append('price_range', r));
    }
    
    if (filters?.favorites_only) {
      params.set('favorites_only', 'true');
    }
    
    if (filters?.search) {
      params.set('search', filters.search);
    }
    
    params.set('page_size', '100');
    
    return params.toString();
  }, []);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/concierge?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch concierge services');
      }

      const result = await response.json();
      const list = result.data?.data ?? result.data ?? [];
      setServices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching concierge services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch concierge services');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, filters]);

  const createService = useCallback(async (data: CreateConciergeServiceData): Promise<DatabaseConciergeService | null> => {
    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create service');
      }

      const result = await response.json();
      const created = result.data?.data ?? result.data;
      setServices(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const newServices = [created, ...safePrev];
        return newServices.sort((a, b) => a.name.localeCompare(b.name));
      });
      return created;
    } catch (err) {
      console.error('Error creating service:', err);
      throw err;
    }
  }, []);

  const updateService = useCallback(async (id: string, data: UpdateConciergeServiceData): Promise<DatabaseConciergeService | null> => {
    try {
      const response = await fetch(`/api/concierge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update service');
      }

      const result = await response.json();
      const updatedSvc = result.data?.data ?? result.data;
      setServices(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const updated = safePrev.map(svc => svc.id === id ? updatedSvc : svc);
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });
      return updatedSvc;
    } catch (err) {
      console.error('Error updating service:', err);
      throw err;
    }
  }, []);

  const deleteService = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/concierge/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete service');
      }

      setServices(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter(svc => svc.id !== id);
      });
      return true;
    } catch (err) {
      console.error('Error deleting service:', err);
      throw err;
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string): Promise<DatabaseConciergeService | null> => {
    const service = services.find(s => s.id === id);
    if (!service) return null;

    try {
      const response = await fetch(`/api/concierge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !service.is_favorite }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      const result = await response.json();
      const toggled = result.data?.data ?? result.data;
      setServices(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.map(svc => svc.id === id ? toggled : svc);
      });
      return toggled;
    } catch (err) {
      console.error('Error toggling favorite:', err);
      throw err;
    }
  }, [services]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const safeServices = Array.isArray(services) ? services : [];
  
  const stats = {
    total: safeServices.length,
    favorites: safeServices.filter(svc => svc.is_favorite).length,
    restaurants: safeServices.filter(svc => svc.category === 'restaurants').length,
    hotels: safeServices.filter(svc => svc.category === 'hotels').length,
    transportation: safeServices.filter(svc => svc.category === 'transportation').length,
    entertainment: safeServices.filter(svc => svc.category === 'entertainment').length,
    wellness: safeServices.filter(svc => svc.category === 'wellness').length,
    shopping: safeServices.filter(svc => svc.category === 'shopping').length,
    travel: safeServices.filter(svc => svc.category === 'travel').length,
    other: safeServices.filter(svc => svc.category === 'other').length,
  };

  return {
    services,
    isLoading,
    error,
    refetch: fetchServices,
    createService,
    updateService,
    deleteService,
    toggleFavorite,
    stats,
  };
}
