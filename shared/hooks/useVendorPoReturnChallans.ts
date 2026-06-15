"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import vendorPoReturnChallanService, {
  VendorPoReturnChallan,
  VendorPoReturnChallanListParams,
} from '@/shared/services/vendorPoReturnChallanService';

export interface UseVendorPoReturnChallansState {
  results: VendorPoReturnChallan[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseVendorPoReturnChallansApi extends UseVendorPoReturnChallansState {
  filters: VendorPoReturnChallanListParams;
  setFilters: (next: VendorPoReturnChallanListParams) => void;
  setPage: (next: number) => void;
  refresh: () => Promise<void>;
}

/**
 * Stateful hook for vendor PO return challan history list.
 */
export function useVendorPoReturnChallans(
  initialFilters: VendorPoReturnChallanListParams = {},
  initialPage = 1,
  initialLimit = 20
): UseVendorPoReturnChallansApi {
  const [filters, setFiltersState] = useState<VendorPoReturnChallanListParams>(initialFilters);
  const [page, setPageState] = useState<number>(initialPage);
  const [limit] = useState<number>(initialLimit);
  const [state, setState] = useState<UseVendorPoReturnChallansState>({
    results: [],
    page: initialPage,
    limit: initialLimit,
    totalPages: 0,
    totalResults: 0,
    isLoading: true,
    error: null,
  });

  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await vendorPoReturnChallanService.listChallans({
        ...filters,
        page,
        limit,
        sortBy: 'createdAt:desc',
      });
      if (reqIdRef.current !== reqId) return;
      setState({
        results: res.results || [],
        page: res.page || page,
        limit: res.limit || limit,
        totalPages: res.totalPages || 0,
        totalResults: res.totalResults || 0,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      if (reqIdRef.current !== reqId) return;
      const message = err instanceof Error ? err.message : 'Failed to load return challans';
      setState((s) => ({ ...s, isLoading: false, error: message }));
    }
  }, [filters, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilters = useCallback((next: VendorPoReturnChallanListParams) => {
    setFiltersState(next);
    setPageState(1);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  return useMemo<UseVendorPoReturnChallansApi>(
    () => ({ ...state, filters, setFilters, setPage, refresh: load }),
    [state, filters, setFilters, setPage, load]
  );
}
