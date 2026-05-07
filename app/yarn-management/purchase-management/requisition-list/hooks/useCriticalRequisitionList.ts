"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  yarnInventoryService,
  requisitionMongoId,
  type YarnRequisitionResponse,
} from "@/app/yarn-management/dashboard/services/yarnInventoryService";

export interface CriticalRow {
  id: string;
  yarnName: string;
  minimumQty: number;
  availableQty: number;
  blockedQty: number;
  lastUpdated: string;
}

export type AlertStatusFilter = "all" | "belowMin" | "overblocked";

/**
 * Converts UI alert filter to yarn-requisitions API `alertStatus`.
 * @param filter - Toolbar alert dropdown value.
 */
function statusFilterToAlert(
  filter: AlertStatusFilter
): "has_alert" | "below_minimum" | "overbooked" {
  if (filter === "belowMin") return "below_minimum";
  if (filter === "overblocked") return "overbooked";
  return "has_alert";
}

/**
 * Maps table column to API sort field.
 * @param key - Column key from the critical list row model.
 */
function sortKeyToApi(
  key: keyof CriticalRow
):
  | "yarnName"
  | "created"
  | "lastUpdated"
  | "minQty"
  | "availableQty"
  | "blockedQty" {
  switch (key) {
    case "yarnName":
      return "yarnName";
    case "minimumQty":
      return "minQty";
    case "availableQty":
      return "availableQty";
    case "blockedQty":
      return "blockedQty";
    case "lastUpdated":
      return "lastUpdated";
    default:
      return "lastUpdated";
  }
}

/**
 * Maps API requisition document into table row shape.
 * @param req - Raw requisition from GET yarn-requisitions.
 */
export function mapRequisitionToCriticalRow(
  req: YarnRequisitionResponse
): CriticalRow {
  return {
    id: requisitionMongoId(req) ?? "",
    yarnName: req.yarnName,
    minimumQty: req.minQty,
    availableQty: req.availableQty,
    blockedQty: req.blockedQty,
    lastUpdated: req.lastUpdated || req.created,
  };
}

/** Maximum CSV rows pulled via sequential paging (matches backend limit max pages). */
export const CRITICAL_EXPORT_ROW_CAP = 5000;

const LIST_DATE_WINDOW_DAYS = 90;

/**
 * Server-backed critical yarn requisitions list (paginated, skip heavy recalculation).
 * @param hasPermission - When false, no network calls are made.
 */
export function useCriticalRequisitionList(hasPermission: boolean) {
  const [rows, setRows] = useState<CriticalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [statusFilter, setStatusFilter] =
    useState<AlertStatusFilter>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CriticalRow;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFilter.from, dateFilter.to, statusFilter, limit]);

  const dateIsoBounds = useMemo(() => {
    const lastUpdatedFrom = dateFilter.from
      ? new Date(`${dateFilter.from}T00:00:00`).toISOString()
      : undefined;
    const lastUpdatedTo = dateFilter.to
      ? new Date(`${dateFilter.to}T23:59:59.999`).toISOString()
      : undefined;
    return { lastUpdatedFrom, lastUpdatedTo };
  }, [dateFilter.from, dateFilter.to]);

  const effectiveSort = sortConfig ?? {
    key: "lastUpdated" as keyof CriticalRow,
    direction: "desc" as const,
  };

  const fetchPage = useCallback(async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - LIST_DATE_WINDOW_DAYS);

      const res = await yarnInventoryService.getYarnRequisitions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        poSent: false,
        alertStatus: statusFilterToAlert(statusFilter),
        page,
        limit,
        skipRecalculation: true,
        yarnName: debouncedSearch || undefined,
        lastUpdatedFrom: dateIsoBounds.lastUpdatedFrom,
        lastUpdatedTo: dateIsoBounds.lastUpdatedTo,
        sortBy: sortKeyToApi(effectiveSort.key),
        sortOrder: effectiveSort.direction,
      });

      setRows(res.results.map(mapRequisitionToCriticalRow));
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults ?? res.results.length);
    } catch (err) {
      console.error("Error fetching critical requisitions:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load requisition data";
      setError(message);
      setRows([]);
      toast.error("Failed to load requisition data");
    } finally {
      setLoading(false);
    }
  }, [
    hasPermission,
    page,
    limit,
    debouncedSearch,
    dateIsoBounds.lastUpdatedFrom,
    dateIsoBounds.lastUpdatedTo,
    statusFilter,
    effectiveSort.key,
    effectiveSort.direction,
  ]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  /**
   * Toggles sort for a column and resets to page 1.
   * @param key - Sortable column key.
   */
  const handleSort = useCallback((key: keyof CriticalRow) => {
    if (key === "id") return;
    setSortConfig((prev) => {
      if (prev?.key === key) {
        const nextDirection = prev.direction === "asc" ? "desc" : "asc";
        return { key, direction: nextDirection };
      }
      return { key, direction: "asc" };
    });
    setPage(1);
  }, []);

  /**
   * Builds CSV for all rows matching current filters (paginated merge, capped).
   */
  const exportMatchingCsv = useCallback(async (): Promise<CriticalRow[]> => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - LIST_DATE_WINDOW_DAYS);

    const merged: CriticalRow[] = [];
    let apiPage = 1;
    const pageSize = 200;

    while (merged.length < CRITICAL_EXPORT_ROW_CAP) {
      const res = await yarnInventoryService.getYarnRequisitions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        poSent: false,
        alertStatus: statusFilterToAlert(statusFilter),
        page: apiPage,
        limit: pageSize,
        skipRecalculation: true,
        yarnName: debouncedSearch || undefined,
        lastUpdatedFrom: dateIsoBounds.lastUpdatedFrom,
        lastUpdatedTo: dateIsoBounds.lastUpdatedTo,
        sortBy: sortKeyToApi(effectiveSort.key),
        sortOrder: effectiveSort.direction,
      });
      merged.push(...res.results.map(mapRequisitionToCriticalRow));
      if (
        res.results.length < pageSize ||
        apiPage >= (res.totalPages || 1)
      ) {
        break;
      }
      apiPage += 1;
    }

    return merged.slice(0, CRITICAL_EXPORT_ROW_CAP);
  }, [
    debouncedSearch,
    dateIsoBounds.lastUpdatedFrom,
    dateIsoBounds.lastUpdatedTo,
    statusFilter,
    effectiveSort.key,
    effectiveSort.direction,
  ]);

  /**
   * Marks requisition as sent to PO draft and refreshes the page slice.
   * @param id - Requisition Mongo id.
   */
  const handleMarkPoSent = useCallback(
    async (id: string, yarnName: string) => {
      try {
        await yarnInventoryService.updateRequisitionStatus(id, {
          poSent: true,
          draftForPo: true,
        });
        toast.success(
          `${yarnName} added to Draft PO queue. Create a PO from Purchase Management → Draft POs.`
        );
        await fetchPage();
      } catch (err) {
        console.error("Error updating requisition status:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to update requisition status"
        );
      }
    },
    [fetchPage]
  );

  return {
    rows,
    loading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    totalResults,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    sortConfig,
    handleSort,
    exportMatchingCsv,
    handleMarkPoSent,
  };
}
