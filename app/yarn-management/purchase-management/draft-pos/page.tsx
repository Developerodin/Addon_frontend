"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
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

/**
 * Normalizes a purchase-order list API record for the draft PO table.
 * @param apiOrder - Raw order from `getPurchaseOrders`.
 */
function mapApiOrderToDraftPoSummary(
  apiOrder: Record<string, unknown>
): DraftPoSummaryRow | null {
  const id = String(apiOrder._id ?? apiOrder.id ?? "");
  if (!id) {
    return null;
  }
  const poItems = (
    apiOrder.poItems ?? apiOrder.items ?? apiOrder.orderItems ??
    []
  ) as unknown[];
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
    total: Number(
      apiOrder.total ?? apiOrder.totalAmount ?? apiOrder.grandTotal ?? 0
    ),
  };
}

const formatPoDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

/**
 * Builds ISO bounds for yarn PO list API (required query params).
 * Uses a wide window so draft POs are not filtered out by an implicit range.
 */
function getDraftPoQueryDateBounds(): { start_date: string; end_date: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);
  start.setHours(0, 0, 0, 0);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

/**
 * Hub for saved draft yarn POs. Queued requisition yarns load on the add PO screen
 * via `New draft purchase order` (`?fromDraftQueue=1`), not on this page.
 */
export default function DraftPOsPage() {
  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission(
    "/yarn-management/purchase-management",
    "Draft POs"
  );

  const [draftPoRows, setDraftPoRows] = useState<DraftPoSummaryRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [viewModalOrderId, setViewModalOrderId] = useState<string | null>(null);

  const fetchDraftPos = useCallback(async () => {
    setListLoading(true);
    try {
      const { start_date, end_date } = getDraftPoQueryDateBounds();
      const raw = await yarnPurchaseOrderService.getPurchaseOrders({
        status_code: "draft",
        start_date,
        end_date,
      });
      const ordersData = Array.isArray(raw) ? raw : raw.results ?? [];
      const mapped = ordersData
        .map((o) => mapApiOrderToDraftPoSummary(o as Record<string, unknown>))
        .filter((r): r is DraftPoSummaryRow => r !== null);
      setDraftPoRows(mapped);
    } catch (err) {
      console.error("[DraftPOsPage] draft PO list failed", err);
      toast.error("Could not load draft purchase orders");
      setDraftPoRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess || isLoading) {
      return;
    }
    fetchDraftPos();
  }, [canAccess, isLoading, fetchDraftPos]);

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
        <div className="box-header flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Draft POs</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Saved draft POs stay here (not under All POs).{" "}
              <span className="font-medium text-gray-700">
                New draft purchase order
              </span>{" "}
              opens the form and preloads yarns from the requisition queue when any are
              staged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/yarn-management/purchase-management/purchase/add?fromDraftQueue=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              title="Opens add PO with yarns from the requisition draft queue when available"
              aria-label="New purchase order from draft queue"
            >
              <i className="ri-draft-line text-xs" aria-hidden />
              New draft purchase order
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

        <div className="box-body px-4 py-4">
          {listLoading ? (
            <div className="flex justify-center py-12">
              <div
                className="animate-spin rounded-full h-9 w-9 border-b-2 border-purple-600"
                role="status"
                aria-label="Loading draft purchase orders"
              />
            </div>
          ) : (
            <>
              {draftPoRows.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-600">
                  <p className="font-medium text-gray-800">
                    No saved draft POs yet
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1 max-w-md mx-auto">
                    Use{" "}
                    <span className="font-medium text-gray-700">
                      New draft purchase order
                    </span>{" "}
                    to start from queued requisitions (or add lines manually), then save
                    as draft—those POs will show in this list.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-md">
                  <table className="min-w-full text-left text-[11px]">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wide">
                      <tr>
                        <th scope="col" className="px-3 py-2">
                          PO #
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Supplier
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
                      {draftPoRows.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2 font-mono font-semibold text-gray-900">
                            {po.orderNumber || "—"}
                          </td>
                          <td
                            className="px-3 py-2 text-gray-800 max-w-[200px] truncate"
                            title={po.supplier}
                          >
                            {po.supplier}
                          </td>
                          <td className="px-3 py-2 text-gray-600 tabular-nums">
                            {formatPoDate(po.orderDate)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {po.lineCount}
                          </td>
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
              )}
            </>
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
