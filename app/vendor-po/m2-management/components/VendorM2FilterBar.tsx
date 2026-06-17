"use client";

import React from "react";
import {
  VENDOR_QC_FLOOR_LABELS,
  type VendorM2SourceFloorKey,
} from "@/shared/services/vendorM2M3M4ManagementService";

const FLOOR_OPTIONS = ["", "secondaryChecking", "finalChecking"] as const;

export type VendorM2FloorFilter = (typeof FLOOR_OPTIONS)[number];

export interface VendorM2FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sourceFloor: VendorM2FloorFilter;
  onSourceFloorChange: (value: VendorM2FloorFilter) => void;
  searchPlaceholder?: string;
  showDateFilters?: boolean;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  showTypeFilter?: boolean;
  type?: string;
  typeOptions?: readonly string[];
  onTypeChange?: (value: string) => void;
}

/**
 * Shared filter row for vendor M2 Management entries and logs tabs.
 */
export default function VendorM2FilterBar({
  search,
  onSearchChange,
  sourceFloor,
  onSourceFloorChange,
  searchPlaceholder = "Search VPO, reference, entry id…",
  showDateFilters = false,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  showTypeFilter = false,
  type = "",
  typeOptions = [],
  onTypeChange,
}: VendorM2FilterBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="col-span-2 py-1.5 px-2 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
        aria-label="Search by VPO or reference"
      />
      <select
        value={sourceFloor}
        onChange={(e) => onSourceFloorChange(e.target.value as VendorM2FloorFilter)}
        className="py-1.5 px-2 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
        aria-label="Filter by source floor"
      >
        {FLOOR_OPTIONS.map((f) => (
          <option key={f || "all"} value={f}>
            {f ? VENDOR_QC_FLOOR_LABELS[f as VendorM2SourceFloorKey] : "All floors"}
          </option>
        ))}
      </select>
      {showTypeFilter && onTypeChange ? (
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          className="py-1.5 px-2 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
          aria-label="Filter by log type"
        >
          {typeOptions.map((t) => (
            <option key={t || "all"} value={t}>
              {t || "All types"}
            </option>
          ))}
        </select>
      ) : null}
      {showDateFilters && onDateFromChange && onDateToChange ? (
        <>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="py-1.5 px-2 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
            aria-label="Start date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="py-1.5 px-2 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
            aria-label="End date"
          />
        </>
      ) : null}
    </div>
  );
}
