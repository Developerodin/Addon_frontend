import React, { useEffect, useId, useMemo, useRef, useState } from "react";

type Props = {
  startDate: string;
  endDate: string;
};

/**
 * Subtracts a number of days from an ISO date string (YYYY-MM-DD).
 */
function subtractDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Yarn report calculation explainer popover for the report header.
 */
export default function YarnReportCalcInfoPopover({
  startDate,
  endDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const openingSnapshotDate = useMemo(
    () => subtractDays(startDate, 1),
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
                  (YarnPurchaseOrder, lot_rejected / po_rejected)
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
                  (YarnDailyClosingSnapshot)
                </li>
                <li>
                  <span className="font-bold">rate</span>: any date
                  (YarnPurchaseOrder.poItems.rate)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

