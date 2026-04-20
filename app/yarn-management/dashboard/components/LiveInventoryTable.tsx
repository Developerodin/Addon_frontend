"use client";
import React, { useState, useMemo } from "react";
import { YarnInventory } from "../types";

interface LiveInventoryTableProps {
  inventory: YarnInventory[];
  loading?: boolean;
  currentPage: number;
  rowsPerPage: number;
  totalPages: number;
  totalResults: number;
  searchTerm: string;
  statusFilter: string;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (limit: number) => void;
  onSearchChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onExportExcel: () => void;
  exporting?: boolean;
}

type SortField = keyof YarnInventory;
type SortDirection = "asc" | "desc";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const LiveInventoryTable: React.FC<LiveInventoryTableProps> = ({
  inventory,
  loading = false,
  currentPage,
  rowsPerPage,
  totalPages,
  totalResults,
  searchTerm,
  statusFilter,
  onPageChange,
  onRowsPerPageChange,
  onSearchChange,
  onStatusFilterChange,
  onExportExcel,
  exporting = false,
}) => {
  const [sortField, setSortField] = useState<SortField>("yarnName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Client-side sort only (filtering is server-side now)
  const sortedInventory = useMemo(() => {
    const sorted = [...inventory];
    sorted.sort((a, b) => {
      let aValue: string | number = a[sortField] as string | number;
      let bValue: string | number = b[sortField] as string | number;

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return sorted;
  }, [inventory, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <i className="ri-arrow-up-down-line text-gray-400 text-sm" />;
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-sm" />
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-sm" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /**
   * Generates page numbers to display with ellipsis
   */
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalResults);

  return (
    <div className="border-t border-gray-100">

      {/* Header with search, filters, and rows per page */}
      <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          Live Inventory
          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
            {totalResults.toLocaleString()}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
              placeholder="Search yarn name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <i className="ri-close-line text-sm"></i>
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-28"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
          </select>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 font-medium">Rows:</span>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 pr-6 focus:ring-0 focus:border-gray-300"
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            >
              {ROWS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Export Excel button */}
          <button
            type="button"
            onClick={onExportExcel}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Exporting...
              </>
            ) : (
              <>
                <i className="ri-file-excel-2-line text-sm"></i>
                Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">
              Loading Inventory...
            </p>
          </div>
        ) : sortedInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <i className="ri-inbox-line text-4xl text-gray-300 mb-2"></i>
            <p className="text-[11px] text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "No inventory items match your filters"
                : "No inventory items found"}
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onStatusFilterChange("all");
                }}
                className="mt-2 text-[10px] text-purple-600 font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th
                  className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                  onClick={() => handleSort("yarnName")}
                >
                  <div className="flex items-center gap-1.5">
                    Yarn Name
                    <SortIcon field="yarnName" />
                  </div>
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  <div>LTS (kg)</div>
                  <div className="text-[8px] font-normal text-gray-600 normal-case">= boxWeight</div>
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  <div>STS (kg)</div>
                  <div className="text-[8px] font-normal text-gray-600 normal-case">= coneWeight - tearWeight</div>
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  <div>Unallocated (kg)</div>
                  <div className="text-[8px] font-normal text-gray-600 normal-case">= boxWeight</div>
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  <div>Cones</div>
                  <div className="text-[8px] font-normal text-gray-600 normal-case">= count(ST cones)</div>
                </th>
                <th
                  className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                  onClick={() => handleSort("blockedQty")}
                >
                  <div className="flex items-center gap-1.5">
                    Blocked (kg)
                    <SortIcon field="blockedQty" />
                  </div>
                  <div className="text-[8px] font-normal text-gray-600 normal-case">= coneWeight - tearWeight</div>
                </th>
                <th
                  className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                  onClick={() => handleSort("availableQty")}
                >
                  <div className="flex items-center gap-1.5">
                    Available Qty
                    <SortIcon field="availableQty" />
                  </div>
                  <div className="text-[8px] font-normal text-gray-600 normal-case">= LTS + STS - Blocked</div>
                </th>
                <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                    <div className="text-[12px] font-bold text-gray-900">
                      {item.yarnName}
                    </div>
                    {item.lotNo && (
                      <div className="text-[10px] text-gray-500">
                        Lot: {item.lotNo}
                      </div>
                    )}
                  </td>
                  <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">
                    {item.longTermWeight.toLocaleString()} kg
                  </td>
                  <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">
                    {item.shortTermWeight.toLocaleString()} kg
                  </td>
                  <td className="px-1.5 py-2 text-[12px] border border-gray-200">
                    {item.unallocatedWeight > 0 ? (
                      <span className="text-purple-600 font-semibold">
                        {item.unallocatedWeight.toLocaleString()} kg
                      </span>
                    ) : (
                      <span className="text-gray-400">0 kg</span>
                    )}
                  </td>
                  <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">
                    {item.conesShortTerm}
                  </td>
                  <td className="px-1.5 py-2 text-[12px] border border-gray-200">
                    {item.blockedQty > 0 ? (
                      <span className="text-orange-600 font-semibold">
                        {item.blockedQty.toLocaleString()} kg
                      </span>
                    ) : (
                      <span className="text-gray-400">0 kg</span>
                    )}
                  </td>
                  <td className="px-1.5 py-2 text-[12px] border border-gray-200">
                    <span className="text-green-600 font-semibold">
                      {item.availableQty.toLocaleString()} kg
                    </span>
                  </td>
                  <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200">
                    <span
                      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && sortedInventory.length > 0 && (
        <div className="p-[10px] border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          {/* Results info */}
          <div className="text-[11px] text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-700">{startItem}</span> to{" "}
            <span className="font-bold text-gray-700">{endItem}</span> of{" "}
            <span className="font-bold text-gray-700">{totalResults.toLocaleString()}</span> results
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-1">
            {/* First page */}
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              aria-label="First page"
            >
              <i className="ri-skip-back-mini-line text-sm"></i>
            </button>

            {/* Previous page */}
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              aria-label="Previous page"
            >
              <i className="ri-arrow-left-s-line text-sm"></i>
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="w-8 h-8 flex items-center justify-center text-[11px] text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPageChange(page as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded border text-[11px] font-bold transition-colors ${
                      currentPage === page
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}

            {/* Next page */}
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              aria-label="Next page"
            >
              <i className="ri-arrow-right-s-line text-sm"></i>
            </button>

            {/* Last page */}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              aria-label="Last page"
            >
              <i className="ri-skip-forward-mini-line text-sm"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveInventoryTable;
