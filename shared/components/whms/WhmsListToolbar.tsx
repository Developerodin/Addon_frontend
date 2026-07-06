"use client";

import React from "react";

export interface WhmsListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  showDates?: boolean;
}

/**
 * Shared filter toolbar for WHMS stage pages (search, dates, page size, optional status).
 */
export default function WhmsListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search order #, client…",
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  limit,
  onLimitChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  showDates = true,
}: WhmsListToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="flex-1 min-w-[180px] max-w-xs">
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search</label>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="form-control w-full text-[12px]"
          aria-label="Search orders"
        />
      </div>
      {showDates && onDateFromChange && onDateToChange ? (
        <>
          <div className="w-36">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="form-control w-full text-[12px]"
              aria-label="Date from"
            />
          </div>
          <div className="w-36">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="form-control w-full text-[12px]"
              aria-label="Date to"
            />
          </div>
        </>
      ) : null}
      {statusOptions && onStatusFilterChange ? (
        <div className="w-40">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
          <select
            value={statusFilter ?? ""}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-control w-full text-[12px]"
            aria-label="Filter by status"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="w-24">
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Per page</label>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="form-control w-full text-[12px]"
          aria-label="Results per page"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}
