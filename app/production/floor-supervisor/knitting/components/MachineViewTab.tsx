"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  getMachineOrderAssignment,
  updateAssignmentItemsPriorities,
  type MachineOrderAssignment,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService } from "@/shared/services/machinesService";
import AssignmentsCards from "@/app/catalog/needle-configuration/components/AssignmentsCards";

export default function MachineViewTab() {
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

  const handleReorderItems = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!poDetailsAssignment || fromIndex === toIndex) return;
      const items = [...(poDetailsAssignment.productionOrderItems ?? [])].sort(
        (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
      );
      const [removed] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, removed);
      const itemIds = items
        .map((item) => item.itemId)
        .filter((id): id is string => Boolean(id));
      if (itemIds.length !== items.length) {
        toast.error("Some items lack id – refresh and try again");
        return;
      }
      const payload = items.map((item, i) => ({
        itemId: item.itemId!,
        priority: i + 1,
      }));
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

  return (
    <>
      <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-100">
        <button
          type="button"
          onClick={fetchList}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
        >
          <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <select
          value={filterMachine}
          onChange={(e) => setFilterMachine(e.target.value)}
          className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 min-w-[140px]"
        >
          <option value="">All machines</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.machineCode ?? m.name ?? m.id}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filterNeedle}
          onChange={(e) => setFilterNeedle(e.target.value)}
          placeholder="Active needle"
          className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded w-32 placeholder:text-gray-400"
        />
        <select
          value={filterActive === "" ? "" : filterActive ? "true" : "false"}
          onChange={(e) => setFilterActive(e.target.value === "" ? "" : e.target.value === "true")}
          className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5"
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
          className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
        >
          <option value={10}>Show 10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

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
            className="fixed inset-y-0 right-0 w-[49%] shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden"
            style={{
              background: "#f6f6f6",
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(0,0,0,.06) 1px, transparent 0)
              `,
              backgroundSize: "24px 24px",
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur px-4 py-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-gray-800">PO details</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Drag cards to change priority · + zoom in / − zoom out</p>
              </div>
              <button
                type="button"
                onClick={() => { setPoDetailsAssignment(null); setZoomedCardIndex(null); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {savingOrder && (
                <div className="mb-3 text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent" />
                  Saving order…
                </div>
              )}
              {poDetailsAssignment.productionOrderItems?.length ? (
                <div className="space-y-3">
                  {[...(poDetailsAssignment.productionOrderItems ?? [])]
                    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
                    .map((item, idx) => {
                    const isZoomed = zoomedCardIndex === idx;
                    const displayPriority = item.priority ?? idx + 1;
                    return (
                      <div
                        key={item.itemId ?? `${item.productionOrder}-${item.article}-${idx}`}
                        draggable
                        onDragStart={() => setDraggedIndex(idx)}
                        onDragEnd={() => setDraggedIndex(null)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add("ring-2", "ring-purple-400");
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove("ring-2", "ring-purple-400");
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("ring-2", "ring-purple-400");
                          const from = draggedIndex;
                          if (from !== null) handleReorderItems(from, idx);
                        }}
                        className={`group relative flex items-center gap-3 py-3 px-4 rounded-xl border border-white/20 shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing touch-none w-fit max-w-[280px] ${
                          isZoomed ? "scale-110 z-10 shadow-xl" : ""
                        }`}
                        style={{
                          marginLeft: idx === 0 ? 0 : `${24 * Math.pow(1.5, idx - 1)}px`,
                          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)",
                          color: "#fff",
                        }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold" title={`Priority ${displayPriority}`}>
                          {displayPriority}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-bold truncate">
                            {item.orderNumber ?? item.productionOrder ?? "—"}
                          </div>
                          <div className="text-[11px] text-white/90 truncate">
                            {item.articleNumber ?? item.article ?? "—"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setZoomedCardIndex(isZoomed ? null : idx); }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                          title={isZoomed ? "Zoom out" : "Zoom in"}
                        >
                          <i className={isZoomed ? "ri-subtract-line text-sm" : "ri-add-line text-sm"} />
                        </button>
                        <i className="ri-draggable text-white/70 group-hover:text-white shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">No PO items.</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
