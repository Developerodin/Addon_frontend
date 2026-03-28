"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { teamMasterService, type TeamMaster } from "@/shared/services/teamMasterService";
import { productionService, type ProductionArticleDetail } from "@/shared/services/productionService";
import WarehouseArticleDetailBlock from "./WarehouseArticleDetailBlock";

const FLOOR_WAREHOUSE = "Warehouse" as const;

/** Team members whose workingFloor is Warehouse. */
export default function WarehouseMyTeamTab() {
  const [members, setMembers] = useState<TeamMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [viewActiveMember, setViewActiveMember] = useState<TeamMaster | null>(null);
  const [viewActiveLoading, setViewActiveLoading] = useState(false);
  const [articleDetails, setArticleDetails] = useState<ProductionArticleDetail[]>([]);
  const [articleDetailsLoading, setArticleDetailsLoading] = useState(false);
  const [completingArticleId, setCompletingArticleId] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await teamMasterService.list({
        workingFloor: FLOOR_WAREHOUSE,
        page: 1,
        limit: 200,
        search: search.trim() || undefined,
      });
      setMembers(data.results);
      setTotalResults(data.totalResults);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load team members");
      setMembers([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  const handleViewActiveArticle = useCallback(async (member: TeamMaster) => {
    setViewActiveLoading(true);
    setViewActiveMember(null);
    setArticleDetails([]);
    try {
      const full = await teamMasterService.getById(member._id);
      setViewActiveMember(full);
      const ids = (full.articleData?.map((d) => d.activeArticle).filter(Boolean) ?? []) as string[];
      if (ids.length === 0) {
        setViewActiveLoading(false);
        return;
      }
      setArticleDetailsLoading(true);
      const results = await Promise.allSettled(ids.map((id) => productionService.getArticle(id)));
      const details: ProductionArticleDetail[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.success && r.value.data) details.push(r.value.data);
        else if (r.status === "rejected") toast.error(`Failed to load article: ${ids[i]}`);
      });
      setArticleDetails(details);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load member details");
    } finally {
      setViewActiveLoading(false);
      setArticleDetailsLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setViewActiveMember(null);
    setArticleDetails([]);
    setCompletingArticleId(null);
  }, []);

  const handleArticleComplete = useCallback(
    async (articleId: string) => {
      if (!viewActiveMember) return;
      setCompletingArticleId(articleId);
      try {
        await teamMasterService.removeActiveArticle(viewActiveMember._id, articleId);
        toast.success("Article complete – removed from active list.");
        setArticleDetails((prev) => prev.filter((a) => (a._id ?? a.id) !== articleId));
        fetchTeam();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to complete article");
      } finally {
        setCompletingArticleId(null);
      }
    },
    [viewActiveMember, fetchTeam]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchTeam(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTeam, search]);

  if (isLoading && members.length === 0) {
    return (
      <div className="p-[10px] flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <input
            type="text"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-teal-300 w-full placeholder:text-gray-400 font-medium"
            placeholder="Search by name or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
          onClick={() => fetchTeam()}
          disabled={isLoading}
          title="Refresh"
        >
          <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <span className="text-[11px] font-medium text-[#495057]">
          {totalResults} member{totalResults !== 1 ? "s" : ""} on Warehouse floor
        </span>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Name
              </th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Contact
              </th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Role
              </th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Status
              </th>
              <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[11px] text-gray-500">
                  No team members found for Warehouse floor.
                </td>
              </tr>
            ) : (
              members.map((row) => {
                const activeCount = row.articleData?.filter((d) => d.activeArticle).length ?? 0;
                return (
                  <tr key={row._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200 text-[12px] font-medium text-gray-900">
                      {row.teamMemberName}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200 text-[12px] text-gray-600">{row.contactNumber || "—"}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.role === "Supervisor"
                            ? "bg-teal-50 text-teal-700 border border-teal-100"
                            : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {row.role}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.status === "Active"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleViewActiveArticle(row)}
                        disabled={viewActiveLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 disabled:opacity-50"
                      >
                        <i className={`ri-file-list-line text-xs ${viewActiveLoading ? "animate-pulse" : ""}`} />
                        View active article{activeCount !== 1 ? "s" : ""} {activeCount > 0 && `(${activeCount})`}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {viewActiveMember && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col overflow-hidden border-l border-gray-200">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200 flex-shrink-0">
              <h4 className="text-sm font-bold text-gray-800">Active articles — {viewActiveMember.teamMemberName}</h4>
              <button type="button" onClick={closeDrawer} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-[10px]">
              {articleDetailsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-3 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Loading articles...</p>
                </div>
              ) : articleDetails.length === 0 ? (
                <p className="text-[10px] text-gray-500 py-4">No active articles or failed to load.</p>
              ) : (
                <div className="space-y-4">
                  {articleDetails.map((art, idx) => (
                    <WarehouseArticleDetailBlock
                      key={art.id ?? art._id ?? idx}
                      art={art}
                      idx={idx}
                      onArticleComplete={handleArticleComplete}
                      completingArticleId={completingArticleId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
