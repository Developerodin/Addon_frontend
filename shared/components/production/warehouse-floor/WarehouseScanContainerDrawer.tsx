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
import { collapseLinesByBrand, formatBrandLine } from "@/shared/utils/brandTransfer.util";

const ACCEPTED_FLOORS = ["warehouse", "warehouseinward"];

function normalizeFloor(f: string | undefined): string {
  return (f ?? "").replace(/\s+/g, "").toLowerCase();
}

/**
 * @returns true when the container's activeFloor is any warehouse-related floor.
 */
function isWarehouseFloor(activeFloor: string | undefined): boolean {
  return ACCEPTED_FLOORS.includes(normalizeFloor(activeFloor));
}

interface VendorFlowItem {
  vendorProductionFlow?: {
    referenceCode?: string;
    id?: string;
    product?: { name?: string; factoryCode?: string };
    vendor?: { id?: string };
    vendorPurchaseOrder?: { vpoNumber?: string };
  };
  quantity?: number;
  transferItems?: Array<{ transferred: number; styleCode?: string; brand?: string }>;
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
    vendorItems: VendorFlowItem[];
  } | null>(null);

  const reset = useCallback(() => {
    setBarcode("");
    setScanned(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  /**
   * @returns vendor flow items from activeItems (items without article but with vendorProductionFlow).
   */
  const extractVendorItems = (container: ContainerMaster): VendorFlowItem[] => {
    if (!container.activeItems?.length) return [];
    return container.activeItems.filter(
      (item) => (item as unknown as VendorFlowItem).vendorProductionFlow && !(item as unknown as { article?: unknown }).article,
    ) as unknown as VendorFlowItem[];
  };

  const fetchContainer = async () => {
    const b = barcode.trim();
    if (!b) return;
    setLoading(true);
    setScanned(null);
    try {
      const container = await containersMasterService.getByBarcode(b);
      const vendorItems = extractVendorItems(container);
      const articlesRaw = getContainerArticles(container).filter((a) => a.articleId);
      const resolved = await Promise.all(
        articlesRaw.map((a) =>
          productionService.getArticle(a.articleId).then((r) =>
            r.success && r.data ? { article: r.data as Article, quantity: a.quantity } : { article: null, quantity: a.quantity },
          ).catch(() => ({ article: null as Article | null, quantity: a.quantity })),
        ),
      );
      setScanned({ container, articles: resolved, vendorItems });
      if (!isWarehouseFloor(container.activeFloor)) {
        toast.error(
          `This container belongs to "${container.activeFloor ?? "unknown"}", not Warehouse. Accept is disabled.`,
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

  const belongs = Boolean(scanned) && isWarehouseFloor(scanned?.container?.activeFloor);

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
                {scanned.vendorItems.length > 0 && scanned.vendorItems.map((item, i) => {
                  const vpf = item.vendorProductionFlow;
                  return (
                    <div key={`v-${i}`} className={i > 0 ? "pt-1 border-t border-gray-200 mt-1" : ""}>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-100 text-purple-800 uppercase">Vendor</span>
                        <span className="font-bold text-[#495057]">{vpf?.referenceCode ?? vpf?.id?.slice(-6) ?? "—"}</span>
                        <span className="text-gray-600">× {item.quantity ?? 0}</span>
                      </div>
                      {vpf?.product?.name && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {vpf.product.name} {vpf.product.factoryCode ? `(${vpf.product.factoryCode})` : ""}
                          {vpf.vendorPurchaseOrder?.vpoNumber ? ` · ${vpf.vendorPurchaseOrder.vpoNumber}` : ""}
                        </p>
                      )}
                      {item.transferItems && item.transferItems.length > 0 && (
                        <div className="mt-1 text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-100 rounded p-1.5">
                          <span className="font-semibold">Brand breakdown:</span>
                          <ul className="mt-0.5 list-disc list-inside space-y-0.5">
                            {collapseLinesByBrand(item.transferItems).map((line, tIdx) => (
                              <li key={tIdx}>{formatBrandLine(line)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
                {scanned.articles.filter((a) => a.article).map((item, i) => (
                  <div key={`a-${i}`} className={(i > 0 || scanned.vendorItems.length > 0) ? "pt-1 border-t border-gray-200 mt-1" : ""}>
                    <div>
                      <span className="font-bold text-[#495057]">{(item.article as Article | null)?.articleNumber ?? "—"}</span>
                      <span className="text-gray-600"> × {item.quantity}</span>
                    </div>
                    {item.article && (item.article.floorQuantities?.dispatch?.transferredData?.length ?? 0) > 0 ? (
                      <div className="mt-1 text-[11px] text-amber-900 bg-amber-50 border border-amber-100 rounded p-1.5">
                        <span className="font-semibold">From Dispatch (brand · qty):</span>
                        <ul className="mt-0.5 list-disc list-inside space-y-0.5">
                          {collapseLinesByBrand(item.article.floorQuantities?.dispatch?.transferredData).map((line, di) => (
                            <li key={di}>{formatBrandLine(line)}</li>
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
                      This container is assigned to <strong>{String(scanned.container.activeFloor || "unknown")}</strong>, not Warehouse.
                      Accept is disabled.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={acceptLoading || !belongs}
                    onClick={() => void accept()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                  >
                    {acceptLoading ? "Accepting..." : "Accept Quantity"}
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
