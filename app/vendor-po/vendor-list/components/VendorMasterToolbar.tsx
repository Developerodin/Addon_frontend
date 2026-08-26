"use client";
import React, { RefObject } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { downloadVendorBulkExcelTemplate } from "../vendorBulkImportExcel";

type VendorStatusFilter = "" | "active" | "inactive";

export type VendorMasterToolbarProps = {
  totalResults: number;
  showFilters: boolean;
  hasActiveFilters: boolean;
  searchQuery: string;
  statusFilter: VendorStatusFilter;
  vendorCodeFilter: string;
  cityFilter: string;
  stateFilter: string;
  bulkImporting: boolean;
  bulkFileRef: RefObject<HTMLInputElement | null>;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: VendorStatusFilter) => void;
  onVendorCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onBulkFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Vendor Master title row, search, bulk actions, and optional filter panel.
 */
const VendorMasterToolbar = ({
  totalResults,
  showFilters,
  hasActiveFilters,
  searchQuery,
  statusFilter,
  vendorCodeFilter,
  cityFilter,
  stateFilter,
  bulkImporting,
  bulkFileRef,
  onToggleFilters,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onVendorCodeChange,
  onCityChange,
  onStateChange,
  onBulkFileChange,
}: VendorMasterToolbarProps) => {
  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
          <h1 className="text-sm font-bold text-gray-800">Vendor Master</h1>
          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            {totalResults}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
              showFilters
                ? "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
            onClick={onToggleFilters}
          >
            <i className="ri-filter-3-line text-xs" />
            Filters
            {hasActiveFilters && <span className="text-[10px]">●</span>}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border bg-white text-red-500 border-red-100 hover:bg-red-50 transition-colors"
              onClick={onClearFilters}
            >
              <i className="ri-close-line text-xs" />
              Clear
            </button>
          )}
          <div className="relative w-full sm:w-72 min-w-[200px]">
            <input
              type="text"
              className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
              placeholder="Search (name, code, GSTIN, address, notes)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search vendors"
            />
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
          </div>
          <button
            type="button"
            onClick={() => {
              downloadVendorBulkExcelTemplate();
              toast.success("Template downloaded");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
          >
            <i className="ri-file-download-line text-xs" />
            Template
          </button>
          <input
            ref={bulkFileRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={onBulkFileChange}
            aria-label="Bulk import vendors Excel file"
          />
          <button
            type="button"
            disabled={bulkImporting}
            onClick={() => bulkFileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {bulkImporting ? (
              <>
                <i className="ri-loader-4-line text-xs animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <i className="ri-file-excel-2-line text-xs" />
                Bulk Import
              </>
            )}
          </button>
          <Link
            href="/vendor-po/vendor-list/add"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
          >
            <i className="ri-add-line text-xs" />
            Add Vendor
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="rounded border border-gray-200 bg-gray-50/80 p-[10px] mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-semibold text-gray-600" htmlFor="vendor-status-filter">
                Status
              </label>
              <select
                id="vendor-status-filter"
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                value={statusFilter}
                onChange={(e) => onStatusChange((e.target.value as VendorStatusFilter) || "")}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-[11px] font-semibold text-gray-600" htmlFor="vendor-code-filter">
                Vendor code (exact)
              </label>
              <input
                id="vendor-code-filter"
                type="text"
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                value={vendorCodeFilter}
                onChange={(e) => onVendorCodeChange(e.target.value)}
                placeholder="VND001"
              />
            </div>
            <div>
              <label className="block mb-1 text-[11px] font-semibold text-gray-600" htmlFor="vendor-city-filter">
                City
              </label>
              <input
                id="vendor-city-filter"
                type="text"
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                value={cityFilter}
                onChange={(e) => onCityChange(e.target.value)}
                placeholder="Partial match"
              />
            </div>
            <div>
              <label className="block mb-1 text-[11px] font-semibold text-gray-600" htmlFor="vendor-state-filter">
                State
              </label>
              <input
                id="vendor-state-filter"
                type="text"
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                value={stateFilter}
                onChange={(e) => onStateChange(e.target.value)}
                placeholder="Partial match"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorMasterToolbar;
