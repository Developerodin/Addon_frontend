"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PickListOrderWiseResponse } from "../types";
import type { PickListFilters, PickListPagination } from "../pickPackApi";
import PickTable from "./PickTable";

interface PickListDashboardProps {
  orderWiseData?: PickListOrderWiseResponse | null;
  onSavePickupQty: (itemId: string, pickupQty: number) => void;
  onAlert?: (message: string) => void;
  onFilterChange?: (filters: PickListFilters) => void;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
  pagination?: PickListPagination | null;
  isLoading?: boolean;
}

const DEBOUNCE_MS = 400;

const PickListDashboard: React.FC<PickListDashboardProps> = ({
  orderWiseData,
  onSavePickupQty,
  onFilterChange,
  onPageChange,
  onRefresh,
  pagination,
  isLoading,
}) => {
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitFilter = useCallback(
    (overrides: Partial<PickListFilters>) => {
      if (!onFilterChange) return;
      const next: PickListFilters = {
        q: overrides.q ?? (searchQ.trim() || undefined),
        status: overrides.status ?? (filterStatus || undefined),
      };
      onFilterChange(next);
    },
    [onFilterChange, searchQ, filterStatus],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQ(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        emitFilter({ q: value.trim() || undefined });
      }, DEBOUNCE_MS);
    },
    [emitFilter],
  );

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setFilterStatus(value);
      emitFilter({ status: value || undefined });
    },
    [emitFilter],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const summary = useMemo(() => {
    if (orderWiseData?.summary) return orderWiseData.summary;
    return { total: 0, pending: 0, partial: 0, picked: 0 };
  }, [orderWiseData]);

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? 1;

  return (
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
      <div className="p-[10px]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Pick List</h1>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              {summary.total}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-52 min-w-[140px] placeholder:text-gray-400 transition-all font-medium"
                placeholder="Search order / SKU..."
                value={searchQ}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="picked">Picked</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60"
              >
                <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Stat cards from summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="bg-sky-50 border border-sky-100 rounded p-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wide">Total</span>
            <span className="text-sm font-bold text-sky-950">{summary.total}</span>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded p-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Pending</span>
            <span className="text-sm font-bold text-amber-950">{summary.pending}</span>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded p-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">Partial</span>
            <span className="text-sm font-bold text-orange-950">{summary.partial}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded p-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Picked</span>
            <span className="text-sm font-bold text-emerald-950">{summary.picked}</span>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap border-b border-gray-200 mt-4 -mb-px">
          {[
            { id: "", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "partial", label: "Partial" },
            { id: "picked", label: "Picked" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                filterStatus === id
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleStatusFilterChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <i className="ri-loader-4-line animate-spin text-lg text-purple-500 mb-2"></i>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Loading Data</span>
          </div>
        ) : (
          <PickTable
            orderGroups={orderWiseData?.results ?? []}
            onSave={onSavePickupQty}
          />
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 0 && (
        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <div className="text-[11px] font-medium text-[#495057] tracking-tight">
            Page <span>{currentPage}</span> of <span>{totalPages}</span>
            {pagination && (
              <span className="ml-2 opacity-50">
                ({pagination.totalResults} {pagination.totalResults === 1 ? "order" : "orders"})
              </span>
            )}
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickListDashboard;
