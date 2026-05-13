"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  yarnInventoryService,
  type YarnRequisitionResponse,
} from "@/app/yarn-management/dashboard/services/yarnInventoryService";

/**
 * Maps API requisition rows for display inside the PO draft queue drawer.
 * @param rows - Draft-queue requisitions from the yarn API.
 */
function mapDraftQueueRows(rows: YarnRequisitionResponse[]) {
  return rows.map((req, index) => ({
    id: String(req._id ?? req.id ?? "") || `row-${index}-${req.yarnName}`,
    yarnName: req.yarnName,
    minQty: req.minQty,
    availableQty: req.availableQty,
    blockedQty: req.blockedQty,
    lastUpdated: req.lastUpdated || req.created,
    alertStatus: req.alertStatus,
  }));
}

export type PoDraftQueueDrawerTriggerProps = {
  /** Optional class names for the trigger button. */
  className?: string;
};

/**
 * Toolbar control that opens a right-hand drawer listing yarns staged via “Send to PO draft”.
 */
export function PoDraftQueueDrawerTrigger({
  className = "flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 bg-amber-50 text-amber-900 text-[11px] font-bold rounded hover:bg-amber-100 transition-colors shadow-sm",
}: PoDraftQueueDrawerTriggerProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ReturnType<typeof mapDraftQueueRows>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows([]);
      const list = await yarnInventoryService.getAllDraftQueueRequisitions();
      setRows(mapDraftQueueRows(list));
    } catch (err) {
      console.error("[PoDraftQueueDrawer] load failed", err);
      setError(
        err instanceof Error ? err.message : "Could not load PO draft queue"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    void loadQueue();
    const onDraftPoDeleted = () => {
      void loadQueue();
    };
    window.addEventListener("yarnRequisitionsDraftPoReleased", onDraftPoDeleted);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("yarnRequisitionsDraftPoReleased", onDraftPoDeleted);
    };
  }, [open, loadQueue]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        {...(open ? { "aria-controls": "po-draft-queue-drawer" } : {})}
      >
        <i className="ri-stack-line text-sm" aria-hidden />
        Yarns in PO draft
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <aside
            id="po-draft-queue-drawer"
            className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="po-draft-queue-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 flex-shrink-0">
                  <i className="ri-draft-line text-sm" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2
                    id="po-draft-queue-title"
                    className="text-sm font-bold text-gray-900 truncate"
                  >
                    Yarns sent to PO draft
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Staged for New draft purchase order —{" "}
                    {loading ? "Loading…" : `${rows.length} yarn${rows.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                onClick={() => setOpen(false)}
                aria-label="Close drawer"
              >
                <i className="ri-close-line text-lg" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                  {error}
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div
                    className="animate-spin rounded-full h-9 w-9 border-b-2 border-purple-600"
                    role="status"
                    aria-label="Loading draft queue"
                  />
                  <p className="text-[11px] text-gray-500 font-medium">
                    Loading queued yarns…
                  </p>
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-4 py-8 text-center">
                  <p className="text-[12px] font-semibold text-gray-800">
                    No yarns in the PO draft queue
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Use <span className="font-medium">Send to PO draft</span>{" "}
                    on a row below to stage a yarn here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2" aria-label="Yarns in PO draft queue">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <p className="text-[12px] font-bold text-gray-900">
                        {row.yarnName}
                      </p>
                      <dl className="mt-1.5 grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] text-gray-600">
                        <div>
                          <dt className="text-gray-400 font-medium">Min</dt>
                          <dd className="font-semibold text-gray-800">
                            {row.minQty.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-400 font-medium">Avail.</dt>
                          <dd className="font-semibold text-green-700">
                            {row.availableQty.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-400 font-medium">Blocked</dt>
                          <dd className="font-semibold text-orange-700">
                            {row.blockedQty.toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                      {row.alertStatus ? (
                        <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                          Alert: {row.alertStatus.replace("_", " ")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-gray-400">
                        Updated{" "}
                        {new Date(row.lastUpdated).toLocaleString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-gray-100 px-4 py-3 bg-gray-50/40 shrink-0 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => void loadQueue()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <i className="ri-refresh-line text-xs" aria-hidden />
                Refresh
              </button>
              <Link
                href="/yarn-management/purchase-management/purchase/add?fromDraftQueue=1"
                title="You will choose the supplier gate first so yarns filter to that vendor bucket"
                aria-label="Open new draft PO from queue with supplier picker"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
                onClick={() => setOpen(false)}
              >
                <i className="ri-add-line text-xs" aria-hidden />
                Open staged PO wizard
              </Link>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
