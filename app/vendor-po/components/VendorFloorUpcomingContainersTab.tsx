"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  containersMasterService,
  type ContainerActiveItem,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";
import {
  getVendorActiveItems,
  isVendorPipelineContainer,
} from "../utils/vendorContainerItems";

type ViewMode = "order" | "article";

export type VendorFloorUpcomingContainersTabProps = {
  /** Must match container `activeFloor` (e.g. "Branding", "Final Checking"). */
  floorName: string;
  refreshKey?: number;
};

interface UpcomingLineRow {
  container: ContainerMaster;
  qty: number;
  vpoNumber: string;
  productLabel: string;
  refCode: string;
}

interface OrderContainerGroup {
  vpoNumber: string;
  rows: UpcomingLineRow[];
  totalUnits: number;
}

type VendorFlowPopulated = {
  referenceCode?: string;
  vendorPurchaseOrder?: { vpoNumber?: string } | string;
  product?: { name?: string } | string;
};

/**
 * Resolves display label for a vendor active item's product/reference.
 * @param item - Vendor pipeline active item row
 */
function resolveProductLabel(item: ContainerActiveItem): string {
  const flow = item.vendorProductionFlow;
  if (flow && typeof flow === "object") {
    const populated = flow as VendorFlowPopulated;
    if (typeof populated.product === "object" && populated.product?.name) {
      return populated.product.name;
    }
    if (populated.referenceCode?.trim()) return populated.referenceCode.trim();
  }
  return "—";
}

/**
 * Resolves reference code from populated vendor production flow on item.
 * @param item - Vendor pipeline active item row
 */
function resolveRefCode(item: ContainerActiveItem): string {
  const flow = item.vendorProductionFlow;
  if (flow && typeof flow === "object") {
    const ref = (flow as VendorFlowPopulated).referenceCode?.trim();
    if (ref) return ref;
  }
  return "—";
}

/**
 * Resolves VPO number from populated vendor production flow on item.
 * @param item - Vendor pipeline active item row
 */
function resolveVpoNumber(item: ContainerActiveItem): string {
  const flow = item.vendorProductionFlow;
  if (flow && typeof flow === "object") {
    const vpo = (flow as VendorFlowPopulated).vendorPurchaseOrder;
    if (typeof vpo === "object" && vpo?.vpoNumber?.trim()) {
      return vpo.vpoNumber.trim();
    }
  }
  return "—";
}

/**
 * Flattens vendor-pipeline containers into line rows for upcoming display.
 * @param containers - Containers on floor (vendor pipeline only)
 */
function flattenContainerLines(containers: ContainerMaster[]): UpcomingLineRow[] {
  const rows: UpcomingLineRow[] = [];

  for (const container of containers) {
    for (const item of getVendorActiveItems(container)) {
      rows.push({
        container,
        qty: item.quantity ?? 0,
        vpoNumber: resolveVpoNumber(item),
        productLabel: resolveProductLabel(item),
        refCode: resolveRefCode(item),
      });
    }
  }

  return rows;
}

/**
 * Upcoming tab — ACTIVE vendor PO containers on a floor pending accept/process.
 */
export function VendorFloorUpcomingContainersTab({
  floorName,
  refreshKey = 0,
}: VendorFloorUpcomingContainersTabProps) {
  const [loading, setLoading] = useState(false);
  const [containers, setContainers] = useState<ContainerMaster[]>([]);
  const [containerCount, setContainerCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("article");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const loadContainers = useCallback(async () => {
    if (!floorName.trim()) return;
    setLoading(true);
    try {
      const data = await containersMasterService.getByFloorWithArticles(
        floorName.trim(),
        { status: "Active", contentDomain: "vendor" },
      );
      const vendorContainers = (data.containers ?? []).filter(
        isVendorPipelineContainer,
      );
      setContainers(vendorContainers);
      setContainerCount(vendorContainers.length);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load upcoming containers",
      );
      setContainers([]);
      setContainerCount(0);
    } finally {
      setLoading(false);
    }
  }, [floorName]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers, refreshKey]);

  const allRows = useMemo(
    () => flattenContainerLines(containers),
    [containers],
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((row) => {
      const name = row.container.containerName?.toLowerCase() || "";
      const barcode = row.container.barcode?.toLowerCase() || "";
      return (
        name.includes(q) ||
        barcode.includes(q) ||
        row.vpoNumber.toLowerCase().includes(q) ||
        row.productLabel.toLowerCase().includes(q) ||
        row.refCode.toLowerCase().includes(q)
      );
    });
  }, [allRows, searchQuery]);

  const orderGroups = useMemo((): OrderContainerGroup[] => {
    const map = new Map<string, OrderContainerGroup>();
    for (const row of filteredRows) {
      const key = row.vpoNumber || "—";
      if (!map.has(key)) {
        map.set(key, { vpoNumber: key, rows: [], totalUnits: 0 });
      }
      const group = map.get(key)!;
      group.rows.push(row);
      group.totalUnits += row.qty;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.vpoNumber.localeCompare(b.vpoNumber),
    );
  }, [filteredRows]);

  const toggleOrder = (vpoNumber: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(vpoNumber)) next.delete(vpoNumber);
      else next.add(vpoNumber);
      return next;
    });
  };

  const rowKey = (row: UpcomingLineRow, idx: number) =>
    `${row.container._id ?? row.container.barcode}-${idx}`;

  /** Export filtered upcoming container lines as CSV (Excel-compatible). */
  const handleExportExcel = () => {
    if (filteredRows.length === 0) return;
    const header = [
      "Container",
      "Barcode",
      "VPO",
      "Product",
      "Ref",
      "Qty",
      "Status",
      "Floor",
    ];
    const lines = filteredRows.map((row) => [
      row.container.containerName ?? "",
      row.container.barcode ?? "",
      row.vpoNumber,
      row.productLabel,
      row.refCode,
      String(row.qty),
      row.container.status ?? "",
      floorName,
    ]);
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeFloor = floorName.trim().toLowerCase().replace(/\s+/g, "_");
    a.download = `vendor_upcoming_${safeFloor || "floor"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="p-[10px] flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
        <div className="relative w-full sm:w-72 min-w-[180px]">
          <input
            type="search"
            className="w-full bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium"
            placeholder="Search container, barcode, VPO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search upcoming containers"
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

          <button
            type="button"
            onClick={loadContainers}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 text-[10px] font-bold rounded hover:bg-gray-50"
            aria-label="Refresh upcoming containers"
          >
            <i className="ri-refresh-line text-xs" aria-hidden="true" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-300 text-[10px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
            title="Download filtered rows as CSV"
            aria-label="Export upcoming containers to Excel"
          >
            <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden="true" />
            Download Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Loading upcoming containers
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            No vendor PO containers
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            No ACTIVE vendor PO containers on {floorName}
          </p>
        </div>
      ) : viewMode === "article" ? (
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Container
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Barcode
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  VPO
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Product / Ref
                </th>
                <th className="px-1.5 py-2 text-right text-[10px] font-bold uppercase border border-gray-200">
                  Qty
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold uppercase border border-gray-200">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={rowKey(row, idx)} className="hover:bg-gray-50/50">
                  <td className="px-1.5 py-2 border border-gray-200 text-[11px] font-bold text-gray-900">
                    {row.container.containerName ?? "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[10px] font-mono text-gray-600">
                    {row.container.barcode || "—"}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[11px] font-bold text-purple-600">
                    {row.vpoNumber}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[11px] text-gray-700">
                    <div>{row.productLabel}</div>
                    {row.refCode !== "—" && (
                      <div className="text-[10px] text-gray-400">{row.refCode}</div>
                    )}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-right text-[11px] font-bold">
                    {row.qty.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-200 text-[10px] text-gray-500">
                    {row.container.status ?? "—"}
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
                  aria-label={`Toggle order ${group.vpoNumber}`}
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
                    {group.rows.length} line(s) · {group.totalUnits.toLocaleString()} units
                  </span>
                </button>
                {expanded && (
                  <div className="overflow-x-auto px-[10px] pb-3">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="px-1.5 py-1.5 text-left text-[10px] font-bold uppercase border border-gray-200">
                            Container
                          </th>
                          <th className="px-1.5 py-1.5 text-left text-[10px] font-bold uppercase border border-gray-200">
                            Product / Ref
                          </th>
                          <th className="px-1.5 py-1.5 text-right text-[10px] font-bold uppercase border border-gray-200">
                            Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, idx) => (
                          <tr key={rowKey(row, idx)} className="hover:bg-gray-50/50">
                            <td className="px-1.5 py-1.5 border border-gray-200 text-[11px] font-bold">
                              {row.container.containerName ?? row.container.barcode ?? "—"}
                            </td>
                            <td className="px-1.5 py-1.5 border border-gray-200 text-[10px]">
                              {row.productLabel}
                              {row.refCode !== "—" ? ` · ${row.refCode}` : ""}
                            </td>
                            <td className="px-1.5 py-1.5 border border-gray-200 text-right text-[11px] font-bold">
                              {row.qty.toLocaleString()}
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
          {containerCount.toLocaleString()} vendor PO container(s)
          {filteredRows.length !== allRows.length
            ? ` · ${filteredRows.length} line(s) shown`
            : null}
        </p>
      </div>
    </>
  );
}
