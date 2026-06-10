"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import yarnPurchaseOrderService, {
  type QcPendingVendorReturnInfo,
} from "@/shared/services/yarnPurchaseOrderService";

type QcReturnPendingAlertsProps = {
  poNumber: string;
  /** Lot numbers already marked returned on this PO (for per-lot callouts). */
  returnedLotNumbers?: string[];
};

/**
 * Persistent QC return follow-up alerts: pending ST finalize + links to PO Return / challan history.
 */
export function QcReturnPendingAlerts({ poNumber, returnedLotNumbers = [] }: QcReturnPendingAlertsProps) {
  const [pending, setPending] = useState<QcPendingVendorReturnInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const po = poNumber?.trim();
    if (!po) {
      setPending(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void yarnPurchaseOrderService
      .getQcPendingVendorReturns(po)
      .then((info) => {
        if (!cancelled) setPending(info);
      })
      .catch(() => {
        if (!cancelled) setPending(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poNumber]);

  const poReturnBase = `/yarn-management/purchase-management/po-return?poNumber=${encodeURIComponent(poNumber)}`;
  const challanHistoryHref = "/yarn-management/purchase-management/po-return-challan";
  const hasReturnedLots = returnedLotNumbers.length > 0;
  const totalPending = pending?.totalPendingStCount ?? 0;

  if (loading) return null;

  if (!hasReturnedLots && totalPending === 0) return null;

  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {hasReturnedLots && totalPending === 0 && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[11px] text-emerald-950"
        >
          <p className="font-bold">Vendor return recorded</p>
          <p className="mt-0.5">
            Return processing is complete for this PO on QC. View{" "}
            <Link href={challanHistoryHref} className="font-semibold underline hover:text-emerald-800">
              return challans
            </Link>{" "}
            or{" "}
            <Link href={poReturnBase} className="font-semibold underline hover:text-emerald-800">
              PO Return history
            </Link>
            .
          </p>
        </div>
      )}

      {totalPending > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950"
        >
          <p className="font-bold">Action required — ST cones pending return</p>
          <p className="mt-0.5">
            <span className="font-semibold">{totalPending}</span> cone(s) in short-term storage still need
            vendor-return finalize after QC.
          </p>
          {(pending?.lots ?? []).length > 0 && (
            <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-[10px]">
              {pending!.lots.map((lot) => {
                const href = `${poReturnBase}&lot=${encodeURIComponent(lot.lotNumber)}${
                  lot.sessionId ? `&sessionId=${encodeURIComponent(lot.sessionId)}` : pending?.sessionId ? `&sessionId=${encodeURIComponent(pending.sessionId)}` : ""
                }`;
                return (
                  <li key={lot.lotNumber}>
                    Lot <span className="font-mono font-semibold">{lot.lotNumber}</span>:{" "}
                    {lot.pendingStCount} cone(s) —{" "}
                    <Link href={href} className="font-bold underline hover:text-amber-900">
                      Open PO Return
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {!pending?.lots?.length && (
            <p className="mt-1.5">
              <Link
                href={
                  pending?.sessionId
                    ? `${poReturnBase}&sessionId=${encodeURIComponent(pending.sessionId)}`
                    : poReturnBase
                }
                className="font-bold underline hover:text-amber-900"
              >
                Continue on PO Return
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
