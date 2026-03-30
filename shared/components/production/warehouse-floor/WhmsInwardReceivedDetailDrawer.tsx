"use client";

import React from "react";
import type { WhmsInwardReceiveRow } from "@/shared/services/whmsService";
import { isOnHoldStatus, statusBadgeClass } from "./inwardReceiveTableUtils";

export interface WhmsInwardReceivedDetailDrawerProps {
  detailId: string | null;
  detailRow: WhmsInwardReceiveRow | null;
  detailLoading: boolean;
  savingId: string | null;
  onClose: () => void;
  onHoldAccept: (row: WhmsInwardReceiveRow) => void;
  onHoldReject: (row: WhmsInwardReceiveRow) => void;
}

export default function WhmsInwardReceivedDetailDrawer({
  detailId,
  detailRow,
  detailLoading,
  savingId,
  onClose,
  onHoldAccept,
  onHoldReject,
}: WhmsInwardReceivedDetailDrawerProps) {
  if (!detailId) return null;

  const onHold = Boolean(detailRow && isOnHoldStatus(String(detailRow.status)));
  const busy = detailRow ? savingId === detailRow.id : false;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col border-l border-gray-200 animate-slide-in-right">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">Inward receive</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[10px] text-[11px] space-y-3">
          {detailLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
            </div>
          )}
          {!detailLoading && detailRow && (
            <dl className="space-y-2">
              <div className="grid grid-cols-[100px_1fr] gap-1 border-b border-gray-100 pb-2">
                <dt className="text-gray-500 font-medium">ID</dt>
                <dd className="font-mono text-[10px] break-all">{detailRow.id}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Article</dt>
                <dd className="font-semibold">{detailRow.articleNumber}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Qty factory</dt>
                <dd className="tabular-nums font-bold text-teal-800">{(detailRow.QuantityFromFactory ?? 0).toLocaleString()}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Received qty</dt>
                <dd className="tabular-nums font-bold text-gray-900">{(detailRow.receivedQuantity ?? 0).toLocaleString()}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Style</dt>
                <dd className="break-words">{detailRow.styleCode}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Brand</dt>
                <dd className="break-words">{detailRow.brand}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Status</dt>
                <dd>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(String(detailRow.status))}`}>
                    {detailRow.status}
                  </span>
                </dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Received at</dt>
                <dd>{detailRow.receivedAt ? new Date(detailRow.receivedAt).toLocaleString() : "—"}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">WH line id</dt>
                <dd className="font-mono text-[10px] break-all">{detailRow.warehouseReceivedLineId ?? "—"}</dd>
              </div>
            </dl>
          )}
          {!detailLoading && detailRow && onHold && (
            <div className="p-[10px] border-t border-gray-200 mt-2 space-y-2">
              <p className="text-[10px] text-amber-800">On hold — accept or reject this line.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onHoldAccept(detailRow)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40"
                >
                  {busy ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-check-line" />}
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onHoldReject(detailRow)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 disabled:opacity-40"
                >
                  <i className="ri-close-line" />
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
