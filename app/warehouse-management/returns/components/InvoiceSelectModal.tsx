"use client";

import React, { useEffect, useState } from "react";
import { whmsInvoices, type WhmsInvoice } from "@/shared/services/whmsFulfilmentService";

const STATUS_BADGES: Record<string, string> = {
  final: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (invoice: WhmsInvoice) => void;
};

/**
 * Searchable, paginated invoice picker for linking a warehouse return to a billed invoice.
 */
export default function InvoiceSelectModal({ open, onClose, onSelect }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<WhmsInvoice[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [open, searchInput]);

  useEffect(() => {
    if (!open) return;
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await whmsInvoices.list({
          q: search || undefined,
          page,
          limit,
          sortBy: "createdAt:desc",
        });
        setRows(res.results || []);
        setTotalPages(res.totalPages || 1);
        setTotalResults(res.totalResults || 0);
      } catch (err) {
        console.error("Failed to load invoices", err);
        setRows([]);
        setTotalPages(1);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    };
    void fetchInvoices();
  }, [open, search, page, limit]);

  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setSearch("");
      setPage(1);
      setLimit(20);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog" aria-labelledby="invoice-select-title">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} aria-hidden="true" />
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 id="invoice-select-title" className="text-base font-semibold text-gray-900">
              Select Invoice
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Close invoice picker"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search invoice #, order #, client..."
                className="w-full form-control pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                aria-label="Search invoices"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="invoice-page-size" className="text-[11px] font-bold text-gray-600 uppercase whitespace-nowrap">
                Per page
              </label>
              <select
                id="invoice-page-size"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
                className="form-control text-[12px] py-1.5 w-20"
                aria-label="Invoices per page"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3 opacity-60" />
                <p className="text-xs text-gray-500">Loading invoices...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">No invoices found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-left">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Invoice #
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Order #
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Client
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200 text-right">
                        Qty
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Date
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                        <td className="px-3 py-2 text-[12px] font-bold text-gray-900 border border-gray-200">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">
                          {inv.orderNumber || "—"}
                          {inv.addonOrderId ? (
                            <span className="block text-[10px] text-gray-500">Addon: {inv.addonOrderId}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">
                          {inv.clientName || "—"}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-right text-gray-700 border border-gray-200">
                          {inv.totalQuantity}
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                              STATUS_BADGES[inv.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[12px] text-gray-600 border border-gray-200">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-3 py-2 text-right border border-gray-200">
                          <button
                            type="button"
                            disabled={inv.status === "cancelled"}
                            onClick={() => {
                              onSelect(inv);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <i className="ri-check-line" /> Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
            <span>
              Page {page} of {totalPages} • {totalResults} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                aria-label="Previous page"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
