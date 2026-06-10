"use client";

import Link from "next/link";
import React from "react";
import type { QcVendorReturnResult } from "@/shared/services/yarnPurchaseOrderService";

type QcVendorReturnResultLinksProps = {
  poNumber: string;
  lotNumber?: string;
  result: QcVendorReturnResult;
};

/**
 * Renders a challan link when a challan id/number is present.
 */
function ChallanLink({
  challanId,
  challanNumber,
}: {
  challanId: string | null;
  challanNumber: string | null | undefined;
}) {
  if (!challanNumber) return null;
  if (challanId) {
    return (
      <Link
        href={`/yarn-management/purchase-management/po-return-challan/${encodeURIComponent(challanId)}`}
        className="font-mono font-bold underline hover:text-emerald-800"
      >
        {challanNumber}
      </Link>
    );
  }
  return <span className="font-mono font-bold">{challanNumber}</span>;
}

/**
 * Post-QC-return summary with challan and PO Return deep links.
 */
export function QcVendorReturnResultLinks({ poNumber, lotNumber, result }: QcVendorReturnResultLinksProps) {
  const poReturnParams = new URLSearchParams({ poNumber });
  if (lotNumber?.trim()) poReturnParams.set("lot", lotNumber.trim());
  if (result.sessionId) poReturnParams.set("sessionId", result.sessionId);
  const poReturnHref = `/yarn-management/purchase-management/po-return?${poReturnParams.toString()}`;

  const boxChallanNumber =
    (result.boxChallan as { challanNumber?: string } | null | undefined)?.challanNumber ??
    (result.autoReturnedBoxCount > 0 ? result.challanNumber : null);
  const boxChallanId =
    (result.boxChallan as { id?: string; _id?: string } | null | undefined)?.id ??
    (result.boxChallan as { _id?: string } | null | undefined)?._id?.toString?.() ??
    (result.autoReturnedBoxCount > 0 && !result.coneChallan ? result.challanId : null);

  const coneChallanNumber =
    (result.coneChallan as { challanNumber?: string } | null | undefined)?.challanNumber ??
    (result.autoReturnedCount > 0 && !result.boxChallan ? result.challanNumber : null);
  const coneChallanId =
    (result.coneChallan as { id?: string; _id?: string } | null | undefined)?.id ??
    (result.coneChallan as { _id?: string } | null | undefined)?._id?.toString?.() ??
    (result.autoReturnedCount > 0 && !result.boxChallan ? result.challanId : null);

  const hasAutoReturn = result.autoReturnedBoxCount > 0 || result.autoReturnedCount > 0;

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-950 space-y-1.5">
      {result.autoReturnedBoxCount > 0 && (
        <p>
          <span className="font-semibold">{result.autoReturnedBoxCount}</span> closed box(es) returned
          {boxChallanNumber ? (
            <>
              {" "}
              — challan <ChallanLink challanId={boxChallanId} challanNumber={boxChallanNumber} />
            </>
          ) : null}
          .
        </p>
      )}
      {result.autoReturnedCount > 0 && (
        <p>
          <span className="font-semibold">{result.autoReturnedCount}</span> pre-storage cone(s) returned
          {coneChallanNumber ? (
            <>
              {" "}
              — challan <ChallanLink challanId={coneChallanId} challanNumber={coneChallanNumber} />
            </>
          ) : null}
          .
        </p>
      )}
      {result.pendingStCount > 0 && (
        <p>
          <span className="font-semibold">{result.pendingStCount}</span> cone(s) in short-term storage still need
          scan on{" "}
          <Link href={poReturnHref} className="font-bold underline hover:text-emerald-800">
            PO Return
          </Link>
          .
        </p>
      )}
      {result.excludedConeCount > 0 && (
        <p className="text-amber-900">
          {result.excludedConeCount} cone(s) were skipped (issued or used).
        </p>
      )}
      {!hasAutoReturn && result.pendingStCount === 0 && (
        <p>Lot marked returned to vendor. No active boxes or cones remained to archive.</p>
      )}
    </div>
  );
}
