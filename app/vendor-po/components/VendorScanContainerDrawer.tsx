"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  containersMasterService,
  hasActiveItems,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";

function normalizeFloor(f: string | undefined): string {
  return (f ?? "").replace(/\s+/g, "").toLowerCase();
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Human floor name used by container.activeFloor (e.g. "Branding", "Final Checking") */
  expectedFloorName: string;
  /** Called after accept succeeds (refresh lists / counters from server). */
  onAccepted?: () => void | Promise<void>;
};

/**
 * Vendor PO container scan/accept drawer.
 *
 * Used for vendor pipeline container legs:
 * - secondaryChecking → branding
 * - branding → finalChecking
 * - finalChecking → dispatch (`expectedFloorName` e.g. `"Dispatch"`)
 *
 * Backend updates destination `received` only after accept.
 */
export function VendorScanContainerDrawer({
  open,
  onClose,
  expectedFloorName,
  onAccepted,
}: Props) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [scanned, setScanned] = useState<ContainerMaster | null>(null);

  const reset = useCallback(() => {
    setBarcode("");
    setScanned(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const belongs = useMemo(() => {
    if (!scanned) return false;
    return (
      normalizeFloor(scanned.activeFloor) === normalizeFloor(expectedFloorName)
    );
  }, [scanned, expectedFloorName]);

  const fetchContainer = async () => {
    const b = barcode.trim();
    if (!b) return;
    setLoading(true);
    setScanned(null);
    try {
      const container = await containersMasterService.getByBarcode(b);
      setScanned(container);

      if (
        normalizeFloor(container.activeFloor) !==
        normalizeFloor(expectedFloorName)
      ) {
        toast.error(
          `This container belongs to "${container.activeFloor ?? "unknown"}", not ${expectedFloorName}. Accept is disabled.`,
        );
      }
      if (!hasActiveItems(container)) {
        toast.error("This container has no active items to accept.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404"))
        toast.error("Container not found for this barcode.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!scanned?.barcode) return;
    if (!hasActiveItems(scanned)) return;
    if (!belongs) return;
    setAcceptLoading(true);
    try {
      await containersMasterService.acceptByBarcode(scanned.barcode);
      try {
        await containersMasterService.clearActiveByBarcode(scanned.barcode);
      } catch {
        /* best-effort */
      }
      toast.success(`Accepted container on ${expectedFloorName}. Refreshing…`);
      await onAccepted?.();
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAcceptLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className={["fixed inset-0 bg-black/50 z-[60]"].join(" ")}
        onClick={handleClose}
        aria-hidden
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-[61] flex flex-col overflow-hidden animate-slide-in-right">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">Scan Container</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] space-y-4">
          <div className="p-2 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
            Expected floor:{" "}
            <strong className="text-purple-700">{expectedFloorName}</strong>
          </div>

          {!scanned ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-medium text-[#495057]">
                Container barcode
              </label>
              <input
                type="text"
                placeholder="Scan or enter barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void fetchContainer()}
                className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
              />
              <button
                type="button"
                disabled={!barcode.trim() || loading}
                onClick={() => void fetchContainer()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm w-full disabled:opacity-50"
              >
                {loading ? "Loading…" : "Get container"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[12px] text-gray-900 space-y-1">
                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Container
                </h4>
                <div>
                  <span className="font-bold text-[#495057]">Name:</span>{" "}
                  {scanned.containerName ?? scanned.barcode ?? "—"}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">Barcode:</span>{" "}
                  {scanned.barcode}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">Status:</span>{" "}
                  {scanned.status ?? "—"}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">
                    Active floor:
                  </span>{" "}
                  {scanned.activeFloor ?? "—"}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">
                    Active items:
                  </span>{" "}
                  {Array.isArray(scanned.activeItems)
                    ? scanned.activeItems.length
                    : scanned.activeArticle
                      ? 1
                      : 0}
                </div>
                <div>
                  <span className="font-bold text-[#495057]">Total qty:</span>{" "}
                  {scanned.quantity ?? "—"}
                </div>
              </div>

              {hasActiveItems(scanned) ? (
                <>
                  {!belongs && (
                    <div className="p-2 rounded border-2 border-red-400 bg-red-50 text-[11px] text-red-800">
                      This container is assigned to{" "}
                      <strong>
                        {String(scanned.activeFloor || "unknown")}
                      </strong>
                      , not {expectedFloorName}. Accept is disabled.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={acceptLoading || !belongs}
                    onClick={() => void accept()}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acceptLoading ? "Accepting…" : "Accept container"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 w-full"
                    disabled={acceptLoading}
                  >
                    Scan another
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    No active items in container.
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 w-full"
                  >
                    Scan another
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
