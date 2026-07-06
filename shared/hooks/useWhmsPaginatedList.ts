"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface UseWhmsPaginatedListOptions<T, P extends Record<string, unknown>> {
  /** Fetch function returning paginated results. */
  fetchFn: (params: P & { page: number; limit: number; q?: string }) => Promise<PaginatedResponse<T>>;
  /** Extra params merged into each fetch (flowStatusIn, status, etc.). */
  baseParams?: Omit<P, "page" | "limit" | "q">;
  /** Debounce ms for search (default 400). */
  debounceMs?: number;
  /** Auto-fetch on mount (default true). */
  enabled?: boolean;
}

/**
 * Paginated list state for WHMS stage pages with debounced search.
 * Uses refs for fetchFn/baseParams so inline lambdas do not retrigger infinite fetches.
 */
export function useWhmsPaginatedList<T, P extends Record<string, unknown> = Record<string, unknown>>({
  fetchFn,
  baseParams = {} as Omit<P, "page" | "limit" | "q">,
  debounceMs = 400,
  enabled = true,
}: UseWhmsPaginatedListOptions<T, P>) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFnRef = useRef(fetchFn);
  const baseParamsRef = useRef(baseParams);
  fetchFnRef.current = fetchFn;
  baseParamsRef.current = baseParams;

  /** Stable key so tab/filter changes re-fetch without unstable object refs. */
  const baseParamsKey = JSON.stringify(baseParams);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [q, debounceMs]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...baseParamsRef.current,
        page,
        limit,
        ...(debouncedQ ? { q: debouncedQ } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      } as P & { page: number; limit: number; q?: string };
      const res = await fetchFnRef.current(params);
      setResults(res.results || []);
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setResults([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, page, limit, debouncedQ, dateFrom, dateTo, baseParamsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLimitChange = (next: number) => {
    setLimit(next);
    setPage(1);
  };

  return {
    page,
    setPage,
    limit,
    setLimit: handleLimitChange,
    q,
    setQ,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    results,
    totalPages,
    totalResults,
    loading,
    error,
    refresh: load,
  };
}
