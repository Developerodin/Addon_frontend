"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Toaster, toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import {
  teamMasterService,
  PRODUCTION_FLOORS,
  TEAM_ROLES,
  TEAM_MEMBER_STATUSES,
  getMyTeamIds,
  getTeamMemberName,
  type TeamMaster,
  type TeamMemberRef,
  type ProductionFloor,
  type TeamRole,
  type TeamMemberStatus,
} from "@/shared/services/teamMasterService";

function getPagination(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const TeamMasterPage = () => {
  const [rows, setRows] = useState<TeamMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [filterFloor, setFilterFloor] = useState<ProductionFloor | "">("");
  const [filterRole, setFilterRole] = useState<TeamRole | "">("");
  const [filterStatus, setFilterStatus] = useState<TeamMemberStatus | "">("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add/Edit member drawer
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [memberDrawerMode, setMemberDrawerMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberDrawerLoading, setMemberDrawerLoading] = useState(false);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formFloor, setFormFloor] = useState<ProductionFloor>("Knitting");
  const [formRole, setFormRole] = useState<TeamRole>("Team Member");
  const [formStatus, setFormStatus] = useState<TeamMemberStatus>("Active");
  const [myTeamIds, setMyTeamIds] = useState<string[]>([]);
  const [myTeamDisplay, setMyTeamDisplay] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [editDrawerSearch, setEditDrawerSearch] = useState("");
  const [editDrawerResults, setEditDrawerResults] = useState<TeamMaster[]>([]);
  const [editDrawerLoading, setEditDrawerLoading] = useState(false);

  // Add to My Team drawer (for supervisor row)
  const [addToTeamDrawerOpen, setAddToTeamDrawerOpen] = useState(false);
  const [addToTeamSupervisor, setAddToTeamSupervisor] = useState<TeamMaster | null>(null);
  const [addToTeamSearch, setAddToTeamSearch] = useState("");
  const [addToTeamResults, setAddToTeamResults] = useState<TeamMaster[]>([]);
  const [addToTeamLoading, setAddToTeamLoading] = useState(false);
  const [addToTeamIds, setAddToTeamIds] = useState<string[]>([]);

  const fetchList = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await teamMasterService.list({
        page,
        limit,
        search: search || undefined,
        workingFloor: filterFloor || undefined,
        role: filterRole || undefined,
        status: filterStatus || undefined,
        sortBy: sortBy || undefined,
      });
      setRows(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load team members");
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, filterFloor, filterRole, filterStatus, sortBy]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [search, filterFloor, filterRole, filterStatus]);

  const handleSelectAll = () => {
    if (selectAll) setSelectedIds([]);
    else setSelectedIds(rows.map((r) => r._id));
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((x) => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this team member?")) return;
    setDeletingId(id);
    try {
      await teamMasterService.remove(id);
      toast.success("Team member deleted");
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
    if (!window.confirm(`Delete ${selectedIds.length} selected team member(s)?`)) return;
    toast.loading("Deleting...");
    try {
      await Promise.all(selectedIds.map((id) => teamMasterService.remove(id)));
      toast.dismiss();
      toast.success("Selected team members deleted");
      setSelectedIds([]);
      setSelectAll(false);
      fetchList();
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    }
  };

  const openAddDrawer = () => {
    setMemberDrawerMode("add");
    setEditingId(null);
    setFormName("");
    setFormContact("");
    setFormFloor("Knitting");
    setFormRole("Team Member");
    setFormStatus("Active");
    setMyTeamIds([]);
    setMyTeamDisplay([]);
    setMemberDrawerOpen(true);
  };

  const openEditDrawer = async (row: TeamMaster) => {
    setMemberDrawerMode("edit");
    setEditingId(row._id);
    setMemberDrawerLoading(true);
    setMemberDrawerOpen(true);
    try {
      const m = await teamMasterService.getById(row._id);
      setFormName(m.teamMemberName);
      setFormContact(m.contactNumber ?? "");
      setFormFloor(m.workingFloor);
      setFormRole(m.role);
      setFormStatus(m.status);
      const ids = getMyTeamIds(m.myTeam);
      setMyTeamIds(ids);
      const teamArr = Array.isArray(m.myTeam) ? m.myTeam : [];
      setMyTeamDisplay(
        teamArr.map((item) => ({
          id: typeof item === "string" ? item : (item as TeamMemberRef)._id,
          name: getTeamMemberName(item as TeamMemberRef),
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
      setMemberDrawerOpen(false);
    } finally {
      setMemberDrawerLoading(false);
    }
  };

  const closeMemberDrawer = () => {
    setMemberDrawerOpen(false);
    setEditingId(null);
    setEditDrawerSearch("");
    setEditDrawerResults([]);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Team member name is required");
      return;
    }
    setSaving(true);
    try {
      if (memberDrawerMode === "add") {
        await teamMasterService.create({
          teamMemberName: formName.trim(),
          contactNumber: formContact.trim() || undefined,
          workingFloor: formFloor,
          myTeam: [],
          role: formRole,
          status: formStatus,
        });
        toast.success("Team member created");
      } else if (editingId) {
        await teamMasterService.update(editingId, {
          teamMemberName: formName.trim(),
          contactNumber: formContact.trim() || null,
          workingFloor: formFloor,
          myTeam: myTeamIds,
          role: formRole,
          status: formStatus,
        });
        toast.success("Team member updated");
      }
      closeMemberDrawer();
      fetchList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addToMyTeamInEdit = (m: TeamMaster) => {
    if (myTeamIds.includes(m._id)) return;
    setMyTeamIds((prev) => [...prev, m._id]);
    setMyTeamDisplay((prev) => [...prev, { id: m._id, name: m.teamMemberName }]);
  };

  const removeFromMyTeamInEdit = (memberId: string) => {
    setMyTeamIds((prev) => prev.filter((x) => x !== memberId));
    setMyTeamDisplay((prev) => prev.filter((x) => x.id !== memberId));
  };

  useEffect(() => {
    if (!memberDrawerOpen || memberDrawerMode !== "edit" || !editingId) return;
    const q = editDrawerSearch.trim();
    if (!q) {
      setEditDrawerLoading(true);
      teamMasterService.list({ limit: 100 }).then((r) => {
        const exclude = [editingId, ...myTeamIds];
        setEditDrawerResults(r.results.filter((x) => !exclude.includes(x._id)));
      }).catch(() => setEditDrawerResults([])).finally(() => setEditDrawerLoading(false));
      return;
    }
    const t = setTimeout(() => {
      setEditDrawerLoading(true);
      teamMasterService.list({ search: q, limit: 50 })
        .then((r) => {
          const exclude = [editingId, ...myTeamIds];
          setEditDrawerResults(r.results.filter((x) => !exclude.includes(x._id)));
        })
        .catch(() => setEditDrawerResults([]))
        .finally(() => setEditDrawerLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [memberDrawerOpen, memberDrawerMode, editingId, editDrawerSearch, myTeamIds]);

  const openAddToTeamDrawer = (supervisor: TeamMaster) => {
    setAddToTeamSupervisor(supervisor);
    setAddToTeamIds(getMyTeamIds(supervisor.myTeam));
    setAddToTeamSearch("");
    setAddToTeamResults([]);
    setAddToTeamDrawerOpen(true);
  };

  const closeAddToTeamDrawer = () => {
    setAddToTeamDrawerOpen(false);
    setAddToTeamSupervisor(null);
  };

  useEffect(() => {
    if (!addToTeamDrawerOpen || !addToTeamSupervisor) return;
    const supId = addToTeamSupervisor._id;
    const q = addToTeamSearch.trim();
    if (!q) {
      setAddToTeamLoading(true);
      teamMasterService.list({ limit: 100 }).then((r) => {
        const exclude = [supId, ...addToTeamIds];
        setAddToTeamResults(r.results.filter((x) => !exclude.includes(x._id)));
      }).catch(() => setAddToTeamResults([])).finally(() => setAddToTeamLoading(false));
      return;
    }
    const t = setTimeout(() => {
      setAddToTeamLoading(true);
      teamMasterService.list({ search: q, limit: 50 })
        .then((r) => {
          const exclude = [supId, ...addToTeamIds];
          setAddToTeamResults(r.results.filter((x) => !exclude.includes(x._id)));
        })
        .catch(() => setAddToTeamResults([]))
        .finally(() => setAddToTeamLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [addToTeamDrawerOpen, addToTeamSupervisor, addToTeamSearch, addToTeamIds]);

  const addMemberToSupervisorTeam = async (m: TeamMaster) => {
    if (!addToTeamSupervisor) return;
    const nextIds = [...addToTeamIds, m._id];
    try {
      await teamMasterService.update(addToTeamSupervisor._id, { myTeam: nextIds });
      setAddToTeamIds(nextIds);
      toast.success(`Added ${m.teamMemberName} to team`);
      fetchList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    }
  };

  const myTeamCount = (row: TeamMaster) => (Array.isArray(row.myTeam) ? row.myTeam.length : 0);

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Team Master" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Team Master</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Team Master"
                content={
                  <div>
                    <p className="mb-2">Manage team members by floor and role. Use the side drawer to add or edit. For Supervisors, use the My Team column to add members.</p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search name, contact, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor((e.target.value || "") as ProductionFloor | "")}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="">All floors</option>
                {PRODUCTION_FLOORS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole((e.target.value || "") as TeamRole | "")}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="">All roles</option>
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus((e.target.value || "") as TeamMemberStatus | "")}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="">All status</option>
                {TEAM_MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="createdAt">Sort: Created</option>
                <option value="teamMemberName">Sort: Name</option>
                <option value="workingFloor">Sort: Floor</option>
                <option value="role">Sort: Role</option>
                <option value="status">Sort: Status</option>
              </select>
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
                onClick={openAddDrawer}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i>
                Add Team Member
              </button>
            </div>
          </div>
        </div>

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
                onClick={openAddDrawer}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i> Add First Team Member
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Contact</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Role</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">My Team</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => handleRowSelect(row._id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-200">{row.teamMemberName}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{row.contactNumber ?? "-"}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">{row.workingFloor}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-purple-100 text-purple-800">{row.role}</span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${row.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      {row.role === "Supervisor" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-medium text-gray-600">{myTeamCount(row)}</span>
                          <button
                            type="button"
                            onClick={() => openAddToTeamDrawer(row)}
                            className="w-7 h-7 flex items-center justify-center bg-purple-50 text-purple-500 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                            title="Add to My Team"
                          >
                            <i className="ri-add-line text-xs"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEditDrawer(row)} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
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

        {!isLoading && totalResults > 0 && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing <span>{(page - 1) * limit + 1} to {Math.min(page * limit, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(page, totalPages).map((p, idx) =>
                  p === "..." ? <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span> : (
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

      {/* Add/Edit member side drawer */}
      {memberDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={closeMemberDrawer} />
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">{memberDrawerMode === "add" ? "Add Team Member" : "Edit Team Member"}</h2>
              <button type="button" onClick={closeMemberDrawer} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-[10px]">
              {memberDrawerLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
              ) : (
                <form onSubmit={handleMemberSubmit} id="member-form" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Team Member Name <span className="text-red-500">*</span></label>
                      <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500" placeholder="e.g. John Doe" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Contact Number</label>
                      <input type="text" value={formContact} onChange={(e) => setFormContact(e.target.value)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500" placeholder="e.g. +91 9876543210" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Working Floor <span className="text-red-500">*</span></label>
                      <select value={formFloor} onChange={(e) => setFormFloor(e.target.value as ProductionFloor)} required className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                        {PRODUCTION_FLOORS.map((f) => (<option key={f} value={f}>{f}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Role</label>
                      <select value={formRole} onChange={(e) => setFormRole(e.target.value as TeamRole)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                        {TEAM_ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Status</label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as TeamMemberStatus)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                        {TEAM_MEMBER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                    {memberDrawerMode === "edit" && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-2">My Team</label>
                        {myTeamDisplay.length === 0 ? (
                          <p className="text-[12px] text-gray-500 py-1">No team members. Search below to add.</p>
                        ) : (
                          <ul className="space-y-2 mb-3">
                            {myTeamDisplay.map((item) => (
                              <li key={item.id} className="flex items-center justify-between bg-gray-50 border-2 border-gray-400 rounded px-3 py-2 text-[12px] font-medium text-gray-900">
                                {item.name}
                                <button type="button" onClick={() => removeFromMyTeamInEdit(item.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100">
                                  <i className="ri-close-line text-xs"></i>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <input type="text" value={editDrawerSearch} onChange={(e) => setEditDrawerSearch(e.target.value)} placeholder="Search to add team member..." className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500 mb-2" />
                        {editDrawerSearch.trim() && (
                          <div className="max-h-40 overflow-auto border border-gray-200 rounded">
                            {editDrawerLoading ? <div className="p-2 text-[11px] text-gray-500">Searching...</div> : editDrawerResults.length === 0 ? <div className="p-2 text-[11px] text-gray-500">No results</div> : editDrawerResults.map((m) => (
                              <button key={m._id} type="button" onClick={() => addToMyTeamInEdit(m)} className="w-full text-left px-3 py-2 text-[12px] font-medium text-gray-900 hover:bg-purple-50 border-b border-gray-100 last:border-0">
                                {m.teamMemberName} {m.workingFloor ? ` · ${m.workingFloor}` : ""}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
            {!memberDrawerLoading && (
              <div className="p-[10px] border-t border-gray-200 flex gap-2">
                <button type="button" onClick={closeMemberDrawer} className="flex-1 px-3 py-1.5 bg-white border-2 border-gray-400 text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" form="member-form" disabled={saving} className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50">
                  {saving ? <i className="ri-loader-4-line animate-spin inline-block"></i> : memberDrawerMode === "add" ? "Create" : "Update"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to My Team drawer (for supervisor row) */}
      {addToTeamDrawerOpen && addToTeamSupervisor && (
        <div className="fixed inset-0 z-[60] flex justify-end" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={closeAddToTeamDrawer} />
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">Add to My Team — {addToTeamSupervisor.teamMemberName}</h2>
              <button type="button" onClick={closeAddToTeamDrawer} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-[10px] border-b border-gray-100">
              <input type="text" value={addToTeamSearch} onChange={(e) => setAddToTeamSearch(e.target.value)} placeholder="Search by name, contact, barcode..." className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500" />
            </div>
            <div className="flex-1 overflow-auto p-[10px]">
              {addToTeamLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div></div>
              ) : addToTeamResults.length === 0 ? (
                <p className="text-[12px] text-gray-500 py-4">No team members found. Try a different search.</p>
              ) : (
                <ul className="space-y-1">
                  {addToTeamResults.map((m) => (
                    <li key={m._id}>
                      <button type="button" onClick={() => addMemberToSupervisorTeam(m)} className="w-full text-left px-3 py-2 text-[12px] font-medium text-gray-900 hover:bg-purple-50 border border-gray-200 rounded">
                        {m.teamMemberName} {m.contactNumber ? ` · ${m.contactNumber}` : ""} {m.workingFloor ? ` · ${m.workingFloor}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMasterPage;
