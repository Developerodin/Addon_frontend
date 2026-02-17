"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Toaster, toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import {
  containersMasterService,
  CONTAINER_FLOORS,
  type ContainerMaster,
  type ContainerFloor,
  type ContainerStatus,
  type CreateContainerBody,
  type UpdateContainerBody,
} from "@/shared/services/containersMasterService";

function getPagination(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const ContainersMasterPage = () => {
  const [rows, setRows] = useState<ContainerMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [filterFloor, setFilterFloor] = useState<ContainerFloor | "">("");
  const [filterStatus, setFilterStatus] = useState<ContainerStatus | "">("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [sideModalOpen, setSideModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<ContainerMaster | null>(null);
  const [formFloor, setFormFloor] = useState<ContainerFloor>("Warehouse");
  const [formStatus, setFormStatus] = useState<ContainerStatus>("Active");
  const [formContainerName, setFormContainerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await containersMasterService.list({
        page,
        limit,
        search: search || undefined,
        containerFloor: filterFloor || undefined,
        status: filterStatus || undefined,
        sortBy: sortBy || undefined,
      });
      setRows(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load containers");
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, filterFloor, filterStatus, sortBy]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [search, filterFloor, filterStatus]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r._id));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const openAddModal = () => {
    setEditingContainer(null);
    setFormFloor("Warehouse");
    setFormStatus("Active");
    setFormContainerName("");
    setSideModalOpen(true);
  };

  const openEditModal = (row: ContainerMaster) => {
    setEditingContainer(row);
    setFormFloor(row.containerFloor);
    setFormStatus(row.status);
    setFormContainerName(row.containerName ?? "");
    setSideModalOpen(true);
  };

  const closeModal = () => {
    setSideModalOpen(false);
    setEditingContainer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingContainer) {
        const body: UpdateContainerBody = { containerFloor: formFloor, status: formStatus, containerName: formContainerName.trim() || undefined };
        await containersMasterService.update(editingContainer._id, body);
        toast.success("Container updated");
      } else {
        const body: CreateContainerBody = { containerFloor: formFloor, status: formStatus, containerName: formContainerName.trim() || undefined };
        await containersMasterService.create(body);
        toast.success("Container created");
      }
      closeModal();
      fetchList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this container?")) return;
    setDeletingId(id);
    try {
      await containersMasterService.remove(id);
      toast.success("Container deleted");
      fetchList();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected container(s)?`)) return;
    toast.loading("Deleting...");
    try {
      await Promise.all(selectedIds.map((id) => containersMasterService.remove(id)));
      toast.dismiss();
      toast.success("Selected containers deleted");
      setSelectedIds([]);
      setSelectAll(false);
      fetchList();
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Containers Master" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Containers Master</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Containers Master"
                content={
                  <div>
                    <p className="mb-2">Manage floor containers. Create containers for Knitting, Linking, Checking, Washing, Boarding, Silicon, Secondary Checking, Branding, Final Checking, Warehouse, or Dispatch.</p>
                    <p className="text-sm text-gray-600">Use filters by floor and status, search by barcode, and add/edit/delete from the table or side panel.</p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor((e.target.value || "") as ContainerFloor | "")}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="">All floors</option>
                {CONTAINER_FLOORS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus((e.target.value || "") as ContainerStatus | "")}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="">All status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="createdAt">Sort: Created</option>
                <option value="containerFloor">Sort: Floor</option>
                <option value="status">Sort: Status</option>
              </select>
              <div className="relative group">
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={10}>Show 10</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                  <option value={500}>Show 500</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm"
                  onClick={handleBulkDelete}
                  disabled={isLoading}
                >
                  <i className="ri-delete-bin-line text-xs"></i>
                  Delete ({selectedIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i>
                Add Container
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i> Add First Container
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => handleRowSelect(row._id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-200">{row.barcode}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{row.containerName ?? "-"}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">{row.containerFloor}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${row.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEditModal(row)} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
                          <i className="ri-pencil-line text-xs"></i>
                        </button>
                        <button type="button" onClick={() => handleDelete(row._id)} disabled={deletingId === row._id} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors" title="Delete">
                          {deletingId === row._id ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-delete-bin-line text-xs"></i>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalResults > 0 && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing <span>{totalResults === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(page, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span>
                  ) : (
                    <button key={p} onClick={() => setPage(Number(p))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${page === p ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}>
                      {p}
                    </button>
                  )
                )}
              </div>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Side modal: Add / Edit */}
      {sideModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">{editingContainer ? "Edit Container" : "Add Container"}</h2>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-[10px] flex flex-col gap-4 flex-1 overflow-auto">
              {editingContainer && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Barcode</label>
                  <p className="text-[12px] font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">{editingContainer.barcode}</p>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Container Name</label>
                <input type="text" value={formContainerName} onChange={(e) => setFormContainerName(e.target.value)} placeholder="Optional name" className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Floor <span className="text-red-500">*</span></label>
                <select value={formFloor} onChange={(e) => setFormFloor(e.target.value as ContainerFloor)} required className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300">
                  {CONTAINER_FLOORS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as ContainerStatus)} className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="mt-auto flex gap-2 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50">
                  {saving ? <i className="ri-loader-4-line animate-spin inline-block"></i> : editingContainer ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainersMasterPage;
