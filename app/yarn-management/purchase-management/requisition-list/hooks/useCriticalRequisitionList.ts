"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  yarnInventoryService,
  deriveRequisitionWorkflowStage,
  requisitionMongoId,
  requisitionYarnCatalogId,
  type RequisitionWorkflowStageUi,
  type YarnRequisitionResponse,
} from "@/app/yarn-management/dashboard/services/yarnInventoryService";

export interface CriticalRow {
  id: string;
  yarnName: string;
  /** Catalog id when API sends it — used to match supplier yarn lines. */
  yarnCatalogId?: string;
  minimumQty: number;
  availableQty: number;
  blockedQty: number;
  lastUpdated: string;
  workflowStage: RequisitionWorkflowStageUi;
  preferredSupplierId?: string;
  preferredSupplierDisplayName: string;
}

export type AlertStatusFilter = "all" | "belowMin" | "overblocked";

export type WorkflowStatusFilter =
  | "all"
  | RequisitionWorkflowStageUi;

/**
 * Converts UI alert filter to yarn-requisitions API `alertStatus`.
 * @param filter - Toolbar alert dropdown value.
 */
function statusFilterToAlert(
  filter: AlertStatusFilter
): "has_alert" | "below_minimum" | "overbooked" | undefined {
  if (filter === "belowMin") return "below_minimum";
  if (filter === "overblocked") return "overbooked";
  if (filter === "all") return "has_alert";
  return undefined;
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
 * Resolves manual supplier Mongo id whether API populated nested object.
 */
function normalizeSupplierId(row: YarnRequisitionResponse): string | undefined {
  const raw = row.preferredSupplierId as unknown;
  if (!raw || typeof raw === "string") {
    const s = (raw || "").trim();
    return s || undefined;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const id =
      normalizeSupplierIdScalar(o._id) ?? normalizeSupplierIdScalar(o.id);
    if (id) return id;
  }
  return undefined;
}

/** @param val - Possible ObjectId-ish value */
function normalizeSupplierIdScalar(val: unknown): string | undefined {
  if (val === null || val === undefined || val === "") {
    return undefined;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed || undefined;
  }
  if (typeof val === "number" && Number.isFinite(val)) {
    return String(val);
  }
  if (typeof val === "object" && val !== null) {
    const boxed = val as Record<string, unknown>;
    if (typeof boxed.$oid === "string") {
      return boxed.$oid.trim() || undefined;
    }
    if (boxed._id !== undefined || boxed.id !== undefined) {
      const nested =
        normalizeSupplierIdScalar(boxed._id) ?? normalizeSupplierIdScalar(boxed.id);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Maps API requisition document into table row shape.
 * @param req - Raw requisition from GET yarn-requisitions.
 */
export function mapRequisitionToCriticalRow(
  req: YarnRequisitionResponse
): CriticalRow {
  const wf = deriveRequisitionWorkflowStage(req);
  let supplierName = String(req.preferredSupplierName ?? "").trim();
  if (!supplierName && req.preferredSupplierId && typeof req.preferredSupplierId === "object") {
    const branded = req.preferredSupplierId as Record<string, unknown>;
    supplierName =
      typeof branded.brandName === "string" ? branded.brandName.trim() : "";
  }
  const catalogId = requisitionYarnCatalogId(req);
  return {
    id: requisitionMongoId(req) ?? "",
    yarnName: req.yarnName,
    yarnCatalogId: catalogId,
    minimumQty: req.minQty,
    availableQty: req.availableQty,
    blockedQty: req.blockedQty,
    lastUpdated: req.lastUpdated || req.created,
    workflowStage: wf,
    preferredSupplierId: normalizeSupplierId(req),
    preferredSupplierDisplayName: supplierName,
  };
}

/** Maximum CSV rows pulled via sequential paging (matches backend limit max pages). */
export const CRITICAL_EXPORT_ROW_CAP = 5000;

const LIST_DATE_WINDOW_DAYS = 400;

/** Human labels for procurement workflow badges. */
const WORKFLOW_LABELS: Record<RequisitionWorkflowStageUi, string> = {
  in_requisition: "In requisition",
  sent_to_draft: "Sent to draft",
  order_placed: "Order placed",
  dismissed: "Dismissed",
};

/**
 * @param stage - Server-derived workflow bucket
 */
export function workflowStageLabel(stage: RequisitionWorkflowStageUi): string {
  return WORKFLOW_LABELS[stage] ?? stage;
}

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
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("all");
  const [workflowFilter, setWorkflowFilter] =
    useState<WorkflowStatusFilter>("in_requisition");
  const [vendorSupplierIdFilter, setVendorSupplierIdFilter] = useState<string>("");
  const [vendorNameQuery, setVendorNameQuery] = useState("");
  const [debouncedVendorName, setDebouncedVendorName] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CriticalRow;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedVendorName(vendorNameQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [vendorNameQuery]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    dateFilter.from,
    dateFilter.to,
    statusFilter,
    workflowFilter,
    vendorSupplierIdFilter,
    debouncedVendorName,
    limit,
  ]);

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

      const wf =
        workflowFilter === "all" ? undefined : (workflowFilter as RequisitionWorkflowStageUi);

      const res = await yarnInventoryService.getYarnRequisitions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        alertStatus: statusFilterToAlert(statusFilter),
        page,
        limit,
        skipRecalculation: true,
        yarnName: debouncedSearch || undefined,
        preferredSupplierId: vendorSupplierIdFilter || undefined,
        supplierName:
          vendorSupplierIdFilter || !debouncedVendorName
            ? undefined
            : debouncedVendorName,
        lastUpdatedFrom: dateIsoBounds.lastUpdatedFrom,
        lastUpdatedTo: dateIsoBounds.lastUpdatedTo,
        sortBy: sortKeyToApi(effectiveSort.key),
        sortOrder: effectiveSort.direction,
        workflowStage: wf,
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
    debouncedVendorName,
    vendorSupplierIdFilter,
    dateIsoBounds.lastUpdatedFrom,
    dateIsoBounds.lastUpdatedTo,
    statusFilter,
    workflowFilter,
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
    if (key === "id" || key === "workflowStage" || key === "preferredSupplierDisplayName") {
      toast("Sorting by supplier or workflow is handled via filters.", { icon: "ℹ️" });
      return;
    }
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

    const wf =
      workflowFilter === "all" ? undefined : (workflowFilter as RequisitionWorkflowStageUi);

    const merged: CriticalRow[] = [];
    let apiPage = 1;
    const pageSize = 200;

    while (merged.length < CRITICAL_EXPORT_ROW_CAP) {
      const res = await yarnInventoryService.getYarnRequisitions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        alertStatus: statusFilterToAlert(statusFilter),
        page: apiPage,
        limit: pageSize,
        skipRecalculation: true,
        yarnName: debouncedSearch || undefined,
        preferredSupplierId: vendorSupplierIdFilter || undefined,
        supplierName:
          vendorSupplierIdFilter || !debouncedVendorName
            ? undefined
            : debouncedVendorName,
        lastUpdatedFrom: dateIsoBounds.lastUpdatedFrom,
        lastUpdatedTo: dateIsoBounds.lastUpdatedTo,
        sortBy: sortKeyToApi(effectiveSort.key),
        sortOrder: effectiveSort.direction,
        workflowStage: wf,
      });
      merged.push(...res.results.map(mapRequisitionToCriticalRow));
      if (res.results.length < pageSize || apiPage >= (res.totalPages || 1)) {
        break;
      }
      apiPage += 1;
    }

    return merged.slice(0, CRITICAL_EXPORT_ROW_CAP);
  }, [
    debouncedSearch,
    debouncedVendorName,
    vendorSupplierIdFilter,
    dateIsoBounds.lastUpdatedFrom,
    dateIsoBounds.lastUpdatedTo,
    statusFilter,
    workflowFilter,
    effectiveSort.key,
    effectiveSort.direction,
  ]);

  /**
   * Persists supplier choice against a requisition line.
   * @param rowId - YarnRequisition mongo id.
   */
  const updateRowVendor = useCallback(async (rowId: string, supplierId: string) => {
    try {
      const body =
        supplierId.trim() === ""
          ? { preferredSupplierId: null as string | null }
          : { preferredSupplierId: supplierId.trim() };
      await yarnInventoryService.updateRequisitionStatus(rowId, body);
      await fetchPage();
    } catch (err) {
      console.error("Error updating supplier on requisition:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update supplier on row"
      );
    }
  }, [fetchPage]);

  /**
   * Sends line to staging + optional merge onto supplier draft bucket.
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
          `${yarnName} added to supplier draft PO (new draft created if none existed). Open Draft POs to review.`
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

  /**
   * Soft-dismiss procurement row — removes noise when client says “delete”.
   * @param id - Requisition Mongo id.
   */
  const dismissRow = useCallback(
    async (id: string, yarnLabel: string) => {
      try {
        await yarnInventoryService.dismissYarnRequisition(id);
        toast.success(`${yarnLabel} dismissed from active lists`);
        await fetchPage();
      } catch (err) {
        console.error("Error dismissing requisition:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to dismiss requisition row"
        );
      }
    },
    [fetchPage]
  );

  const canStageRow = useCallback((row: CriticalRow) => row.workflowStage === "in_requisition", []);

  const canDismissRow = useCallback((row: CriticalRow) => {
    return row.workflowStage !== "dismissed" && row.workflowStage !== "order_placed";
  }, []);

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
    workflowFilter,
    setWorkflowFilter,
    vendorSupplierIdFilter,
    setVendorSupplierIdFilter,
    vendorNameQuery,
    setVendorNameQuery,
    sortConfig,
    handleSort,
    exportMatchingCsv,
    handleMarkPoSent,
    updateRowVendor,
    dismissRow,
    canStageRow,
    canDismissRow,
  };
}
