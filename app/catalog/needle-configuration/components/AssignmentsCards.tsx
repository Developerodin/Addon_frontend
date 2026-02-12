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

function needleOptionsCount(a: MachineOrderAssignment): number {
  const m = a.machine;
  if (typeof m !== "object" || !m) return 0;
  const config = (m as any).needleSizeConfig;
  if (Array.isArray(config)) return config.filter((c: any) => c?.needleSize).length;
  if ((m as any).needleSize) return 1;
  return 0;
}

function getItemCounts(a: MachineOrderAssignment): { poCount: number; articleCount: number } {
  const items = a.productionOrderItems ?? [];
  const poCount = new Set(items.map((i) => String(i.productionOrder ?? "")).filter(Boolean)).size;
  return { poCount, articleCount: items.length };
}

/** Dark purplish-blue gradient (top-left darker → bottom-right lighter bluish purple) */
const CARD_BG = "linear-gradient(135deg, #2d2a4e 0%, #3a3768 50%, #4a4d8c 100%)";

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

export interface AssignmentsCardsProps {
  rows: MachineOrderAssignment[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
  isLoading: boolean;
  togglingActiveId?: string | null;
  onPageChange: (page: number) => void;
  onConfig?: (a: MachineOrderAssignment) => void;
  onChangeNeedle?: (a: MachineOrderAssignment) => void;
  onLogs?: (a: MachineOrderAssignment) => void;
  onToggleActive?: (a: MachineOrderAssignment) => void;
  onReset?: (a: MachineOrderAssignment) => void;
  /** When true, hide active toggle and action buttons (read-only cards). */
  readOnly?: boolean;
  /** Optional card click handler (e.g. for read-only view to open PO details modal). */
  onCardClick?: (a: MachineOrderAssignment) => void;
}

export default function AssignmentsCards({
  rows,
  page,
  limit,
  totalResults,
  totalPages,
  isLoading,
  togglingActiveId = null,
  onPageChange,
  onConfig,
  onChangeNeedle,
  onLogs,
  onToggleActive,
  onReset,
  readOnly = false,
  onCardClick,
}: AssignmentsCardsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent mb-4" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px] text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-line text-2xl text-gray-300" />
        </div>
        <h3 className="text-sm font-bold text-gray-400 mb-1">No assignments</h3>
        <p className="text-xs text-gray-400">Create one using the button above.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((row) => {
            const { poCount, articleCount } = getItemCounts(row);
            const needleCount = needleOptionsCount(row);
            const isToggling = !readOnly && togglingActiveId === row.id;

            return (
              <div
                key={row.id}
                role={readOnly && onCardClick ? "button" : undefined}
                tabIndex={readOnly && onCardClick ? 0 : undefined}
                onClick={readOnly && onCardClick ? () => onCardClick(row) : undefined}
                onKeyDown={readOnly && onCardClick ? (e) => { if (e.key === "Enter" || e.key === " ") onCardClick(row); } : undefined}
                className={`rounded-xl shadow-lg overflow-hidden border border-white/10 transition-transform hover:scale-[1.02] ${readOnly && onCardClick ? "cursor-pointer" : ""}`}
                style={{ background: CARD_BG }}
              >
                <div className="p-4 text-white min-h-[200px] flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold truncate drop-shadow-sm text-white">
                      {machineLabel(row)}
                    </h3>
                    {!readOnly && (isToggling ? (
                      <span className="flex items-center gap-1 text-xs text-white/90 shrink-0">
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Updating…
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.isActive}
                        onClick={() => onToggleActive?.(row)}
                        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full"
                        title={row.isActive ? "Active – click to deactivate" : "Inactive – click to activate"}
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors ${
                            row.isActive
                              ? "bg-[#5b5f9e] border-white/40 shadow-[0_0_12px_rgba(91,95,158,0.8)]"
                              : "bg-white/20 border-white/30"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                              row.isActive ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm text-white/95 flex-1">
                    <div className="flex items-center gap-2">
                      <i className="ri-scissors-line text-white/80" />
                      <span className="font-medium">Active needle:</span>
                      <span>{row.activeNeedle || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ri-list-settings-line text-white/80" />
                      <span>{needleCount} needle option{needleCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ri-file-list-3-line text-white/80" />
                      <span>
                        {poCount} PO{poCount !== 1 ? "s" : ""}, {articleCount} Article{articleCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-400/40">
                      <button
                        type="button"
                        onClick={() => onConfig?.(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#5b5f9e]/70 text-white hover:bg-[#5b5f9e] transition-colors"
                        title="View Orders"
                      >
                        <i className="ri-settings-3-line text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeNeedle?.(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#5b5f9e]/70 text-white hover:bg-[#5b5f9e] transition-colors"
                        title="Change needle"
                      >
                        <i className="ri-edit-2-line text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onLogs?.(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#5b5f9e]/70 text-white hover:bg-[#5b5f9e] transition-colors"
                        title="Logs"
                      >
                        <i className="ri-file-list-3-line text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReset?.(row)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#5b5f9e]/70 text-white hover:bg-[#5b5f9e] transition-colors"
                        title="Reset"
                      >
                        <i className="ri-restart-line text-sm" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
        <div className="text-[11px] font-medium text-[#495057] tracking-tight">
          Showing {totalResults === 0 ? 0 : (page - 1) * limit + 1}–{totalResults === 0 ? 0 : Math.min(page * limit, totalResults)} of {totalResults} entries
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg border border-gray-200 hover:border-gray-300"
          >
            Prev
          </button>
          <div className="flex items-center gap-1">
            {getPagination(page, totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px] px-1">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(Number(p))}
                  className={`w-8 h-8 flex items-center justify-center text-[11px] font-bold rounded-lg transition-all ${
                    page === p ? "bg-purple-600 text-white shadow" : "text-gray-500 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg border border-gray-200 hover:border-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
