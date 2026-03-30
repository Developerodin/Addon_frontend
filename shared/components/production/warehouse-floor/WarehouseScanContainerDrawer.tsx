"use client";

import React, { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import {
  containersMasterService,
  getContainerArticles,
  hasActiveItems,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";
import { productionService, type Article } from "@/shared/services/productionService";

const CURRENT_FLOOR = "Warehouse";

function normalizeFloor(f: string | undefined): string {
  return (f ?? "").replace(/\s+/g, "").toLowerCase();
}

export interface WarehouseScanContainerDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful accept (e.g. refresh WHMS / orders lists). */
  onAccepted?: () => void;
}

/**
 * Scan container by barcode, preview items, accept onto Warehouse — same flow as production warehouse floor.
 */
export default function WarehouseScanContainerDrawer({ open, onClose, onAccepted }: WarehouseScanContainerDrawerProps) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [scanned, setScanned] = useState<{
    container: ContainerMaster;
    articles: Array<{ article: Article | null; quantity: number }>;
  } | null>(null);

  const reset = useCallback(() => {
    setBarcode("");
    setScanned(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchContainer = async () => {
    const b = barcode.trim();
    if (!b) return;
    setLoading(true);
    setScanned(null);
    try {
      const container = await containersMasterService.getByBarcode(b);
      const articlesRaw = getContainerArticles(container);
      const resolved = await Promise.all(
        articlesRaw.map((a) =>
          productionService.getArticle(a.articleId).then((r) =>
            r.success && r.data ? { article: r.data as Article, quantity: a.quantity } : { article: null, quantity: a.quantity }
          )
        )
      );
      setScanned({ container, articles: resolved });
      if (normalizeFloor(container.activeFloor) !== normalizeFloor(CURRENT_FLOOR)) {
        toast.error(
          `This container belongs to "${container.activeFloor ?? "unknown"}", not ${CURRENT_FLOOR}. Accept is disabled until the container is assigned to Warehouse.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404")) toast.error("Container not found for this barcode.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!scanned?.container?.barcode) return;
    if (!hasActiveItems(scanned.container)) return;
    setAcceptLoading(true);
    try {
      await containersMasterService.acceptByBarcode(scanned.container.barcode);
      try {
        await containersMasterService.clearActiveByBarcode(scanned.container.barcode);
      } catch {
        /* best-effort */
      }
      toast.success("Article quantity accepted on Warehouse. Refresh lists to see updates.");
      reset();
      onClose();
      onAccepted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAcceptLoading(false);
    }
  };

  const belongs =
    Boolean(scanned) && normalizeFloor(scanned?.container?.activeFloor) === normalizeFloor(CURRENT_FLOOR);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={handleClose} aria-hidden />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-[61] flex flex-col overflow-hidden animate-slide-in-right">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">Scan Container</h3>
          <button type="button" onClick={handleClose} className="text-gray-500 hover:text-gray-700 p-1">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[10px]">
          {!scanned ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-medium text-[#495057]">Container barcode</label>
              <input
                type="text"
                placeholder="Scan or enter barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void fetchContainer()}
                className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-teal-300 placeholder:text-gray-400"
              />
              <button
                type="button"
                disabled={!barcode.trim() || loading}
                onClick={() => void fetchContainer()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm w-full"
              >
                {loading ? <span className="animate-spin">...</span> : "Get container"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[12px] text-gray-900 space-y-1">
                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-2">Container</h4>
                <div>
                  <span className="font-bold text-[#495057]">Name:</span>{" "}
                  {scanned.container.containerName ?? scanned.container.barcode ?? "—"}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">Barcode:</span> {scanned.container.barcode}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">Status:</span> {scanned.container.status ?? "—"}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">Active floor:</span> {scanned.container.activeFloor ?? "—"}
                </div>
              </div>
              <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Items</h4>
              <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[12px] text-gray-900 space-y-1">
                {scanned.articles.map((item, i) => (
                  <div key={i} className={i > 0 ? "pt-1 border-t border-gray-200 mt-1" : ""}>
                    <div>
                      <span className="font-bold text-[#495057]">{(item.article as Article | null)?.articleNumber ?? "—"}</span>
                      <span className="text-gray-600"> × {item.quantity}</span>
                    </div>
                    {item.article && (item.article.floorQuantities?.dispatch?.transferredData?.length ?? 0) > 0 ? (
                      <div className="mt-1 text-[11px] text-amber-900 bg-amber-50 border border-amber-100 rounded p-1.5">
                        <span className="font-semibold">From Dispatch (style · brand · qty):</span>
                        <ul className="mt-0.5 list-disc list-inside space-y-0.5">
                          {(item.article.floorQuantities?.dispatch?.transferredData ?? []).map((d, di) => (
                            <li key={di}>
                              {d.transferred} · {d.styleCode || "—"} · {d.brand || "—"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-gray-500">
                        No Dispatch line breakdown on article — accept uses container quantity; backend fills receivedData.
                      </p>
                    )}
                  </div>
                ))}
                <div className="pt-1 border-t border-gray-200 mt-1">
                  <span className="font-bold text-[#495057]">Total:</span> {scanned.container.quantity ?? "—"}
                </div>
              </div>
              {hasActiveItems(scanned.container) ? (
                <>
                  {!belongs && (
                    <div className="p-2 rounded border-2 border-red-400 bg-red-50 text-[11px] text-red-800">
                      This container is assigned to <strong>{String(scanned.container.activeFloor || "unknown")}</strong>, not{" "}
                      {CURRENT_FLOOR}. Accept Article is disabled.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={acceptLoading || !belongs}
                    onClick={() => void accept()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                  >
                    {acceptLoading ? "Accepting..." : "Accept Article Quantity"}
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">No active items in container.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
