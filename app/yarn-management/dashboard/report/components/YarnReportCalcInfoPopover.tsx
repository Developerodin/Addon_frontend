import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { YarnReportMetaSummary } from "../../services/yarnInventoryService";

type Props = {
  startDate: string;
  endDate: string;
  /** Populated after a successful report load — shows weighted vs dedup kg totals */
  totalsSummary?: YarnReportMetaSummary | null;
};

/**
 * Subtracts calendar days from a YYYY-MM-DD string (browser local calendar; aligns with picker).
 */
function subtractCalendarDays(isoDate: string, days: number): string {
  const [yStr, mStr, dStr] = isoDate.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d - days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Yarn report calculation explainer popover for the report header.
 */
export default function YarnReportCalcInfoPopover({
  startDate,
  endDate,
  totalsSummary = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const openingSnapshotDate = useMemo(
    () => subtractCalendarDays(startDate, 1),
    [startDate]
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="How Yarn Report fields are calculated"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        id={buttonId}
        className="w-7 h-7 inline-flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
      >
        <span aria-hidden className="text-[11px] font-extrabold leading-none">
          i
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
          className="absolute z-50 left-0 top-[calc(100%+8px)] w-[min(560px,calc(100vw-40px))] rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="px-3 py-2 border-b border-gray-100 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div
                id={`${panelId}-title`}
                className="text-[11px] font-extrabold text-gray-800"
              >
                Field calculation (example)
              </div>
              <div className="text-[10px] text-gray-500">
                Date range:{" "}
                <span className="font-semibold text-gray-700">
                  {startDate}
                </span>{" "}
                →{" "}
                <span className="font-semibold text-gray-700">{endDate}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-gray-50 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              aria-label="Close field calculation help"
            >
              <i className="ri-close-line text-base" aria-hidden></i>
            </button>
          </div>

          <div className="p-3 text-[11px] text-gray-700">
            <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-bold text-gray-500 mb-1">
                Summary (one line each)
              </div>
              <ul className="space-y-1">
                <li>
                  <span className="font-bold">opening</span>: snapshotDate ={" "}
                  <span className="font-semibold">{openingSnapshotDate}</span>{" "}
                  (YarnDailyClosingSnapshot)
                </li>
                <li>
                  <span className="font-bold">pur</span>: goodsReceivedDate{" "}
                  <span className="font-semibold">{startDate}</span> →{" "}
                  <span className="font-semibold">{endDate}</span>{" "}
                  (YarnPurchaseOrder.receivedLotDetails, lot_accepted)
                </li>
                <li>
                  <span className="font-bold">purRet</span>: lastUpdateDate{" "}
                  <span className="font-semibold">{startDate}</span> →{" "}
                  <span className="font-semibold">{endDate}</span>{" "}
                  (YarnPurchaseOrder lot_rejected / po_rejected; plus YarnPoVendorReturn
                  return-to-supplier by completedAt)
                </li>
                <li>
                  <span className="font-bold">issued</span>: transactionDate{" "}
                  <span className="font-semibold">{startDate}</span> →{" "}
                  <span className="font-semibold">{endDate}</span>{" "}
                  (YarnTransaction, yarn_issued)
                </li>
                <li>
                  <span className="font-bold">returned</span>: transactionDate{" "}
                  <span className="font-semibold">{startDate}</span> →{" "}
                  <span className="font-semibold">{endDate}</span>{" "}
                  (YarnTransaction, yarn_returned)
                </li>
                <li>
                  <span className="font-bold">balance</span>: snapshotDate ={" "}
                  <span className="font-semibold">{endDate}</span>{" "}
                  (YarnDailyClosingSnapshot <span className="font-semibold">closingKg</span>{" "}
                  per yarnCatalogId — displayed value, not recomputed from the row-only columns)
                </li>
                <li>
                  <span className="font-bold">rate</span>: any date
                  (YarnPurchaseOrder.poItems.rate)
                </li>
              </ul>
            </div>
            <div
              className="mt-3 rounded-md border border-amber-100 bg-amber-50/90 px-3 py-2 text-[10px] text-amber-950"
              role="note"
            >
              <div className="font-bold text-amber-900 mb-1">Totals vs inventory</div>
              <p className="leading-snug mb-2">
                Rows are keyed by yarn + shade + supplier. Opening and Balance repeat the{" "}
                <span className="font-semibold">same</span> snapshot kg per{" "}
                <span className="font-semibold">yarnCatalogId</span> on each line. Summing Opening
                or Balance in Excel duplicates stock — compare physical totals to{" "}
                <span className="font-mono font-semibold">uniqueYarnClosingKgSum</span> in the API
                response (<span className="font-mono">meta.summary</span>), not Σ(Balance).
              </p>
              {totalsSummary ? (
                <ul className="space-y-1 font-mono text-[10px] text-amber-900/95 break-all">
                  <li>
                    uniqueYarnClosingKgSum (dedup kg):{" "}
                    <span className="font-bold">{totalsSummary.uniqueYarnClosingKgSum}</span>
                  </li>
                  <li>
                    sumDisplayedBalanceAcrossRowsKg (Σ table):{" "}
                    <span className="font-bold">
                      {totalsSummary.sumDisplayedBalanceAcrossRowsKg}
                    </span>
                  </li>
                  <li>
                    uniqueYarnOpeningKgSum / sumDisplayedOpeningAcrossRowsKg:{" "}
                    <span className="font-bold">{totalsSummary.uniqueYarnOpeningKgSum}</span> /{" "}
                    <span className="font-bold">
                      {totalsSummary.sumDisplayedOpeningAcrossRowsKg}
                    </span>
                  </li>
                  <li>
                    snapshot rows ({totalsSummary.snapshotClosingYarnCatalogCount} yarns) vs report
                    rows ({totalsSummary.reportRowCount})
                  </li>
                </ul>
              ) : (
                <p className="text-[10px] leading-snug text-amber-900/85">
                  Run Submit to load totals in this panel.
                </p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-gray-600 leading-snug">
              Closing snapshot keys required:{" "}
              <span className="font-mono font-semibold">{openingSnapshotDate}</span>{" "}
              (opening day before start) and{" "}
              <span className="font-mono font-semibold">{endDate}</span> (closing). Use GET{" "}
              <span className="font-mono">/yarn-management/yarn-report/snapshot-bounds</span>{" "}
              to see coverage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

