"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";

type DraftPurchaseOrderViewModalProps = {
  /** Mongo id of the PO to load; `null` keeps the modal closed. */
  orderId: string | null;
  /** Called when the user dismisses the modal. */
  onClose: () => void;
};

type LineRow = {
  yarnName: string;
  qty: number;
  rate: number;
  subTotal: number;
};

/**
 * Maps a loose API PO payload into line rows for the read-only preview table.
 * @param api - Raw purchase order from `getPurchaseOrderById`.
 */
function poItemsToLineRows(api: Record<string, unknown>): LineRow[] {
  const raw = (api.poItems ?? api.items ?? api.orderItems ?? []) as unknown[];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const it = item as Record<string, unknown>;
    const yarnName =
      String(it.yarnName ?? (it.yarn as { yarnName?: string })?.yarnName ?? it.yarn_name ?? "Yarn");
    const qty = Number(it.quantity ?? it.qty ?? 0);
    const rate = Number(it.rate ?? it.unitPrice ?? 0);
    const subTotal = Number(
      it.subTotal ?? it.sub_total ?? (qty * rate || 0)
    );
    return { yarnName, qty, rate, subTotal };
  });
}

/**
 * Read-only summary dialog for a draft yarn PO opened from the Draft POs hub.
 */
export function DraftPurchaseOrderViewModal({
  orderId,
  onClose,
}: DraftPurchaseOrderViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await yarnPurchaseOrderService.getPurchaseOrderById(
          orderId
        )) as unknown as Record<string, unknown>;
        if (!cancelled) {
          setDetail(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load purchase order"
          );
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) {
    return null;
  }

  const lines = detail ? poItemsToLineRows(detail) : [];
  const poNumber = detail
    ? String(
        detail.poNumber ??
          detail.orderNumber ??
          detail.po_number ??
          "—"
      )
    : "—";
  const supplier = detail
    ? String(
        detail.supplierName ??
          (detail.supplier as { brandName?: string })?.brandName ??
          (detail.supplier as { name?: string })?.name ??
          "—"
      )
    : "—";
  const subTotal = detail ? Number(detail.subTotal ?? detail.sub_total ?? 0) : 0;
  const gst = detail ? Number(detail.gst ?? detail.totalGst ?? 0) : 0;
  const total = detail ? Number(detail.total ?? detail.totalAmount ?? 0) : 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-po-view-title"
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3 bg-gray-50/80">
          <div>
            <h2
              id="draft-po-view-title"
              className="text-sm font-bold text-gray-900"
            >
              Draft PO preview
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {poNumber} · {supplier}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
            aria-label="Close preview"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto flex-1 text-[11px]">
          {loading ? (
            <div className="flex justify-center py-10">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"
                role="status"
                aria-label="Loading order"
              />
            </div>
          ) : error ? (
            <p className="text-red-600 font-medium">{error}</p>
          ) : (
            <>
              {lines.length === 0 ? (
                <p className="text-gray-500">No line items on this draft.</p>
              ) : (
                <table className="w-full border border-gray-100 rounded text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th scope="col" className="px-2 py-1.5">
                        Yarn
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-right">
                        Qty
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-right">
                        Rate
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((row, i) => (
                      <tr key={`${row.yarnName}-${i}`} className="text-gray-900">
                        <td className="px-2 py-1.5 font-medium">{row.yarnName}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {row.qty}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {row.rate.toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {row.subTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-0.5 text-right text-gray-700">
                <div>
                  <span className="text-gray-500">Subtotal: </span>
                  <span className="tabular-nums font-semibold">
                    {subTotal.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">GST: </span>
                  <span className="tabular-nums font-semibold">
                    {gst.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total: </span>
                  <span className="tabular-nums font-bold text-gray-900">
                    {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap justify-end gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-200 text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            Close
          </button>
          <Link
            href={`/yarn-management/purchase-management/purchase/edit/${orderId}?fromDraftQueue=1`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            onClick={onClose}
          >
            <i className="ri-pencil-line text-xs" aria-hidden />
            Open in editor
          </Link>
        </div>
      </div>
    </div>
  );
}
