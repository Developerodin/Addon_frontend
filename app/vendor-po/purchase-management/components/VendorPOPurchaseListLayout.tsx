"use client";

import React from "react";
import Link from "next/link";

export type VendorPOPurchaseListLayoutProps = {
  listTitle: string;
  count: number;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  headerActions?: React.ReactNode;
  /** Extra controls on the same row as search (filters, export, etc.) */
  filterSlot?: React.ReactNode;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearDates: () => void;
  children: React.ReactNode;
};

/**
 * Shared shell for Vendor PO Raise / Receive list pages — matches yarn Purchase Order / PO Received compact UI.
 */
export default function VendorPOPurchaseListLayout({
  listTitle,
  count,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  headerActions,
  filterSlot,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDates,
  children,
}: VendorPOPurchaseListLayoutProps) {
  return (
    <div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                <Link
                  href="/vendor-po/purchase-management"
                  className="text-purple-600 hover:text-purple-800"
                >
                  Purchase Management
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600 truncate">{listTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
                <h1 className="text-sm font-bold text-gray-800">{listTitle}</h1>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {count}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xl">
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  input.vendor-po-list-search:focus {
                    border-width: 2px !important;
                    border-color: #4b5563 !important;
                    outline: none !important;
                    box-shadow: none !important;
                  }
                `,
                }}
              />
              <input
                type="text"
                className="vendor-po-list-search w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            </div>
            {filterSlot}
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex">
              <button
                type="button"
                className="px-3 py-2 border-b-2 border-transparent text-gray-800 text-[11px] font-bold relative"
              >
                All
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />
              </button>
            </div>
            <div className="flex items-center gap-3 pr-1">
              <div className="flex items-center gap-1.5 bg-gray-50/50 px-2 py-1 rounded border border-gray-100 border-dashed">
                <i className="ri-calendar-line text-[10px] text-gray-400" />
                <input
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold text-gray-600 p-0 outline-none w-24 cursor-pointer"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
                <span className="text-gray-300 text-[10px]">~</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold text-gray-600 p-0 outline-none w-24 cursor-pointer"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={onClearDates}
                  className="text-[9px] text-purple-400 hover:text-purple-600 font-bold uppercase transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[200px]">{children}</div>
      </div>
    </div>
  );
}
