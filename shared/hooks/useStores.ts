import { useState, useEffect, useCallback } from 'react';
import { 
  storeService, 
  Store, 
  StoreFilters, 
  CreateStoreData, 
  UpdateStoreData,
  PaginatedResponse 
} from '@/shared/services/storeService';

interface UseStoresReturn {
  stores: Store[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  fetchStores: (filters?: StoreFilters) => Promise<void>;
  createStore: (storeData: CreateStoreData) => Promise<Store>;
  updateStore: (storeId: string, updateData: UpdateStoreData) => Promise<Store>;
  deleteStore: (storeId: string) => Promise<void>;
  getStore: (storeId: string) => Promise<Store>;
  clearError: () => void;
}

export const useStores = (initialFilters?: StoreFilters): UseStoresReturn => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchStores = useCallback(async (filters: StoreFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const data: PaginatedResponse<Store> = await storeService.getStores(filters);
      setStores(data.results);
      setPagination({
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        hasNextPage: data.hasNextPage,
        hasPrevPage: data.hasPrevPage
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stores');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStore = useCallback(async (storeData: CreateStoreData): Promise<Store> => {
    setLoading(true);
    setError(null);
    
    try {
      const newStore = await storeService.createStore(storeData);
      setStores(prev => [newStore, ...prev]);
      return newStore;
    } catch (err: any) {
      setError(err.message || 'Failed to create store');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStore = useCallback(async (storeId: string, updateData: UpdateStoreData): Promise<Store> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedStore = await storeService.updateStore(storeId, updateData);
      setStores(prev => prev.map(store => 
        store.id === storeId ? updatedStore : store
      ));
      return updatedStore;
    } catch (err: any) {
      setError(err.message || 'Failed to update store');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStore = useCallback(async (storeId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await storeService.deleteStore(storeId);
      setStores(prev => prev.filter(store => store.id !== storeId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete store');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStore = useCallback(async (storeId: string): Promise<Store> => {
    setLoading(true);
    setError(null);
    
    try {
      const store = await storeService.getStore(storeId);
      return store;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch store');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch with provided filters
  useEffect(() => {
    if (initialFilters) {
      fetchStores(initialFilters);
    }
  }, [fetchStores, initialFilters]);

  return {
    stores,
    loading,
    error,
    pagination,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    getStore,
    clearError
  };
}; 