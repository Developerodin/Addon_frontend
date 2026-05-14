"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  getMachineOrderAssignment,
  updateAssignmentItemsPriorities,
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

/**
 * Tailwind utility classes for read-only item status in the PO details drawer.
 */
function assignmentItemStatusBadgeClass(status: OrderStatusType | undefined): string {
  const s = status ?? OrderStatus.PENDING;
  switch (s) {
    case OrderStatus.IN_PROGRESS:
      return "bg-blue-100 text-blue-800";
    case OrderStatus.COMPLETED:
      return "bg-green-100 text-green-800";
    case OrderStatus.ON_HOLD:
      return "bg-amber-100 text-amber-800";
    case OrderStatus.CANCELLED:
      return "bg-red-100 text-red-800";
    case OrderStatus.PENDING:
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Prioritized queue item that is knitting "running" for this machine: first In Progress among prioritized non–on-hold items.
 */
function getRunningArticleLabel(a: MachineOrderAssignment): string {
  const items = (a.productionOrderItems ?? [])
    .filter((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD)
    .sort((x, y) => (x.priority ?? 999) - (y.priority ?? 999));
  const running = items.find((i) => i.status === OrderStatus.IN_PROGRESS);
  if (!running) return "";
  const order = running.orderNumber?.trim();
  const art = running.articleNumber?.trim();
  if (order && art) return `${order} · ${art}`;
  return art || order || "";
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
  /** Drag source item id — ref so drop handler always sees the latest value (state can lag). */
  const draggedItemIdRef = useRef<string | null>(null);
  /** Visual feedback for row being dragged (native DnD ghost + opacity). */
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [auditLogsTarget, setAuditLogsTarget] = useState<{ machineId: string; label: string } | null>(null);

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
        draggedItemIdRef.current = null;
        setDraggingItemId(null);
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
                    <th
                      className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 min-w-[140px] max-w-[220px]"
                      title="Order · article with status In Progress on this machine queue"
                    >
                      Running article
                    </th>
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
                    const runningArticle = getRunningArticleLabel(row);
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
                        <td
                          className="px-2 py-1.5 text-left border-r border-gray-300 text-gray-800 min-w-[140px] max-w-[220px]"
                          title={runningArticle || undefined}
                        >
                          {runningArticle ? (
                            <span className="block truncate text-[11px] font-medium" aria-label={`Running article: ${runningArticle}`}>
                              {runningArticle}
                            </span>
                          ) : (
                            <span className="text-gray-400" aria-label="No article in progress on this machine">
                              —
                            </span>
                          )}
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

      {/* PO details – right-side drawer; 50vw for half-screen width */}
      {poDetailsAssignment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPoDetailsAssignment(null)} aria-hidden />
          <div
            className="fixed inset-y-0 right-0 w-[50vw] shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/30 dark:border-slate-700/50"
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
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200" data-addon-po-queue="machine-drawer">
                          {allOrdered.map((item, idx) => {
                            const isPrioritized = prioritizedItems.includes(item);
                            const canDrag =
                              Boolean(item.itemId) &&
                              isPrioritized &&
                              !(item.status === OrderStatus.IN_PROGRESS && prioritizedItems.indexOf(item) === 0);
                            /** Drop is allowed on prioritized rows except the running (In Progress) slot — keeps running article first in queue. */
                            const isValidDropTarget =
                              prioritizedItems.includes(item) && item.status !== OrderStatus.IN_PROGRESS;
                            const rowKey = item.itemId ?? `${item.productionOrder}-${item.article}`;
                            return (
                              <tr
                                key={rowKey}
                                draggable={canDrag}
                                aria-grabbed={canDrag ? draggingItemId === item.itemId : undefined}
                                onDragStart={
                                  canDrag
                                    ? (e) => {
                                        draggedItemIdRef.current = item.itemId ?? null;
                                        setDraggingItemId(item.itemId ?? null);
                                        e.dataTransfer.effectAllowed = "move";
                                        if (item.itemId) {
                                          e.dataTransfer.setData("text/plain", item.itemId);
                                        }
                                      }
                                    : undefined
                                }
                                onDragEnd={() => {
                                  draggedItemIdRef.current = null;
                                  setDraggingItemId(null);
                                  document
                                    .querySelectorAll('tbody[data-addon-po-queue="machine-drawer"] tr')
                                    .forEach((el) => el.classList.remove("ring-1", "ring-indigo-400", "bg-indigo-50"));
                                }}
                                onDragOver={(e) => {
                                  if (!draggedItemIdRef.current || !isValidDropTarget) return;
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  e.currentTarget.classList.add("ring-1", "ring-indigo-400", "bg-indigo-50");
                                }}
                                onDragLeave={(e) => {
                                  const next = e.relatedTarget as Node | null;
                                  if (next && e.currentTarget.contains(next)) return;
                                  e.currentTarget.classList.remove("ring-1", "ring-indigo-400", "bg-indigo-50");
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove("ring-1", "ring-indigo-400", "bg-indigo-50");
                                  const dragId = draggedItemIdRef.current;
                                  if (!dragId || !isValidDropTarget) return;
                                  const fromPrioritizedIdx = prioritizedItems.findIndex((p) => p.itemId === dragId);
                                  const toPrioritizedIdx = prioritizedItems.indexOf(item);
                                  if (fromPrioritizedIdx >= 0 && toPrioritizedIdx >= 0 && fromPrioritizedIdx !== toPrioritizedIdx) {
                                    handleReorderItems(prioritizedItems, fromPrioritizedIdx, toPrioritizedIdx);
                                  }
                                }}
                                className={`hover:bg-gray-50 ${canDrag ? "cursor-grab active:cursor-grabbing select-none" : ""} ${
                                  draggingItemId === item.itemId ? "opacity-60" : ""
                                }`}
                              >
                                <td className="px-2 py-1.5 border-r border-gray-300 font-medium text-gray-600">
                                  {item.priority ?? idx + 1}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  <span className="font-medium text-gray-900 truncate block">
                                    {item.orderNumber ?? "—"} · {item.articleNumber ?? "—"}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium max-w-[110px] mx-auto ${assignmentItemStatusBadgeClass(item.status)}`}
                                    aria-label={`Assignment status: ${item.status ?? OrderStatus.PENDING}`}
                                  >
                                    {item.status ?? OrderStatus.PENDING}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  <span
                                    className="inline-block text-gray-600 tabular-nums"
                                    aria-label={`Yarn issue status: ${item.yarnIssueStatus ? String(item.yarnIssueStatus) : "not set"}`}
                                  >
                                    {item.yarnIssueStatus ? String(item.yarnIssueStatus) : "—"}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-300">
                                  <span
                                    className="inline-block text-gray-600 tabular-nums"
                                    aria-label={`Yarn return status: ${item.yarnReturnStatus ? String(item.yarnReturnStatus) : "not set"}`}
                                  >
                                    {item.yarnReturnStatus ? String(item.yarnReturnStatus) : "—"}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-center align-middle">
                                  {isPrioritized ? (
                                    <span
                                      className={`inline-flex items-center justify-center p-1 rounded ${
                                        canDrag ? "text-gray-500" : "text-gray-300"
                                      }`}
                                      title={canDrag ? "Drag row to change priority" : "Running article stays first — reorder items below"}
                                      aria-hidden
                                    >
                                      <i className="ri-draggable text-base" />
                                    </span>
                                  ) : null}
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
