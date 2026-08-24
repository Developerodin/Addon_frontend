"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { DashboardFilters } from '../types';

interface UseDashboardFiltersReturn {
  filters: DashboardFilters;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  clearFilters: () => void;
  filterCount: number;
  hasFilters: boolean;
}

/**
 * Get default date range (last 30 days)
 */
const getDefaultDateRange = () => {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0]
  };
};

/**
 * Hook to manage dashboard filters synced with URL
 * Provides default 30-day date range if none specified
 */
export function useDashboardFilters(): UseDashboardFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Parse filters from URL with default date range
  const filters = useMemo<DashboardFilters>(() => {
    const defaultDates = getDefaultDateRange();
    const from = searchParams.get('from') || defaultDates.from;
    const to = searchParams.get('to') || defaultDates.to;
    const compare = searchParams.get('compare') as DashboardFilters['compare'] || undefined;
    
    const arrayParams = ['order', 'article', 'floor', 'machine', 'linkingType', 'brandingType', 'priority', 'shift'];
    const parsed: DashboardFilters = { from, to, compare };
    
    arrayParams.forEach(key => {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        (parsed as any)[key] = values;
      }
    });
    
    return parsed;
  }, [searchParams]);
  
  // Update URL with filters
  const updateUrl = useCallback((newFilters: DashboardFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.from) params.set('from', newFilters.from);
    if (newFilters.to) params.set('to', newFilters.to);
    if (newFilters.compare) params.set('compare', newFilters.compare);
    
    const arrayParams = ['order', 'article', 'floor', 'machine', 'linkingType', 'brandingType', 'priority', 'shift'];
    arrayParams.forEach(key => {
      const value = newFilters[key as keyof DashboardFilters];
      if (Array.isArray(value) && value.length > 0) {
        value.forEach(v => params.append(key, v));
      }
    });
    
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router, pathname]);
  
  // Set single filter
  const setFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    updateUrl(newFilters);
  }, [filters, updateUrl]);
  
  // Set multiple filters
  const setFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    const merged = { ...filters, ...newFilters };
    updateUrl(merged);
  }, [filters, updateUrl]);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);
  
  // Count active filters (excluding date range)
  const filterCount = useMemo(() => {
    let count = 0;
    const arrayParams = ['order', 'article', 'floor', 'machine', 'linkingType', 'brandingType', 'priority', 'shift'];
    arrayParams.forEach(key => {
      const value = filters[key as keyof DashboardFilters];
      if (Array.isArray(value) && value.length > 0) {
        count += value.length;
      }
    });
    return count;
  }, [filters]);
  
  const hasFilters = filterCount > 0;
  
  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    filterCount,
    hasFilters
  };
}

export default useDashboardFilters;
