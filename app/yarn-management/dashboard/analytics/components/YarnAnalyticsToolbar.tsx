"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import supplierService from "@/shared/services/supplierService";
import type { YarnPoStatus } from "../yarnPoStatuses";
import { YARN_PO_STATUSES } from "../yarnPoStatuses";
import { SearchPickerDrawer, type PickerItem } from "./SearchPickerDrawer";

export interface YarnAnalyticsToolbarProps {
  dateMode: "created" | "received";
  onDateModeChange: (v: "created" | "received") => void;
  includeDraft: boolean;
  onIncludeDraftChange: (v: boolean) => void;
  supplierId: string;
  supplierLabel: string;
  onSupplierSelect: (id: string, label: string) => void;
  statuses: YarnPoStatus[];
  onStatusesChange: (v: YarnPoStatus[]) => void;
}

const STATUS_COLORS: Record<string, { active: string; idle: string }> = {
  draft: {
    active: "bg-gray-600 text-white border-gray-600",
    idle: "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
  },
  submitted_to_supplier: {
    active: "bg-blue-600 text-white border-blue-600",
    idle: "bg-white text-blue-700 border-blue-200 hover:border-blue-400",
  },
  in_transit: {
    active: "bg-indigo-600 text-white border-indigo-600",
    idle: "bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400",
  },
  goods_partially_received: {
    active: "bg-amber-500 text-white border-amber-500",
    idle: "bg-white text-amber-700 border-amber-200 hover:border-amber-400",
  },
  goods_received: {
    active: "bg-teal-600 text-white border-teal-600",
    idle: "bg-white text-teal-700 border-teal-200 hover:border-teal-400",
  },
  returned_to_vendor: {
    active: "bg-slate-600 text-white border-slate-600",
    idle: "bg-white text-slate-700 border-slate-200 hover:border-slate-400",
  },
  qc_pending: {
    active: "bg-orange-500 text-white border-orange-500",
    idle: "bg-white text-orange-700 border-orange-200 hover:border-orange-400",
  },
  po_rejected: {
    active: "bg-red-600 text-white border-red-600",
    idle: "bg-white text-red-700 border-red-200 hover:border-red-400",
  },
  po_accepted: {
    active: "bg-green-600 text-white border-green-600",
    idle: "bg-white text-green-700 border-green-200 hover:border-green-400",
  },
  po_accepted_partially: {
    active: "bg-emerald-500 text-white border-emerald-500",
    idle: "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400",
  },
};

export function YarnAnalyticsToolbar({
  dateMode,
  onDateModeChange,
  includeDraft,
  onIncludeDraftChange,
  supplierId,
  supplierLabel,
  onSupplierSelect,
  statuses,
  onStatusesChange,
}: YarnAnalyticsToolbarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);

  const activeFilterCount =
    (supplierId ? 1 : 0) +
    (includeDraft ? 1 : 0) +
    statuses.length +
    (dateMode !== "created" ? 1 : 0);

  const toggleStatus = (s: YarnPoStatus) => {
    if (statuses.includes(s)) {
      onStatusesChange(statuses.filter((x) => x !== s));
    } else {
      onStatusesChange([...statuses, s]);
    }
  };

  const clearAllFilters = () => {
    onSupplierSelect("", "");
    onIncludeDraftChange(false);
    onStatusesChange([]);
    onDateModeChange("created");
  };

  const fetchSuppliers = useCallback(
    async (params: { search: string; page: number; limit: number }) => {
      const res = await supplierService.getSuppliers({
        status: "active",
        brandName: params.search || undefined,
        limit: params.limit,
        page: params.page,
      });
      return {
        items: res.results.map((s) => ({
          id: s.id,
          label: s.brandName || s.id,
          subtitle: [s.city, s.state].filter(Boolean).join(", ") || undefined,
        })),
        totalPages: res.totalPages,
        totalResults: res.totalResults,
        page: res.page,
      };
    },
    []
  );

  const handleSupplierSelect = (item: PickerItem | null) => {
    if (item) {
      onSupplierSelect(item.id, item.label);
    } else {
      onSupplierSelect("", "");
    }
  };

  return (
    <div className="mb-5">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-purple-50 text-purple-600">
              <i className="ri-filter-3-line text-sm" aria-hidden />
            </div>
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[10px] font-bold text-red-600 hover:text-red-800 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label={filtersExpanded ? "Collapse filters" : "Expand filters"}
            >
              <i
                className={`ri-arrow-${filtersExpanded ? "up" : "down"}-s-line text-lg`}
                aria-hidden
              />
            </button>
          </div>
        </div>

        {/* Collapsible filter body */}
        {filtersExpanded && (
          <div className="p-3 space-y-3">
            {/* Row 1: Date mode, Supplier, Draft toggle */}
            <div className="flex flex-wrap items-end gap-4">
              {/* Date mode */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Filter POs by
                </label>
                <div
                  className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                  role="group"
                  aria-label="Date mode"
                >
                  <button
                    type="button"
                    onClick={() => onDateModeChange("created")}
                    className={`px-3.5 py-2 text-[11px] font-bold transition-all ${
                      dateMode === "created"
                        ? "bg-purple-600 text-white shadow-inner"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <i className="ri-calendar-line mr-1" aria-hidden />
                    Created date
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateModeChange("received")}
                    className={`px-3.5 py-2 text-[11px] font-bold border-l border-gray-200 transition-all ${
                      dateMode === "received"
                        ? "bg-purple-600 text-white shadow-inner"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <i className="ri-truck-line mr-1" aria-hidden />
                    Received date
                  </button>
                </div>
              </div>

              {/* Supplier picker button */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Supplier
                </label>
                <button
                  type="button"
                  onClick={() => setSupplierDrawerOpen(true)}
                  className={`flex items-center gap-2 min-w-[200px] py-2 px-3 border rounded-lg text-[11px] font-bold shadow-sm transition-all ${
                    supplierId
                      ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <i className="ri-building-line text-sm text-gray-400" aria-hidden />
                  <span className="flex-1 text-left truncate">
                    {supplierId ? supplierLabel : "All suppliers"}
                  </span>
                  <i className="ri-arrow-right-s-line text-sm text-gray-400" aria-hidden />
                </button>
              </div>

              {/* Include drafts */}
              <label className="inline-flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  checked={includeDraft}
                  onChange={(e) => onIncludeDraftChange(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500/20 w-3.5 h-3.5"
                  aria-label="Include draft purchase orders"
                />
                <span className="text-[11px] font-bold text-gray-700">Include drafts</span>
              </label>
            </div>

            {/* Row 2: Status chips */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                PO Status
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="PO status filters">
                {YARN_PO_STATUSES.map((s) => {
                  const colors = STATUS_COLORS[s] || STATUS_COLORS.draft;
                  const isActive = statuses.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        isActive ? colors.active : colors.idle
                      }`}
                      aria-pressed={isActive}
                    >
                      {isActive && <i className="ri-check-line mr-0.5 text-[10px]" aria-hidden />}
                      {s.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100">
              <Link
                href="/yarn-management/dashboard/report"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <i className="ri-table-line text-sm" aria-hidden />
                Snapshot Report
              </Link>
              <Link
                href="/yarn-management/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <i className="ri-dashboard-line text-sm" aria-hidden />
                Inventory Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      <SearchPickerDrawer
        open={supplierDrawerOpen}
        title="Select Supplier"
        icon="ri-building-2-line"
        selectedId={supplierId || null}
        onSelect={handleSupplierSelect}
        onClose={() => setSupplierDrawerOpen(false)}
        fetchItems={fetchSuppliers}
      />
    </div>
  );
}
