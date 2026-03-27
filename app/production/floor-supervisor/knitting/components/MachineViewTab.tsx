"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  getMachineOrderAssignment,
  updateAssignmentItemsPriorities,
  updateAssignmentItemStatus,
  updateAssignmentItemYarnIssueStatus,
  updateAssignmentItemYarnReturnStatus,
  deleteAssignmentItem,
  OrderStatus,
  type MachineOrderAssignment,
  type OrderStatusType,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService } from "@/shared/services/machinesService";
import MachineAuditLogsDrawer from "./MachineAuditLogsDrawer";

function machineLabel(a: MachineOrderAssignment): string {
  const m = a.machine;
  if (typeof m === "object" && m) {
    return (m as { machineCode?: string; name?: string; id?: string }).machineCode
      ?? (m as { name?: string }).name
      ?? (m as { id?: string }).id ?? "-";
  }
  return typeof m === "string" ? m : "-";
}

function needleOptionsCount(a: MachineOrderAssignment): number {
  const m = a.machine;
  if (typeof m !== "object" || !m) return 0;
  const config = (m as { needleSizeConfig?: unknown[] }).needleSizeConfig;
  if (Array.isArray(config)) return config.filter((c: unknown) => (c as { needleSize?: unknown })?.needleSize).length;
  if ((m as { needleSize?: unknown }).needleSize) return 1;
  return 0;
}

/** Mongo machine id for audit-log API (works for real rows and placeholders). */
function getMachineIdFromRow(row: MachineOrderAssignment): string | null {
  const m = row.machine;
  if (typeof m === "object" && m) {
    const id = (m as { id?: string; _id?: string }).id ?? (m as { _id?: string })._id;
    return id ? String(id) : null;
  }
  if (typeof m === "string" && m.trim()) return m.trim();
  return null;
}

function getItemCounts(a: MachineOrderAssignment): { poCount: number; articleCount: number } {
  const items = a.productionOrderItems ?? [];
  const poIds = items.map((i) => {
    const po = i.productionOrder;
    if (typeof po === "string") return po;
    const obj = po as { id?: string; _id?: string };
    return obj?.id ?? obj?._id ?? "";
  }).filter(Boolean);
  return { poCount: new Set(poIds).size, articleCount: items.length };
}

export interface MachineViewTabProps {
  /** When user clicks pencil on a machine card, open the same data-entry modal (priority order editable, upcoming read-only). */
  onOpenEditModal?: (assignment: MachineOrderAssignment) => void;
  /** When this value changes, machine assignments list is refetched (e.g. after completing an article in parent). */
  refreshTrigger?: number;
  /** When false, hide settings icon in Actions (e.g. for "user" role). Default true. */
  canShowSettings?: boolean;
}

export default function MachineViewTab({ onOpenEditModal, refreshTrigger, canShowSettings = true }: MachineViewTabProps) {
  const [rows, setRows] = useState<MachineOrderAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [filterMachineSearch, setFilterMachineSearch] = useState("");
  const [filterNeedle, setFilterNeedle] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | "">("");

  const [machines, setMachines] = useState<{ id: string; machineCode?: string; name?: string }[]>([]);
  const [poDetailsAssignment, setPoDetailsAssignment] = useState<MachineOrderAssignment | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [updatingStatusItemId, setUpdatingStatusItemId] = useState<string | null>(null);
  const [updatingYarnItemId, setUpdatingYarnItemId] = useState<string | null>(null);
  const [updatingYarnReturnItemId, setUpdatingYarnReturnItemId] = useState<string | null>(null);
  const [yarnMenuOpenItemId, setYarnMenuOpenItemId] = useState<string | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState<{ itemId: string; top: number; left: number } | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [auditLogsTarget, setAuditLogsTarget] = useState<{ machineId: string; label: string } | null>(null);

  const ORDER_STATUS_OPTIONS: OrderStatusType[] = [
    OrderStatus.PENDING,
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
  ];

  /** First-priority item can be set to In Progress / Completed (including when yarn not yet done). Others: Pending, On Hold, Cancelled only. */
  const getStatusOptionsForItem = useCallback(
    (idx: number, currentStatus?: OrderStatusType, _yarnIssueStatus?: string | null): OrderStatusType[] => {
      const restricted = [OrderStatus.PENDING, OrderStatus.ON_HOLD, OrderStatus.CANCELLED];
      if (idx === 0) return ORDER_STATUS_OPTIONS; // First item: full options including Completed
      const current = currentStatus ?? OrderStatus.PENDING;
      if (current === OrderStatus.IN_PROGRESS || current === OrderStatus.COMPLETED) {
        return [current, ...restricted.filter((s) => s !== current)];
      }
      return restricted;
    },
    []
  );

  const handleItemStatusChange = useCallback(
    async (itemId: string, newStatus: OrderStatusType) => {
      if (!poDetailsAssignment?.id || !itemId) return;
      setUpdatingStatusItemId(itemId);
      try {
        const updated = await updateAssignmentItemStatus(poDetailsAssignment.id, itemId, newStatus);
        setPoDetailsAssignment(updated);
        setRows((prev) => prev.map((r) => (r.id === poDetailsAssignment.id ? updated : r)));
        toast.success("Item status updated");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update item status";
        alert(message);
      } finally {
        setUpdatingStatusItemId(null);
      }
    },
    [poDetailsAssignment]
  );

  const YARN_STATUS_OPTIONS = ["Not Started", "In Progress", "Completed"] as const;
  const handleYarnStatusChange = useCallback(
    async (itemId: string, newStatus: string) => {
      if (!poDetailsAssignment?.id || !itemId) return;
      setYarnMenuOpenItemId(null);
      setUpdatingYarnItemId(itemId);
      try {
        const updated = await updateAssignmentItemYarnIssueStatus(poDetailsAssignment.id, itemId, newStatus);
        setPoDetailsAssignment(updated);
        setRows((prev) => prev.map((r) => (r.id === poDetailsAssignment.id ? updated : r)));
        toast.success(`Yarn status set to ${newStatus}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update yarn issue status";
        alert(message);
      } finally {
        setUpdatingYarnItemId(null);
      }
    },
    [poDetailsAssignment]
  );

  const handleYarnReturnStatusChange = useCallback(
    async (itemId: string, newStatus: string) => {
      if (!poDetailsAssignment?.id || !itemId) return;
      setUpdatingYarnReturnItemId(itemId);
      try {
        const updated = await updateAssignmentItemYarnReturnStatus(poDetailsAssignment.id, itemId, newStatus);
        setPoDetailsAssignment(updated);
        setRows((prev) => prev.map((r) => (r.id === poDetailsAssignment.id ? updated : r)));
        toast.success(`Yarn return status set to ${newStatus}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update yarn return status";
        alert(message);
      } finally {
        setUpdatingYarnReturnItemId(null);
      }
    },
    [poDetailsAssignment]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!poDetailsAssignment?.id || !itemId) return;
      setSettingsMenuOpen(null);
      setDeletingItemId(itemId);
      try {
        const updated = await deleteAssignmentItem(poDetailsAssignment.id, itemId);
        setPoDetailsAssignment(updated);
        setRows((prev) => prev.map((r) => (r.id === poDetailsAssignment.id ? updated : r)));
        toast.success("Article removed from assignment");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to delete item";
        toast.error(message);
      } finally {
        setDeletingItemId(null);
      }
    },
    [poDetailsAssignment]
  );

  /** Reorder within the prioritized list only; on-hold and no-priority items keep trailing priorities. */
  const handleReorderItems = useCallback(
    async (prioritizedItems: typeof poDetailsAssignment.productionOrderItems, fromIndex: number, toIndex: number) => {
      if (!poDetailsAssignment || fromIndex === toIndex || !Array.isArray(prioritizedItems)) return;
      const all = poDetailsAssignment.productionOrderItems ?? [];
      const onHold = all.filter((i) => i.status === OrderStatus.ON_HOLD);
      const noPriority = all.filter((i) => i.priority == null && i.status !== OrderStatus.ON_HOLD);
      const reordered = [...prioritizedItems];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);
      const allOrdered = [...reordered, ...onHold, ...noPriority];
      const withIds = allOrdered.filter((i): i is typeof i & { itemId: string } => Boolean(i.itemId));
      if (withIds.length !== allOrdered.length) {
        toast.error("Some items lack id – refresh and try again");
        return;
      }
      const payload = withIds.map((item, i) => ({ itemId: item.itemId, priority: i + 1 }));
      setSavingOrder(true);
      try {
        const updated = await updateAssignmentItemsPriorities(poDetailsAssignment.id, payload);
        setPoDetailsAssignment(updated);
        setRows((prev) =>
          prev.map((r) => (r.id === poDetailsAssignment.id ? updated : r))
        );
        toast.success("Priority updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update order");
      } finally {
        setSavingOrder(false);
        setDraggedIndex(null);
      }
    },
    [poDetailsAssignment]
  );

  /** Create placeholder row for machine without assignment (keeps K001, K002... sequence) */
  const createPlaceholder = useCallback(
    (m: { id: string; machineCode?: string; name?: string }): MachineOrderAssignment => ({
      id: `placeholder-${m.id}`,
      machine: { id: m.id, machineCode: m.machineCode, name: m.name },
      activeNeedle: "",
      productionOrderItems: [],
      isActive: false,
    }),
    []
  );

  const fetchList = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Fetch machines (source of order: K001, K002, K003...)
      const machinesRes = await machinesService.getMachines(1, 500, "");
      const machinesList = (machinesRes.results ?? []).map((m: any) => ({
        id: m.id ?? m._id,
        machineCode: m.machineCode,
        name: m.name,
      }));
      machinesList.sort((a: { machineCode?: string }, b: { machineCode?: string }) =>
        (a.machineCode ?? "").localeCompare(b.machineCode ?? "", undefined, { numeric: true })
      );
      setMachines(machinesList);

      // 2. Fetch ALL assignments (limit 500 to get full set for merging)
      const data = await listMachineOrderAssignments({
        page: 1,
        limit: 500,
        isActive: filterActive === "" ? undefined : filterActive,
      });

      const assignmentByMachineId = new Map<string, MachineOrderAssignment>();
      for (const a of data.results ?? []) {
        const mid = typeof a.machine === "object" && a.machine
          ? (a.machine as { id?: string }).id ?? (a.machine as { _id?: string })._id
          : a.machine;
        if (mid) assignmentByMachineId.set(String(mid), a);
      }

      // 3. Build rows in machine sequence (K001, K002, K003...)
      const orderedRows: MachineOrderAssignment[] = [];
      for (const m of machinesList) {
        const assignment = assignmentByMachineId.get(m.id);
        if (assignment) {
          orderedRows.push(assignment);
        } else {
          if (filterNeedle) continue;
          if (filterActive === true) continue;
          orderedRows.push(createPlaceholder(m));
        }
      }

      setRows(orderedRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load machine assignments");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterActive, createPlaceholder]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshTrigger]);

  useEffect(() => {
    setPage(1);
  }, [filterMachineSearch, filterNeedle, filterActive]);

  /** Client-side filter by machine code/name and active needle search */
  const filteredRows = useMemo(() => {
    const machineQ = filterMachineSearch.trim().toLowerCase();
    const needleQ = filterNeedle.trim().toLowerCase();
    if (!machineQ && !needleQ) return rows;
    return rows.filter((r) => {
      if (machineQ && !machineLabel(r).toLowerCase().includes(machineQ)) return false;
      if (needleQ && !(r.activeNeedle ?? "").toLowerCase().includes(needleQ)) return false;
      return true;
    });
  }, [rows, filterMachineSearch, filterNeedle]);

  /** Client-side pagination: slice filtered rows for current page */
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page, limit]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / limit)), [filteredRows.length, limit]);

  return (
    <>
      <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300">
        <button
          type="button"
          onClick={fetchList}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
        >
          <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={filterMachineSearch}
            onChange={(e) => setFilterMachineSearch(e.target.value)}
            placeholder="Search machine code..."
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-600 focus:ring-1 focus:ring-purple-300 focus:border-purple-500"
          />
        </div>
        <div className="relative flex-1 min-w-[120px] max-w-[180px]">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={filterNeedle}
            onChange={(e) => setFilterNeedle(e.target.value)}
            placeholder="Search active needle..."
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-600 focus:ring-1 focus:ring-purple-300 focus:border-purple-500"
          />
        </div>
        <select
          value={filterActive === "" ? "" : filterActive ? "true" : "false"}
          onChange={(e) => setFilterActive(e.target.value === "" ? "" : e.target.value === "true")}
          className="bg-white border border-gray-300 text-[11px] font-medium rounded px-3 py-1.5"
        >
          <option value="">Status: All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Excel-like table: machines as rows */}
      <div className="border border-gray-300 rounded overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent mb-4" />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[300px] text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-2xl text-gray-300" />
            </div>
            <h3 className="text-sm font-bold text-gray-400 mb-1">
              {rows.length === 0 ? "No assignments" : "No matches"}
            </h3>
            <p className="text-xs text-gray-400">
              {rows.length === 0 ? "No machines with assignments." : "Try a different search for machine or needle."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Machine</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Active Needle</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Needle Options</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">POs</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Articles</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Status</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRows.map((row) => {
                    const { poCount, articleCount } = getItemCounts(row);
                    const needleCount = needleOptionsCount(row);
                    const isPlaceholder = row.id.startsWith("placeholder-");
                    const machineIdForLogs = getMachineIdFromRow(row);
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-gray-50 transition-colors ${machineIdForLogs ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (!machineIdForLogs) return;
                          setAuditLogsTarget({ machineId: machineIdForLogs, label: machineLabel(row) });
                        }}
                      >
                        <td className="px-2 py-1.5 text-center border-r border-gray-300 font-medium text-gray-900">
                          {machineLabel(row)}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">
                          {row.activeNeedle || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">
                          {needleCount}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">
                          {poCount}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">
                          {articleCount}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-300">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            row.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                          }`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {!isPlaceholder && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenEditModal?.(row)}
                                  className="flex items-center justify-center rounded bg-purple-100 text-purple-600 hover:bg-purple-200 w-7 h-7"
                                  title="Edit"
                                >
                                  <i className="ri-pencil-line text-sm" />
                                </button>
                                {canShowSettings && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setPoDetailsAssignment(row);
                                      try {
                                        const full = await getMachineOrderAssignment(row.id);
                                        setPoDetailsAssignment(full);
                                        setRows((prev) => prev.map((r) => (r.id === row.id ? full : r)));
                                      } catch {}
                                    }}
                                    className="flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 w-7 h-7"
                                    title="PO details"
                                  >
                                    <i className="ri-settings-3-line text-sm" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50">
              <div className="text-[11px] font-medium text-[#495057]">
                Showing {filteredRows.length === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, filteredRows.length)} of {filteredRows.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded border border-gray-200"
                >
                  Prev
                </button>
                <span className="text-[11px] font-medium text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded border border-gray-200"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* PO details – right-side drawer, ~49% width (30% less than before) */}
      {poDetailsAssignment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPoDetailsAssignment(null)} aria-hidden />
          <div
            className="fixed inset-y-0 right-0 w-full max-w-[520px] shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/30 dark:border-slate-700/50"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.15) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="p-4 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">PO details</h1>
                <button
                  type="button"
                  onClick={() => setPoDetailsAssignment(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              {(() => {
                const all = poDetailsAssignment.productionOrderItems ?? [];
                const hasPrioritized = all.some((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD);
                return hasPrioritized ? (
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Drag rows to change priority</p>
                ) : null;
              })()}
            </div>
            <div className="flex-1 overflow-y-auto p-4 relative">
              {savingOrder && (
                <div className="mb-3 text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent" />
                  Saving order…
                </div>
              )}
              {poDetailsAssignment.productionOrderItems?.length ? (
                (() => {
                  const all = [...(poDetailsAssignment.productionOrderItems ?? [])];
                  const prioritizedItems = all
                    .filter((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD)
                    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
                  const onHoldItems = all.filter((i) => i.status === OrderStatus.ON_HOLD);
                  const noPriorityItems = all.filter((i) => i.priority == null && i.status !== OrderStatus.ON_HOLD);
                  const allOrdered = [...prioritizedItems, ...onHoldItems, ...noPriorityItems];

                  return (
                    <div className="border border-gray-300 rounded overflow-visible">
                      <table className="min-w-full text-[11px] border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-300">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 w-8">#</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300">Order · Article</th>
                            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300">Status</th>
                            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300">Yarn</th>
                            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300">Yarn Return</th>
                            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-6" title="Drag to reorder" />
                            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-8" />
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allOrdered.map((item, idx) => {
                            const isPrioritized = prioritizedItems.includes(item);
                            const isFirst = idx === 0 && isPrioritized;
                            const canDrag = isPrioritized && !(item.status === OrderStatus.IN_PROGRESS && prioritizedItems.indexOf(item) === 0);
                            const statusOptionIdx = isPrioritized ? prioritizedItems.indexOf(item) : 1;
                            const showAskForYarn = isPrioritized && prioritizedItems.indexOf(item) <= 1;
                            return (
                              <tr
                                key={item.itemId ?? `${item.productionOrder}-${item.article}`}
                                draggable={canDrag}
                                onDragStart={() => canDrag && setDraggedIndex(idx)}
                                onDragEnd={() => setDraggedIndex(null)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (!canDrag) return;
                                  e.currentTarget.classList.add("ring-1", "ring-indigo-400", "bg-indigo-50");
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove("ring-1", "ring-indigo-400", "bg-indigo-50");
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove("ring-1", "ring-indigo-400", "bg-indigo-50");
                                  if (draggedIndex === null || !prioritizedItems.includes(item) || item.status === OrderStatus.IN_PROGRESS) return;
                                  const fromPrioritizedIdx = prioritizedItems.findIndex((p) => allOrdered.indexOf(p) === draggedIndex);
                                  const toPrioritizedIdx = prioritizedItems.indexOf(item);
                                  if (fromPrioritizedIdx >= 0 && toPrioritizedIdx >= 0 && fromPrioritizedIdx !== toPrioritizedIdx) {
                                    handleReorderItems(prioritizedItems, fromPrioritizedIdx, toPrioritizedIdx);
                                  }
                                }}
                                className={`${canDrag ? "cursor-grab active:cursor-grabbing" : ""} hover:bg-gray-50`}
                              >
                                <td className="px-2 py-1.5 border-r border-gray-300 font-medium text-gray-600">
                                  {item.priority ?? idx + 1}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  <span className="font-medium text-gray-900 truncate block">
                                    {item.orderNumber ?? "—"} · {item.articleNumber ?? "—"}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  <select
                                    value={item.status ?? OrderStatus.PENDING}
                                    onChange={(e) => {
                                      const val = e.target.value as OrderStatusType;
                                      if (item.itemId) handleItemStatusChange(item.itemId, val);
                                    }}
                                    disabled={!item.itemId || updatingStatusItemId === item.itemId}
                                    className="bg-white border border-gray-300 px-1.5 py-0.5 rounded text-[10px] w-full max-w-[100px]"
                                  >
                                    {getStatusOptionsForItem(statusOptionIdx, item.status, item.yarnIssueStatus).map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  {showAskForYarn ? (
                                    <select
                                      value={item.yarnIssueStatus ? String(item.yarnIssueStatus) : ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (item.itemId && val) handleYarnStatusChange(item.itemId, val);
                                      }}
                                      disabled={!item.itemId || updatingYarnItemId === item.itemId}
                                      className="bg-white border border-gray-300 px-1.5 py-0.5 rounded text-[10px] w-full max-w-[100px]"
                                    >
                                      <option value="">—</option>
                                      {YARN_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-gray-600">{item.yarnIssueStatus ? String(item.yarnIssueStatus) : "—"}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  {item.itemId ? (
                                    <select
                                      value={item.yarnReturnStatus ? String(item.yarnReturnStatus) : ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) handleYarnReturnStatusChange(item.itemId!, val);
                                      }}
                                      disabled={updatingYarnReturnItemId === item.itemId}
                                      className="bg-white border border-gray-300 px-1.5 py-0.5 rounded text-[10px] w-full min-w-[110px]"
                                    >
                                      <option value="">—</option>
                                      <option value="Pending">Pending</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Completed</option>
                                    </select>
                                  ) : (
                                    <span className="text-gray-600">{item.yarnReturnStatus ? String(item.yarnReturnStatus) : "—"}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  {canDrag && <i className="ri-draggable text-gray-400 text-sm" aria-hidden />}
                                </td>
                                <td className="px-2 py-1.5 text-center relative">
                                  {canShowSettings && (() => {
                                    const effectiveItemId = item.itemId ?? (item as { id?: string; _id?: string }).id ?? (item as { id?: string; _id?: string })._id;
                                    if (!effectiveItemId) return null;
                                    const isOpen = settingsMenuOpen?.itemId === effectiveItemId;
                                    return (
                                      <div className="relative inline-block">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isOpen) {
                                              setSettingsMenuOpen(null);
                                            } else {
                                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                              setSettingsMenuOpen({
                                                itemId: effectiveItemId,
                                                top: rect.bottom + 4,
                                                left: Math.min(rect.right - 100, window.innerWidth - 120),
                                              });
                                            }
                                          }}
                                          className="flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 w-6 h-6"
                                          title="Article options"
                                          disabled={deletingItemId === effectiveItemId}
                                        >
                                          <i className="ri-settings-3-line text-xs" />
                                        </button>
                                        {isOpen && settingsMenuOpen && typeof document !== "undefined" && createPortal(
                                          <>
                                            <div
                                              className="fixed inset-0 z-[60]"
                                              onClick={() => setSettingsMenuOpen(null)}
                                              aria-hidden
                                            />
                                            <div
                                              className="fixed z-[70] min-w-[100px] bg-white border border-gray-300 rounded shadow-lg py-1"
                                              style={{ top: settingsMenuOpen.top, left: settingsMenuOpen.left }}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (window.confirm(`Remove ${item.articleNumber ?? "article"} from this machine assignment?`)) {
                                                    handleDeleteItem(effectiveItemId);
                                                  }
                                                }}
                                                disabled={deletingItemId === effectiveItemId}
                                                className="w-full px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                              >
                                                {deletingItemId === effectiveItemId ? (
                                                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-red-500 border-t-transparent" />
                                                ) : (
                                                  <i className="ri-delete-bin-line text-sm" />
                                                )}
                                                Delete
                                              </button>
                                            </div>
                                          </>,
                                          document.body
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No PO items.</p>
              )}
            </div>
          </div>
        </>
      )}

      <MachineAuditLogsDrawer
        key={auditLogsTarget?.machineId ?? "closed"}
        open={auditLogsTarget !== null}
        onClose={() => setAuditLogsTarget(null)}
        machineId={auditLogsTarget?.machineId ?? null}
        machineLabel={auditLogsTarget?.label}
      />
    </>
  );
}
