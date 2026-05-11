"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import { DraftPurchaseOrderViewModal } from "./DraftPurchaseOrderViewModal";

type DraftPoSummaryRow = {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  lineCount: number;
  total: number;
};

type HubTab = "draft" | "history";

/** Normalizes yarn PO docs from list APIs into grouped table rows. */
function mapApiOrderToDraftPoSummary(
  apiOrder: Record<string, unknown>
): DraftPoSummaryRow | null {
  const id = String(apiOrder._id ?? apiOrder.id ?? "");
  if (!id) {
    return null;
  }
  const poItems = (apiOrder.poItems ?? apiOrder.items ?? apiOrder.orderItems ?? []) as unknown[];
  const lineCount = Array.isArray(poItems) ? poItems.length : 0;
  const supplier =
    String(
      apiOrder.supplierName ??
        (apiOrder.supplier as { brandName?: string } | undefined)?.brandName ??
        (apiOrder.supplier as { name?: string } | undefined)?.name ??
        ""
    ) || "—";

  return {
    id,
    orderNumber: String(
      apiOrder.poNumber ?? apiOrder.orderNumber ?? apiOrder.po_number ?? ""
    ),
    supplier,
    orderDate: String(
      apiOrder.createDate ??
        apiOrder.orderDate ??
        apiOrder.createdAt ??
        apiOrder.created_at ??
        ""
    ),
    lineCount,
    total: Number(apiOrder.total ?? apiOrder.totalAmount ?? apiOrder.grandTotal ?? 0),
  };
}

/** ISO query window for exhaustive PO lookups (years). */
function getDraftPoQueryDateBounds(): { start_date: string; end_date: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);
  start.setHours(0, 0, 0, 0);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

const formatPoDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

/**
 * Hub for drafting yarn POs; draft tab groups open buckets by supplier, history showcases recently submitted drafts.
 */
export default function DraftPOsPage() {
  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission(
    "/yarn-management/purchase-management",
    "Draft POs"
  );

  const [hubTab, setHubTab] = useState<HubTab>("draft");
  const [draftPoRows, setDraftPoRows] = useState<DraftPoSummaryRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [viewModalOrderId, setViewModalOrderId] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [debouncedSupplierFilter, setDebouncedSupplierFilter] = useState("");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSupplierFilter(supplierFilter.trim()), 300);
    return () => clearTimeout(t);
  }, [supplierFilter]);

  const fetchRows = useCallback(async () => {
    setListLoading(true);
    try {
      const { start_date, end_date } = getDraftPoQueryDateBounds();
      const status_code =
        hubTab === "draft" ? "draft" : "submitted_to_supplier";
      const raw = await yarnPurchaseOrderService.getPurchaseOrders({
        status_code,
        start_date,
        end_date,
      });
      const ordersData = Array.isArray(raw) ? raw : raw.results ?? [];
      const mapped = ordersData
        .map((o) => mapApiOrderToDraftPoSummary(o as Record<string, unknown>))
        .filter((r): r is DraftPoSummaryRow => r !== null);
      setDraftPoRows(mapped);
    } catch (err) {
      console.error("[DraftPOsPage] list failed", err);
      toast.error("Could not load purchase orders");
      setDraftPoRows([]);
    } finally {
      setListLoading(false);
    }
  }, [hubTab]);

  useEffect(() => {
    if (!canAccess || isLoading) return;
    void fetchRows();
  }, [canAccess, isLoading, fetchRows]);

  const scopedRows = useMemo(() => {
    const trimmed = debouncedSupplierFilter.toLowerCase();
    const base =
      trimmed.length === 0
        ? draftPoRows
        : draftPoRows.filter((row) =>
            row.supplier.toLowerCase().includes(trimmed)
          );
    return [...base].sort((a, b) => {
      const ta = new Date(a.orderDate).getTime();
      const tb = new Date(b.orderDate).getTime();
      if (sortNewestFirst) return tb - ta;
      return ta - tb;
    });
  }, [draftPoRows, debouncedSupplierFilter, sortNewestFirst]);

  const supplierGroups = useMemo(() => {
    const bucket = new Map<string, DraftPoSummaryRow[]>();
    for (const row of scopedRows) {
      const key = row.supplier.trim() || "—";
      const next = bucket.get(key) ?? [];
      next.push(row);
      bucket.set(key, next);
    }
    return [...bucket.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
    );
  }, [scopedRows]);

  if (isLoading) {
    return (
      <div className="main-content flex justify-center items-center py-16">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="main-content">
        <Seo title="Draft POs" />
        <div className="box border border-gray-100">
          <div className="box-body text-center py-12">
            <p className="text-sm text-gray-600">
              You don&apos;t have permission to access Draft POs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Draft POs" />
      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <div className="min-w-[240px]">
            <h1 className="text-sm font-bold text-gray-900">Draft PO workspace</h1>
            <p className="text-[11px] text-gray-500 mt-1 max-w-xl">
              Open drafts consolidate per supplier until they are submitted — use New purchase order after
              choosing the vendor gate so yarns stage into the matching bucket automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <div
              className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5"
              role="tablist"
              aria-label="Draft PO tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={hubTab === "draft"}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  hubTab === "draft"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setHubTab("draft")}
              >
                Draft
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={hubTab === "history"}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  hubTab === "history"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setHubTab("history")}
              >
                Recent submitted
              </button>
            </div>
            <Link
              href="/yarn-management/purchase-management/purchase/add?fromDraftQueue=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              aria-label="Start new draft purchase order from queue"
            >
              <i className="ri-draft-line text-xs" aria-hidden />
              New staged PO
            </Link>
            <Link
              href="/yarn-management/purchase-management/requisition-list"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50"
            >
              <i className="ri-list-check text-xs" aria-hidden />
              Requisition list
            </Link>
            <Link
              href="/yarn-management/purchase-management/purchase"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50"
            >
              <i className="ri-file-list-line text-xs" aria-hidden />
              All POs
            </Link>
          </div>
        </div>

        <div className="box-body px-4 py-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <input
                type="text"
                className="w-full border border-gray-200 rounded-md pl-8 pr-2 py-1.5 text-[11px] focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                placeholder="Filter supplier..."
                aria-label="Filter rows by supplier name"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              />
              <i className="ri-building-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] font-medium text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={sortNewestFirst}
                onChange={(e) => setSortNewestFirst(e.target.checked)}
              />
              Newest first
            </label>
          </div>

          {listLoading ? (
            <div className="flex justify-center py-12">
              <div
                className="animate-spin rounded-full h-9 w-9 border-b-2 border-purple-600"
                role="status"
                aria-label="Loading draft purchase orders"
              />
            </div>
          ) : scopedRows.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-800">Nothing matches this slice</p>
              <p className="text-[12px] text-gray-500 mt-1">
                Adjust filters or revisit the procurement queue from Requisition list.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {supplierGroups.map(([supplierName, rows]) => (
                <section
                  key={`${hubTab}-${supplierName}`}
                  aria-labelledby={`supplier-heading-${encodeURIComponent(supplierName)}`}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-3">
                    <h2
                      id={`supplier-heading-${encodeURIComponent(supplierName)}`}
                      className="text-[12px] font-bold text-gray-900 truncate"
                    >
                      {supplierName}
                    </h2>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      {rows.length} PO{rows.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[11px]">
                      <thead className="bg-white text-gray-600 font-bold uppercase tracking-wide border-b border-gray-100">
                        <tr>
                          <th scope="col" className="px-3 py-2">
                            PO #
                          </th>
                          <th scope="col" className="px-3 py-2">
                            Date
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Lines
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Total
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((po) => (
                          <tr key={po.id} className="hover:bg-gray-50/80">
                            <td className="px-3 py-2 font-mono font-semibold text-gray-900">
                              {po.orderNumber || "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600 tabular-nums">
                              {formatPoDate(po.orderDate)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{po.lineCount}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {po.total.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewModalOrderId(po.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 text-gray-800 text-[10px] font-bold rounded hover:bg-gray-50"
                                  aria-label={`View draft PO ${po.orderNumber || po.id}`}
                                >
                                  <i className="ri-eye-line text-xs" aria-hidden />
                                  View
                                </button>
                                <Link
                                  href={`/yarn-management/purchase-management/purchase/edit/${po.id}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 border border-purple-200 text-purple-700 text-[10px] font-bold rounded hover:bg-purple-50"
                                  aria-label={`Edit draft PO ${po.orderNumber || po.id}`}
                                >
                                  <i className="ri-pencil-line text-xs" aria-hidden />
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <DraftPurchaseOrderViewModal
          orderId={viewModalOrderId}
          onClose={() => setViewModalOrderId(null)}
        />
      </div>
    </div>
  );
}
