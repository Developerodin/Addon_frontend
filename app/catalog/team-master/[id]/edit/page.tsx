"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
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

const EditTeamMemberPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [workingFloor, setWorkingFloor] = useState<ProductionFloor>("Knitting");
  const [role, setRole] = useState<TeamRole>("Team Member");
  const [status, setStatus] = useState<TeamMemberStatus>("Active");
  const [myTeamIds, setMyTeamIds] = useState<string[]>([]);
  const [myTeamDisplay, setMyTeamDisplay] = useState<{ id: string; name: string }[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerResults, setDrawerResults] = useState<TeamMaster[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const loadMember = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const m = await teamMasterService.getById(id);
      setTeamMemberName(m.teamMemberName);
      setContactNumber(m.contactNumber ?? "");
      setWorkingFloor(m.workingFloor);
      setRole(m.role);
      setStatus(m.status);
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
      toast.error(err instanceof Error ? err.message : "Failed to load team member");
      router.push("/catalog/team-master");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  useEffect(() => {
    if (!drawerOpen) return;
    const q = drawerSearch.trim();
    if (!q) {
      setDrawerLoading(true);
      teamMasterService.list({ limit: 100 }).then((r) => {
        const exclude = [id, ...myTeamIds];
        setDrawerResults(r.results.filter((x) => !exclude.includes(x._id)));
      }).catch(() => setDrawerResults([])).finally(() => setDrawerLoading(false));
      return;
    }
    const t = setTimeout(() => {
      setDrawerLoading(true);
      teamMasterService.list({ search: q, limit: 50 })
        .then((r) => {
          const exclude = [id, ...myTeamIds];
          setDrawerResults(r.results.filter((x) => !exclude.includes(x._id)));
        })
        .catch(() => setDrawerResults([]))
        .finally(() => setDrawerLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [drawerOpen, drawerSearch, id, myTeamIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !teamMemberName.trim()) {
      toast.error("Team member name is required");
      return;
    }
    setSaving(true);
    try {
      await teamMasterService.update(id, {
        teamMemberName: teamMemberName.trim(),
        contactNumber: contactNumber.trim() || null,
        workingFloor,
        myTeam: myTeamIds,
        role,
        status,
      });
      toast.success("Team member updated");
      router.push("/catalog/team-master");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const addToMyTeam = (m: TeamMaster) => {
    if (myTeamIds.includes(m._id)) return;
    setMyTeamIds((prev) => [...prev, m._id]);
    setMyTeamDisplay((prev) => [...prev, { id: m._id, name: m.teamMemberName }]);
  };

  const removeFromMyTeam = (memberId: string) => {
    setMyTeamIds((prev) => prev.filter((x) => x !== memberId));
    setMyTeamDisplay((prev) => prev.filter((x) => x.id !== memberId));
  };

  if (loading) {
    return (
      <div className="main-content !p-[10px] flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Edit Team Member" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Edit Team Member</h1>
            </div>
            <Link
              href="/catalog/team-master"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
            >
              <i className="ri-arrow-left-line text-xs"></i> Back
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Team Member Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={teamMemberName}
                  onChange={(e) => setTeamMemberName(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
                  placeholder="e.g. +91 9876543210"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Working Floor <span className="text-red-500">*</span></label>
                <select
                  value={workingFloor}
                  onChange={(e) => setWorkingFloor(e.target.value as ProductionFloor)}
                  required
                  className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
                >
                  {PRODUCTION_FLOORS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                  {TEAM_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as TeamMemberStatus)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                  {TEAM_MEMBER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* My Team - only on edit */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-gray-700">My Team</label>
                <button
                  type="button"
                  onClick={() => { setDrawerOpen(true); setDrawerSearch(""); setDrawerResults([]); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add to team
                </button>
              </div>
              {myTeamDisplay.length === 0 ? (
                <p className="text-[12px] text-gray-500 py-2">No team members added. Use &quot;Add to team&quot; to search and add.</p>
              ) : (
                <ul className="space-y-2">
                  {myTeamDisplay.map((item) => (
                    <li key={item.id} className="flex items-center justify-between bg-gray-50 border-2 border-gray-400 rounded px-3 py-2 text-[12px] font-medium text-gray-900">
                      {item.name}
                      <button type="button" onClick={() => removeFromMyTeam(item.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100" title="Remove">
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Link href="/catalog/team-master" className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 text-center">
                Cancel
              </Link>
              <button type="submit" disabled={saving} className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50">
                {saving ? <i className="ri-loader-4-line animate-spin inline-block"></i> : "Update"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Side drawer: search and add to myTeam */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">Add to My Team</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-[10px] border-b border-gray-100">
              <input
                type="text"
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
                placeholder="Search by name, contact, barcode..."
                className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
              />
            </div>
            <div className="flex-1 overflow-auto p-[10px]">
              {drawerLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div></div>
              ) : drawerResults.length === 0 ? (
                <p className="text-[12px] text-gray-500 py-4">No team members found. Try a different search.</p>
              ) : (
                <ul className="space-y-1">
                  {drawerResults.map((m) => (
                    <li key={m._id}>
                      <button
                        type="button"
                        onClick={() => addToMyTeam(m)}
                        className="w-full text-left px-3 py-2 text-[12px] font-medium text-gray-900 hover:bg-purple-50 border border-gray-100 rounded"
                      >
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

export default EditTeamMemberPage;
