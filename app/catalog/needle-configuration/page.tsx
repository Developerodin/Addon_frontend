"use client";

import React, { useEffect, useState, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Toaster, toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  createMachineOrderAssignment,
  updateMachineOrderAssignment,
  type MachineOrderAssignment,
  type CreateAssignmentBody,
  type UpdateAssignmentBody,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService } from "@/shared/services/machinesService";
import { productionService } from "@/shared/services/productionService";
import AssignmentsCards from "./components/AssignmentsCards";
import AddEditAssignmentModal from "./components/AddEditAssignmentModal";
import ActiveNeedleModal from "./components/ActiveNeedleModal";
import AssignmentLogsModal from "./components/AssignmentLogsModal";

/** Collect unique needle sizes from machine list (needleSizeConfig or needleSize) */
function getNeedlesFromMachines(machines: { needleSizeConfig?: { needleSize: string }[]; needleSize?: string }[]): string[] {
  const set = new Set<string>();
  machines.forEach((m) => {
    if (Array.isArray(m.needleSizeConfig)) {
      m.needleSizeConfig.forEach((c) => c.needleSize && set.add(c.needleSize));
    }
    if (m.needleSize) set.add(m.needleSize);
  });
  return Array.from(set).sort();
}

const NeedleConfigurationPage = () => {
  const [rows, setRows] = useState<MachineOrderAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterNeedle, setFilterNeedle] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | "">("");

  const [machines, setMachines] = useState<{ id: string; machineCode?: string; name?: string; needleSizeConfig?: { needleSize: string }[]; needleSize?: string }[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<MachineOrderAssignment | null>(null);
  const [activeNeedleOpen, setActiveNeedleOpen] = useState(false);
  const [activeNeedleAssignment, setActiveNeedleAssignment] = useState<MachineOrderAssignment | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsAssignment, setLogsAssignment] = useState<MachineOrderAssignment | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

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
      toast.error(e instanceof Error ? e.message : "Failed to load assignments");
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
          needleSizeConfig: m.needleSizeConfig,
          needleSize: m.needleSize,
        }))
      );
    }).catch(() => setMachines([]));
  }, []);

  useEffect(() => {
    productionService.getOrders({ limit: 500 }).then((res) => {
      if (res.success && res.data?.results) {
        setProductionOrders(res.data.results);
      } else {
        setProductionOrders([]);
      }
    }).catch(() => setProductionOrders([]));
  }, []);

  const availableNeedles = getNeedlesFromMachines(machines);
  /** For "Change active needle" modal: only needles from this assignment's machine.needleSizeConfig */
  const activeNeedleModalOptions = (() => {
    if (!activeNeedleAssignment) return [];
    const m = activeNeedleAssignment.machine;
    if (typeof m === "object" && m && Array.isArray((m as any).needleSizeConfig)) {
      return ((m as any).needleSizeConfig as { needleSize: string }[])
        .map((c) => c.needleSize)
        .filter(Boolean);
    }
    return [activeNeedleAssignment.activeNeedle].filter(Boolean);
  })();
  const machineOptions = machines.map((m) => ({
    id: m.id,
    machineCode: m.machineCode,
    name: m.name,
  }));

  const openEdit = (a: MachineOrderAssignment) => {
    setEditAssignment(a);
    setAddEditOpen(true);
  };

  const openAdd = () => {
    setEditAssignment(null);
    setAddEditOpen(true);
  };

  const handleCreate = async (body: CreateAssignmentBody) => {
    await createMachineOrderAssignment(body);
    toast.success("Assignment created");
    fetchList();
  };

  const handleUpdate = async (id: string, body: UpdateAssignmentBody) => {
    await updateMachineOrderAssignment(id, body);
    toast.success("Assignment updated");
    fetchList();
  };

  const openActiveNeedle = (a: MachineOrderAssignment) => {
    setActiveNeedleAssignment(a);
    setActiveNeedleOpen(true);
  };

  const handleActiveNeedleSave = async (activeNeedle: string) => {
    if (!activeNeedleAssignment?.id) return;
    await updateMachineOrderAssignment(activeNeedleAssignment.id, { activeNeedle });
    toast.success("Active needle updated");
    setActiveNeedleOpen(false);
    setActiveNeedleAssignment(null);
    fetchList();
  };

  const openLogs = (a: MachineOrderAssignment) => {
    setLogsAssignment(a);
    setLogsOpen(true);
  };

  const handleToggleActive = async (a: MachineOrderAssignment) => {
    if (!a.id) return;
    const nextActive = !a.isActive;
    const message = nextActive
      ? "Activate this assignment?"
      : "Deactivate this assignment? It will be marked inactive.";
    if (!window.confirm(message)) return;
    setTogglingActiveId(a.id);
    const t = toast.loading(nextActive ? "Activating…" : "Deactivating…");
    try {
      await updateMachineOrderAssignment(a.id, { isActive: nextActive });
      toast.dismiss(t);
      toast.success(nextActive ? "Assignment activated" : "Assignment deactivated");
      fetchList();
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setTogglingActiveId(null);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Needle Configuration" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Needle Configuration</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
          </div>

          {/* 5 action buttons – top left: Create card + filters */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-md"
            >
              <i className="ri-add-line text-sm" />
              Create card
            </button>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="bg-white border border-gray-200 text-[11px] font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-300 min-w-[140px]"
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
              className="bg-white border border-gray-200 pl-3 pr-3 py-2 text-[11px] rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-300 w-32 min-w-[80px] placeholder:text-gray-400 font-medium"
            />
            <select
              value={filterActive === "" ? "" : filterActive ? "true" : "false"}
              onChange={(e) =>
                setFilterActive(e.target.value === "" ? "" : e.target.value === "true")
              }
              className="bg-white border border-gray-200 text-[11px] font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
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
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-purple-200 focus:border-purple-300 appearance-none cursor-pointer"
            >
              <option value={10}>Show 10</option>
              <option value={20}>Show 20</option>
              <option value={50}>Show 50</option>
              <option value={100}>Show 100</option>
            </select>
          </div>
        </div>

        <AssignmentsCards
          rows={rows}
          page={page}
          limit={limit}
          totalResults={totalResults}
          totalPages={totalPages}
          isLoading={isLoading}
          togglingActiveId={togglingActiveId}
          onPageChange={setPage}
          onConfig={openEdit}
          onChangeNeedle={openActiveNeedle}
          onLogs={openLogs}
          onToggleActive={handleToggleActive}
        />

          <AddEditAssignmentModal
          isOpen={addEditOpen}
          onClose={() => {
            setAddEditOpen(false);
            setEditAssignment(null);
          }}
          editAssignment={editAssignment}
          machines={machineOptions}
          productionOrders={productionOrders}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />

        <ActiveNeedleModal
          isOpen={activeNeedleOpen}
          onClose={() => {
            setActiveNeedleOpen(false);
            setActiveNeedleAssignment(null);
          }}
          currentNeedle={activeNeedleAssignment?.activeNeedle ?? ""}
          availableNeedles={activeNeedleModalOptions}
          onSave={handleActiveNeedleSave}
        />

        <AssignmentLogsModal
          isOpen={logsOpen}
          onClose={() => {
            setLogsOpen(false);
            setLogsAssignment(null);
          }}
          assignmentId={logsAssignment?.id ?? ""}
          assignmentLabel={
            logsAssignment
              ? `${logsAssignment.activeNeedle} (${typeof logsAssignment.machine === "object" ? (logsAssignment.machine as any)?.machineCode : logsAssignment.machine})`
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default NeedleConfigurationPage;
