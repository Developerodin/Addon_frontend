"use client";

import React, { useCallback, useEffect, useState } from "react";
import { listVendors } from "@/shared/services/vendorManagementService";
import { mapVendorDocToVendor } from "../../vendor-list/vendorMappers";
import type { VendorOption } from "./VendorPOFormHeaderSection";

const ITEMS_PER_PAGE = 20;

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (vendor: VendorOption) => void;
};

/**
 * Searchable, paginated vendor picker for large vendor lists (1000+).
 */
export default function VendorPickerModal({ open, onClose, onSelect }: Props) {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const fetchVendors = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    try {
      const res = await listVendors({
        page,
        limit: ITEMS_PER_PAGE,
        sortBy: "createdAt:desc",
        search: searchQuery || undefined,
      });
      setVendors(
        res.results.map(mapVendorDocToVendor).map((v) => ({
          id: v.id,
          vendorCode: v.vendorCode,
          vendorName: v.vendorName,
        }))
      );
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch {
      setVendors([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearchInput("");
    setSearch("");
    setCurrentPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [open, searchInput]);

  useEffect(() => {
    if (!open) return;
    void fetchVendors(currentPage, search);
  }, [open, currentPage, search, fetchVendors]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const rangeStart = totalResults === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalResults);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="vendor-picker-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          className="fixed inset-0 bg-black/50 cursor-default"
          onClick={onClose}
          aria-label="Close vendor picker"
        />
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900" id="vendor-picker-modal-title">
              Select Vendor
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-[12px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                placeholder="Search by vendor code or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
                aria-label="Search vendors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3 opacity-60" />
                <p className="text-[11px] text-gray-500">Loading vendors...</p>
              </div>
            ) : vendors.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-[11px]">No vendors found</div>
            ) : (
              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                      Code
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                      Name
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                      <td className="px-3 py-2 text-[12px] font-medium text-gray-900 border border-gray-200">
                        {vendor.vendorCode}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">
                        {vendor.vendorName}
                      </td>
                      <td className="px-3 py-2 text-right border border-gray-200">
                        <button
                          type="button"
                          onClick={() => onSelect(vendor)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 transition-colors"
                        >
                          <i className="ri-check-line" />
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalResults > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 text-[11px] text-gray-600">
              <span>
                Showing {rangeStart} to {rangeEnd} of {totalResults}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  aria-label="Previous page"
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
