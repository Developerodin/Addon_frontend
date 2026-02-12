"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { listMachineOrderAssignments, type MachineOrderAssignment } from "@/shared/services/machineOrderAssignmentService";
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
        onCardClick={setPoDetailsAssignment}
      />

      {/* PO details – right-side drawer, 70% width */}
      {poDetailsAssignment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPoDetailsAssignment(null)} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-[70%] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
              <h3 className="text-sm font-bold text-gray-800">PO details</h3>
              <button
                type="button"
                onClick={() => setPoDetailsAssignment(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {poDetailsAssignment.productionOrderItems?.length ? (
                <table className="w-full border-collapse border border-gray-200 text-[11px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-bold text-[#495057] border border-gray-200">PO / Order</th>
                      <th className="px-2 py-2 text-left font-bold text-[#495057] border border-gray-200">Article</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poDetailsAssignment.productionOrderItems.map((item, idx) => (
                      <tr key={idx} className="border border-gray-200">
                        <td className="px-2 py-2 border border-gray-200">{item.orderNumber ?? item.productionOrder ?? "—"}</td>
                        <td className="px-2 py-2 border border-gray-200">{item.articleNumber ?? item.article ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
