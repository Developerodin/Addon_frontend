"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import vendorBoxService, {
  type VendorBox,
  type VendorBoxListResponse,
} from "@/shared/services/vendorBoxService";

type ViewMode = "order" | "article";

export type VendorSecondaryCheckingUpcomingTabProps = {
  refreshKey?: number;
};

interface OrderBoxGroup {
  vpoNumber: string;
  vendorPurchaseOrderId?: string;
  boxes: VendorBox[];
  totalUnits: number;
}

/**
 * Normalizes list API response to a paginated shape.
 * @param data - Raw list response
 */
function normalizeListResponse(
  data: VendorBoxListResponse | VendorBox[],
): VendorBoxListResponse {
  if (Array.isArray(data)) {
    return { results: data, page: 1, limit: data.length, totalPages: 1, totalResults: data.length };
  }
  return {
    results: data.results ?? [],
    page: data.page ?? 1,
    limit: data.limit ?? 25,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? data.results?.length ?? 0,
  };
}

/**
 * Upcoming tab — paginated boxes pending secondary checking scan-accept.
 */
export function VendorSecondaryCheckingUpcomingTab({
  refreshKey = 0,
}: VendorSecondaryCheckingUpcomingTabProps) {
  const [loading, setLoading] = useState(false);
  const [boxes, setBoxes] = useState<VendorBox[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("article");

  const loadBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorBoxService.list({
        secondaryCheckingAccepted: false,
        numberOfUnitsMin: 1,
        page,
        limit,
        sortBy: "-createdAt",
        populate: "productId",
        search: searchQuery.trim() || undefined,
      });
      const normalized = normalizeListResponse(data);
      setBoxes(normalized.results);
      setTotalPages(normalized.totalPages ?? 1);
      setTotalResults(normalized.totalResults ?? normalized.results.length);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load upcoming boxes");
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery]);

  useEffect(() => {
    loadBoxes();
  }, [loadBoxes, refreshKey]);

  const orderGroups = useMemo((): OrderBoxGroup[] => {
    const map = new Map<string, OrderBoxGroup>();
    for (const box of boxes) {
      const key = box.vpoNumber || box.vendorPurchaseOrderId || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          vpoNumber: box.vpoNumber || "—",
          vendorPurchaseOrderId: box.vendorPurchaseOrderId,
          boxes: [],
          totalUnits: 0,
        });
      }
      const group = map.get(key)!;
      group.boxes.push(box);
      group.totalUnits += box.numberOfUnits ?? 0;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.vpoNumber.localeCompare(b.vpoNumber),
    );
  }, [boxes]);

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (vpoNumber: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(vpoNumber)) next.delete(vpoNumber);
      else next.add(vpoNumber);
      return next;
    });
  };

  const boxId = (box: VendorBox) => box.id || box._id || box.boxId || "";

  return (
    <>
      <div className="p-[10px] flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
        <div className="relative w-full sm:w-72 min-w-[180px]">
          <input
            type="search"
            className="w-full bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium"
            placeholder="Search box, barcode, lot, VPO..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            aria-label="Search upcoming boxes"
          />
          <i
            className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded border border-gray-200 overflow-hidden"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              className={`px-3 py-1.5 text-[10px] font-bold transition-colors ${
                viewMode === "order"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setViewMode("order")}
            >
              By Order
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-[10px] font-bold transition-colors ${
                viewMode === "article"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setViewMode("article")}
            >
              By Article
            </button>
          </div>

          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Boxes per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>

          <button
            type="button"
            onClick={loadBoxes}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 text-[10px] font-bold rounded hover:bg-gray-50"
            aria-label="Refresh upcoming boxes"
          >
            <i className="ri-refresh-line text-xs" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Loading upcoming boxes
          </p>
        </div>
      ) : boxes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            No pending boxes
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            All boxes have been scan-accepted on secondary checking
          </p>
        </div>
      ) : viewMode === "article" ? (
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Box ID
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Barcode
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  VPO
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Product
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Lot
                </th>
                <th className="px-1.5 py-2 text-right text-[10px] font-bold uppercase border border-gray-200">
                  Units
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((box) => (
                <tr key={boxId(box)} className="hover:bg-gray-50/50">
                  <td className="px-1.5 py-2 border border-gray-200 text-[11px] font-bold text-gray-900">
                    {box.boxId || "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[10px] font-mono text-gray-600">
                    {box.barcode || "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[11px] font-bold text-purple-600">
                    {box.vpoNumber || "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[11px] text-gray-700">
                    {box.productName ||
                      (typeof box.productId === "object"
                        ? (box.productId as { name?: string })?.name
                        : undefined) ||
                      "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[10px] text-gray-500">
                    {box.lotNumber || "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-right text-[11px] font-bold">
                    {(box.numberOfUnits ?? 0).toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[10px] text-gray-500">
                    {box.createdAt
                      ? new Date(box.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 min-h-[280px]">
          {orderGroups.map((group) => {
            const expanded = expandedOrders.has(group.vpoNumber);
            return (
              <section key={group.vpoNumber}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-[10px] py-3 text-left hover:bg-gray-50/80"
                  onClick={() => toggleOrder(group.vpoNumber)}
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-2">
                    <i
                      className={`ri-arrow-${expanded ? "down" : "right"}-s-line text-gray-400`}
                      aria-hidden="true"
                    />
                    <span className="text-[12px] font-bold text-purple-600">
                      {group.vpoNumber}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">
                    {group.boxes.length} box(es) · {group.totalUnits.toLocaleString()} units
                  </span>
                </button>
                {expanded && (
                  <div className="overflow-x-auto px-[10px] pb-3">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="px-1.5 py-1.5 text-left text-[10px] font-bold uppercase border border-gray-200">
                            Box ID
                          </th>
                          <th className="px-1.5 py-1.5 text-left text-[10px] font-bold uppercase border border-gray-200">
                            Product
                          </th>
                          <th className="px-1.5 py-1.5 text-left text-[10px] font-bold uppercase border border-gray-200">
                            Lot
                          </th>
                          <th className="px-1.5 py-1.5 text-right text-[10px] font-bold uppercase border border-gray-200">
                            Units
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.boxes.map((box) => (
                          <tr key={boxId(box)} className="hover:bg-gray-50/50">
                            <td className="px-1.5 py-1.5 border border-gray-200 text-[11px] font-bold">
                              {box.boxId || box.barcode || "—"}
                            </td>
                            <td className="px-1.5 py-1.5 border border-gray-200 text-[10px]">
                              {box.productName || "—"}
                            </td>
                            <td className="px-1.5 py-1.5 border border-gray-200 text-[10px] text-gray-500">
                              {box.lotNumber || "—"}
                            </td>
                            <td className="px-1.5 py-1.5 border border-gray-200 text-right text-[11px] font-bold">
                              {(box.numberOfUnits ?? 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
        <p className="text-[11px] font-medium text-[#495057]">
          {totalResults.toLocaleString()} pending box(es)
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-[11px] font-bold text-gray-500 px-2">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
