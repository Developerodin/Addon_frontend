"use client";

import React from "react";
import type { MachineOrderAssignment } from "@/shared/services/machineOrderAssignmentService";

function machineLabel(a: MachineOrderAssignment): string {
  const m = a.machine;
  if (typeof m === "object" && m) {
    return (m as any).machineCode ?? (m as any).name ?? (m as any).id ?? "-";
  }
  return typeof m === "string" ? m : "-";
}

/** Count of needle options available for this machine (for "Change active needle" modal) */
function needleOptionsCount(a: MachineOrderAssignment): number {
  const m = a.machine;
  if (typeof m !== "object" || !m) return 0;
  const config = (m as any).needleSizeConfig;
  if (Array.isArray(config)) return config.filter((c: any) => c?.needleSize).length;
  if ((m as any).needleSize) return 1;
  return 0;
}

/** PO count = unique production orders; Article count = items length */
function getItemCounts(a: MachineOrderAssignment): { poCount: number; articleCount: number } {
  const items = a.productionOrderItems ?? [];
  const poCount = new Set(items.map((i) => String(i.productionOrder ?? "")).filter(Boolean)).size;
  return { poCount, articleCount: items.length };
}

function getPagination(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (currentPage > 3) pages.push("...");
  for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 3) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);
  return pages;
}

export interface AssignmentsTableProps {
  rows: MachineOrderAssignment[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
  isLoading: boolean;
  togglingActiveId: string | null;
  onPageChange: (page: number) => void;
  onConfig: (a: MachineOrderAssignment) => void;
  onChangeNeedle: (a: MachineOrderAssignment) => void;
  onLogs: (a: MachineOrderAssignment) => void;
  onToggleActive: (a: MachineOrderAssignment) => void;
}

export default function AssignmentsTable({
  rows,
  page,
  limit,
  totalResults,
  totalPages,
  isLoading,
  togglingActiveId,
  onPageChange,
  onConfig,
  onChangeNeedle,
  onLogs,
  onToggleActive,
}: AssignmentsTableProps) {
  return (
    <>
      <div className="overflow-x-auto min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-xl text-gray-200" />
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="pl-[10px] pr-1 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">#</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Machine</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Active needle</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Needle options</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Items (PO / Article / Status)</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="pl-[10px] pr-1 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{machineLabel(row)}</td>
                  <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{row.activeNeedle ?? "-"}</td>
                  <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{needleOptionsCount(row)}</td>
                  <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                    {(() => {
                      const { poCount, articleCount } = getItemCounts(row);
                      if (poCount === 0 && articleCount === 0) return <span className="text-gray-400">—</span>;
                      return (
                        <span className="text-gray-700 font-medium">
                          {poCount} PO{poCount !== 1 ? "s" : ""}, {articleCount} Article{articleCount !== 1 ? "s" : ""}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    {togglingActiveId === row.id ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-purple-500 border-t-transparent" />
                        Updating…
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleActive(row)}
                        className={`text-[11px] font-bold px-2 py-1 rounded border transition-colors ${row.isActive ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"}`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </button>
                    )}
                  </td>
                  <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => onConfig(row)} className="w-7 h-7 flex items-center justify-center bg-purple-50 text-purple-400 border border-purple-100 rounded hover:bg-purple-100 transition-colors" title="View Orders">
                        <i className="ri-settings-3-line text-xs" />
                      </button>
                      <button type="button" onClick={() => onChangeNeedle(row)} className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title="Change needle">
                        <i className="ri-edit-2-line text-xs" />
                      </button>
                      <button type="button" onClick={() => onLogs(row)} className="w-7 h-7 flex items-center justify-center bg-amber-50 text-amber-400 border border-amber-100 rounded hover:bg-amber-100 transition-colors" title="Logs">
                        <i className="ri-file-list-3-line text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
        <div className="text-[11px] font-medium text-[#495057] tracking-tight">
          Showing <span>{totalResults === 0 ? 0 : (page - 1) * limit + 1} to {totalResults === 0 ? 0 : Math.min(page * limit, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
        </div>
        <div className="flex items-center">
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
          <div className="flex items-center gap-1 mx-2">
            {getPagination(page, totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span>
              ) : (
                <button key={p} onClick={() => onPageChange(Number(p))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${page === p ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}>
                  {p}
                </button>
              )
            )}
          </div>
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
        </div>
      </div>
    </>
  );
}
