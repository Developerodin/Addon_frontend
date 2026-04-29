"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import yarnGrnService, {
  YarnGrn,
  YarnGrnListParams,
} from '@/shared/services/yarnGrnService';

export interface UseGrnsState {
  results: YarnGrn[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseGrnsApi extends UseGrnsState {
  filters: YarnGrnListParams;
  setFilters: (next: YarnGrnListParams) => void;
  setPage: (next: number) => void;
  refresh: () => Promise<void>;
}

/**
 * Stateful hook backing the GRN history page. Owns filter state, pagination,
 * loading/error flags, and a refresh trigger. Re-fetches on any filter or
 * page change. The most recent in-flight request wins to avoid stale renders.
 *
 * @param initialFilters - applied on first mount
 * @param initialPage - 1-indexed
 * @param initialLimit - rows per page
 */
export function useGrns(
  initialFilters: YarnGrnListParams = {},
  initialPage = 1,
  initialLimit = 20
): UseGrnsApi {
  const [filters, setFiltersState] = useState<YarnGrnListParams>(initialFilters);
  const [page, setPageState] = useState<number>(initialPage);
  const [limit] = useState<number>(initialLimit);
  const [state, setState] = useState<UseGrnsState>({
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
      const res = await yarnGrnService.listGrns({
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
      const message = err instanceof Error ? err.message : 'Failed to load GRNs';
      setState((s) => ({ ...s, isLoading: false, error: message }));
    }
  }, [filters, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilters = useCallback((next: YarnGrnListParams) => {
    setFiltersState(next);
    setPageState(1);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const api = useMemo<UseGrnsApi>(
    () => ({ ...state, filters, setFilters, setPage, refresh: load }),
    [state, filters, setFilters, setPage, load]
  );

  return api;
}
