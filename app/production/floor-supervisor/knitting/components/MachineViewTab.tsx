"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  getMachineOrderAssignment,
  updateAssignmentItemsPriorities,
  updateAssignmentItemStatus,
  updateAssignmentItemYarnIssueStatus,
  OrderStatus,
  type MachineOrderAssignment,
  type OrderStatusType,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService } from "@/shared/services/machinesService";
import AssignmentsCards from "@/app/catalog/needle-configuration/components/AssignmentsCards";

export interface MachineViewTabProps {
  /** When user clicks pencil on a machine card, open the same data-entry modal (priority order editable, upcoming read-only). */
  onOpenEditModal?: (assignment: MachineOrderAssignment) => void;
}

export default function MachineViewTab({ onOpenEditModal }: MachineViewTabProps) {
  const [rows, setRows] = useState<MachineOrderAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterNeedle, setFilterNeedle] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | "">("");

  const [machines, setMachines] = useState<{ id: string; machineCode?: string; name?: string }[]>([]);
  const [poDetailsAssignment, setPoDetailsAssignment] = useState<MachineOrderAssignment | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [zoomedCardIndex, setZoomedCardIndex] = useState<number | null>(null);
  const [updatingStatusItemId, setUpdatingStatusItemId] = useState<string | null>(null);
  const [updatingYarnItemId, setUpdatingYarnItemId] = useState<string | null>(null);
  const [yarnMenuOpenItemId, setYarnMenuOpenItemId] = useState<string | null>(null);
  const [machineDrawerOpen, setMachineDrawerOpen] = useState(false);
  const [machineSearch, setMachineSearch] = useState("");

  const ORDER_STATUS_OPTIONS: OrderStatusType[] = [
    OrderStatus.PENDING,
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
  ];

  /** Only first-priority item can be set to In Progress / Completed; others get Pending, On Hold, Cancelled only. */
  const getStatusOptionsForItem = useCallback((idx: number, currentStatus?: OrderStatusType): OrderStatusType[] => {
    if (idx === 0) return ORDER_STATUS_OPTIONS;
    const restricted = [OrderStatus.PENDING, OrderStatus.ON_HOLD, OrderStatus.CANCELLED];
    const current = currentStatus ?? OrderStatus.PENDING;
    if (current === OrderStatus.IN_PROGRESS || current === OrderStatus.COMPLETED) {
      return [current, ...restricted.filter((s) => s !== current)];
    }
    return restricted;
  }, []);

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

  const handleAskForYarn = useCallback(
    async (itemId: string) => {
      if (!poDetailsAssignment?.id || !itemId) return;
      setYarnMenuOpenItemId(null);
      setUpdatingYarnItemId(itemId);
      try {
        const updated = await updateAssignmentItemYarnIssueStatus(poDetailsAssignment.id, itemId, "In Progress");
        setPoDetailsAssignment(updated);
        setRows((prev) => prev.map((r) => (r.id === poDetailsAssignment.id ? updated : r)));
        toast.success("Yarn issue status set to In Progress");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update yarn issue status";
        alert(message);
      } finally {
        setUpdatingYarnItemId(null);
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

  const fetchList = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listMachineOrderAssignments({
        page,
        limit,
        machine: filterMachine || undefined,
        activeNeedle: filterNeedle || undefined,
        isActive: filterActive === "" ? undefined : filterActive,
      });
      setRows(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load machine assignments");
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, filterMachine, filterNeedle, filterActive]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [filterMachine, filterNeedle, filterActive]);

  useEffect(() => {
    machinesService.getMachines(1, 500, "").then((res) => {
      const list = res.results ?? [];
      setMachines(
        list.map((m: any) => ({
          id: m.id ?? m._id,
          machineCode: m.machineCode,
          name: m.name,
        }))
      );
    }).catch(() => setMachines([]));
  }, []);

  const filteredMachinesForDrawer = useMemo(() => {
    const q = machineSearch.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter(
      (m) =>
        (m.machineCode ?? "").toLowerCase().includes(q) ||
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.id ?? "").toLowerCase().includes(q)
    );
  }, [machines, machineSearch]);

  const selectedMachineLabel =
    filterMachine === ""
      ? "All machines"
      : machines.find((m) => m.id === filterMachine)?.machineCode ??
        machines.find((m) => m.id === filterMachine)?.name ??
        "Selected";

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
        <button
          type="button"
          onClick={() => setMachineDrawerOpen(true)}
          className="flex items-center justify-between gap-2 bg-white border border-gray-300 text-[11px] font-medium rounded px-3 py-1.5 min-w-[160px] hover:bg-gray-50 text-left"
        >
          <span className="truncate">{selectedMachineLabel}</span>
          <i className="ri-arrow-down-s-line text-gray-500 shrink-0" />
        </button>
        <input
          type="text"
          value={filterNeedle}
          onChange={(e) => setFilterNeedle(e.target.value)}
          placeholder="Active needle"
          className="bg-white border border-gray-300 pl-3 pr-3 py-1.5 text-[11px] rounded w-32 placeholder:text-gray-400"
        />
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
          <option value={10}>Show 10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Machine select — side drawer with search */}
      {machineDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 z-0 bg-black/50"
            onClick={() => {
              setMachineDrawerOpen(false);
              setMachineSearch("");
            }}
            aria-hidden
          />
          <div
            className="relative z-10 ml-auto w-full max-w-md h-full bg-white shadow-xl flex flex-col border-l border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-300 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-gray-800">Select machine</h3>
              <button
                type="button"
                onClick={() => {
                  setMachineDrawerOpen(false);
                  setMachineSearch("");
                }}
                className="w-7 h-7 flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-300 rounded hover:bg-gray-100"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
            <div className="p-3 border-b border-gray-300 shrink-0">
              <input
                type="text"
                className="bg-white border border-gray-300 text-[11px] rounded px-3 py-1.5 w-full focus:ring-0 focus:border-purple-500 focus:ring-1 focus:ring-purple-300"
                placeholder="Search by machine name or code..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ul className="p-2 space-y-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMachine("");
                      setMachineDrawerOpen(false);
                      setMachineSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-[11px] font-medium transition-colors ${
                      filterMachine === ""
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-gray-50 text-gray-700 border border-transparent hover:bg-gray-100"
                    }`}
                  >
                    All machines
                  </button>
                </li>
                {filteredMachinesForDrawer.map((m) => {
                  const label = m.machineCode ?? m.name ?? m.id;
                  const isSelected = filterMachine === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMachine(m.id);
                          setMachineDrawerOpen(false);
                          setMachineSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-[11px] font-medium transition-colors ${
                          isSelected
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-gray-50 text-gray-700 border border-transparent hover:bg-gray-100"
                        }`}
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {filteredMachinesForDrawer.length === 0 && machineSearch.trim() && (
                <p className="p-4 text-[11px] text-gray-500 text-center">No machines match &quot;{machineSearch}&quot;</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AssignmentsCards
        rows={rows}
        page={page}
        limit={limit}
        totalResults={totalResults}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        readOnly
        columnsPerRow={5}
        cardClickable={false}
        onPencilClick={onOpenEditModal}
        onCardClick={async (a) => {
          setPoDetailsAssignment(a);
          try {
            const full = await getMachineOrderAssignment(a.id);
            setPoDetailsAssignment(full);
            setRows((prev) => prev.map((r) => (r.id === a.id ? full : r)));
          } catch {
            // keep list assignment if refetch fails
          }
        }}
      />

      {/* PO details – right-side drawer, ~49% width (30% less than before) */}
      {poDetailsAssignment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPoDetailsAssignment(null)} aria-hidden />
          <div
            className="fixed inset-y-0 right-0 w-full max-w-[380px] shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/30 dark:border-slate-700/50"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.15) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="p-6 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">PO details</h1>
                <button
                  type="button"
                  onClick={() => { setPoDetailsAssignment(null); setZoomedCardIndex(null); }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              {(() => {
                const all = poDetailsAssignment.productionOrderItems ?? [];
                const hasPrioritized = all.some((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD);
                return hasPrioritized ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Drag cards to change priority</p>
                ) : null;
              })()}
            </div>
            <div className="flex-1 overflow-y-auto p-6 relative">
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

                  const cardStyle = {
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                  } as const;
                  const onHoldCardStyle = {
                    background: "linear-gradient(135deg, rgba(100, 116, 139, 0.9), rgba(71, 85, 105, 0.9))",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                  } as const;

                  const renderCard = (
                    item: (typeof all)[0],
                    opts: {
                      canDrag: boolean;
                      displayPriority: number;
                      showAskForYarn: boolean;
                      statusOptionIdx: number;
                      showConnector: boolean;
                      style: React.CSSProperties;
                      onDragStart?: () => void;
                      onDragEnd?: () => void;
                      onDragOver?: (e: React.DragEvent) => void;
                      onDragLeave?: (e: React.DragEvent) => void;
                      onDrop?: (e: React.DragEvent) => void;
                    }
                  ) => (
                    <div key={item.itemId ?? `${item.productionOrder}-${item.article}`} className="relative">
                      {opts.showConnector && (
                        <div
                          className="absolute left-9 top-10 bottom-0 w-px border-l-2 border-dashed border-indigo-400/40 z-0"
                          style={{ bottom: "-24px" }}
                          aria-hidden
                        />
                      )}
                      <div
                        draggable={opts.canDrag}
                        onDragStart={opts.onDragStart}
                        onDragEnd={opts.onDragEnd}
                        onDragOver={opts.onDragOver}
                        onDragLeave={opts.onDragLeave}
                        onDrop={opts.onDrop}
                        className={`relative z-10 rounded-[30px] p-3 text-white transition-all duration-200 active:scale-[0.98] ${
                          opts.canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                        } ring-0`}
                        style={opts.style}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-7 h-7 shrink-0 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                              {opts.displayPriority}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-nowrap">
                                <div className="flex items-center gap-1 shrink-0">
                                  <i className="ri-flag-line text-white/80 text-[10px] shrink-0" title="Order status" />
                                  <span className="text-[8px] text-white/70 uppercase tracking-wider">Order</span>
                                  <select
                                    value={item.status ?? OrderStatus.PENDING}
                                    onChange={(e) => {
                                      const val = e.target.value as OrderStatusType;
                                      if (item.itemId) handleItemStatusChange(item.itemId, val);
                                    }}
                                    disabled={!item.itemId || updatingStatusItemId === item.itemId}
                                    className="bg-white/20 px-1.5 py-0.5 rounded-md text-[9px] font-medium text-white focus:ring-1 focus:ring-white/50 disabled:opacity-60 [&>option]:bg-gray-800 [&>option]:text-white max-w-[82px]"
                                  >
                                    {getStatusOptionsForItem(opts.statusOptionIdx, item.status).map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <i className="ri-yarn-line text-white/80 text-[10px] shrink-0" title="Yarn status" />
                                  <span className="text-[8px] text-white/70 uppercase tracking-wider">Yarn</span>
                                  {opts.showAskForYarn ? (
                                    <select
                                      value={item.yarnIssueStatus ? String(item.yarnIssueStatus) : ""}
                                      onChange={(e) => {
                                        if (e.target.value === "ask" && item.itemId) handleAskForYarn(item.itemId);
                                      }}
                                      disabled={!item.itemId || updatingYarnItemId === item.itemId}
                                      className="bg-white/20 px-1.5 py-0.5 rounded-md text-[9px] font-medium text-white focus:ring-1 focus:ring-white/50 disabled:opacity-60 [&>option]:bg-gray-800 [&>option]:text-white max-w-[82px]"
                                    >
                                      <option value={item.yarnIssueStatus ? String(item.yarnIssueStatus) : ""}>{item.yarnIssueStatus ? String(item.yarnIssueStatus) : "—"}</option>
                                      <option value="ask">Ask for yarn</option>
                                    </select>
                                  ) : (
                                    <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[9px] font-medium">
                                      {item.yarnIssueStatus ? String(item.yarnIssueStatus) : "—"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <h3 className="font-bold text-[10px] tracking-wide text-white truncate">
                                {item.orderNumber ?? item.productionOrder ?? "—"} · {item.articleNumber ?? item.article ?? "—"}
                              </h3>
                            </div>
                          </div>
                          {opts.canDrag && (
                            <i className="ri-draggable text-white/50 text-sm shrink-0 cursor-grab active:cursor-grabbing" aria-hidden />
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div className="space-y-8">
                      {prioritizedItems.length > 0 && (
                        <div className="space-y-6">
                          {prioritizedItems.map((item, idx) => {
                            const isFirst = idx === 0;
                            const canDrag = !(isFirst && item.status === OrderStatus.IN_PROGRESS);
                            return renderCard(item, {
                              canDrag,
                              displayPriority: item.priority ?? idx + 1,
                              showAskForYarn: idx <= 1,
                              statusOptionIdx: idx,
                              showConnector: idx < prioritizedItems.length - 1,
                              style: cardStyle,
                              onDragStart: () => canDrag && setDraggedIndex(idx),
                              onDragEnd: () => setDraggedIndex(null),
                              onDragOver: (e) => {
                                e.preventDefault();
                                if (idx === 0 && item.status === OrderStatus.IN_PROGRESS) return;
                                e.currentTarget.classList.add("ring-2", "ring-indigo-400");
                              },
                              onDragLeave: (e) => e.currentTarget.classList.remove("ring-2", "ring-indigo-400"),
                              onDrop: (e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove("ring-2", "ring-indigo-400");
                                if (draggedIndex === null) return;
                                if (idx === 0 && item.status === OrderStatus.IN_PROGRESS) return;
                                handleReorderItems(prioritizedItems, draggedIndex, idx);
                              },
                            });
                          })}
                        </div>
                      )}

                      {onHoldItems.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">On hold</h2>
                          <div className="space-y-3">
                            {onHoldItems.map((item, idx) =>
                              renderCard(item, {
                                canDrag: false,
                                displayPriority: item.priority ?? idx + 1,
                                showAskForYarn: false,
                                statusOptionIdx: 1,
                                showConnector: false,
                                style: onHoldCardStyle,
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {noPriorityItems.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">No priority</h2>
                          <div className="space-y-3">
                            {noPriorityItems.map((item, idx) =>
                              renderCard(item, {
                                canDrag: false,
                                displayPriority: idx + 1,
                                showAskForYarn: false,
                                statusOptionIdx: 1,
                                showConnector: false,
                                style: cardStyle,
                              })
                            )}
                          </div>
                        </div>
                      )}
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
    </>
  );
}
