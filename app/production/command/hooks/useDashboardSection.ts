"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardFilters, SectionState, ApiResponse } from '../types';

interface UseDashboardSectionOptions {
  enabled?: boolean;
  staleTime?: number;
}

interface UseDashboardSectionReturn<T> extends SectionState<T> {
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Hook to fetch and manage dashboard section data
 * Stable implementation that avoids infinite loops
 */
export function useDashboardSection<T>(
  fetcher: (filters: DashboardFilters, signal: AbortSignal) => Promise<ApiResponse<T>>,
  filters: DashboardFilters,
  options: UseDashboardSectionOptions = {}
): UseDashboardSectionReturn<T> {
  const { enabled = true, staleTime = 60000 } = options;
  
  const [state, setState] = useState<SectionState<T>>({
    status: 'idle',
    data: null,
    error: null,
    lastFetched: null
  });
  
  const [isFetching, setIsFetching] = useState(false);
  
  // Use refs to avoid dependency issues
  const fetcherRef = useRef(fetcher);
  const filtersRef = useRef(filters);
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  
  // Update refs when values change
  fetcherRef.current = fetcher;
  filtersRef.current = filters;
  
  // Stable fetch function using refs
  const doFetch = useCallback(async () => {
    if (!mountedRef.current) return;
    
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    
    setIsFetching(true);
    setState(prev => ({
      ...prev,
      status: prev.data ? 'success' : 'loading',
      error: null
    }));
    
    try {
      const abortController = new AbortController();
      const response = await fetcherRef.current(filtersRef.current, abortController.signal);
      
      // Only update if this is still the latest request
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setState({
          status: 'success',
          data: response.data,
          error: null,
          lastFetched: Date.now()
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error.message || 'An error occurred'
        }));
      }
    } finally {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setIsFetching(false);
      }
    }
  }, []); // No dependencies - uses refs
  
  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Initial fetch when enabled
  useEffect(() => {
    if (enabled) {
      doFetch();
    }
  }, [enabled]); // Only depends on enabled, not doFetch
  
  // Refetch when filters change (using JSON comparison)
  const filtersKey = JSON.stringify(filters);
  const prevFiltersKeyRef = useRef(filtersKey);
  
  useEffect(() => {
    // Skip initial render
    if (prevFiltersKeyRef.current === filtersKey) return;
    
    prevFiltersKeyRef.current = filtersKey;
    
    if (enabled) {
      doFetch();
    }
  }, [filtersKey, enabled]); // Depends on filtersKey string, not filters object
  
  return {
    ...state,
    refetch: doFetch,
    isFetching
  };
}

export default useDashboardSection;
