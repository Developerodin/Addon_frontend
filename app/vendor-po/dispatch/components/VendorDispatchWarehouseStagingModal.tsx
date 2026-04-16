"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import vendorProductionFlowService, {
  mergeProductionFlowPreservePopulatedRefs,
  type TransferredDataRow,
  type VendorProductionFlow,
  type VendorTransferItem,
} from "@/shared/services/vendorProductionFlowService";
import {
  containersMasterService,
  getContainerArticles,
  hasActiveItems,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";
import { containerRef } from "../../secondary-checking/utils/m1Staging";
import { formatTransferredRowLabel } from "../../utils/transferredStyleRows";
import { rememberVendorBagProductionFlow } from "@/shared/components/production/warehouse-floor/whmsVendorBagFlowSession";

const Z_BACK = 100;
const Z_PANEL = 110;

/**
 * Patch payload built by the process drawer for Save & stage.
 */
export type PendingDispatchStagingPatch = {
  quantity: number;
  transferredData?: TransferredDataRow[];
};

type Step = "form" | "success";

type Props = {
  open: boolean;
  baselineFlow: VendorProductionFlow | null;
  pendingPatch: PendingDispatchStagingPatch | null;
  transferItems: VendorTransferItem[];
  onClose: () => void;
  onFloorUpdated: (updated: VendorProductionFlow) => void;
};

/**
 * Dispatch → Warehouse staging modal. Uses `PATCH …/transfer` (dispatch → warehouse)
 * with the scanned container barcode. Warehouse completes with `POST …/accept` on the same barcode.
 */
export function VendorDispatchWarehouseStagingModal({
  open,
  baselineFlow,
  pendingPatch,
  transferItems,
  onClose,
  onFloorUpdated,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [scanBarcode, setScanBarcode] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedContainer, setScannedContainer] = useState<ContainerMaster | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successBarcode, setSuccessBarcode] = useState<string | undefined>();

  const reset = useCallback(() => {
    setStep("form");
    setScanBarcode("");
    setScannedContainer(null);
    setSuccessBarcode(undefined);
  }, []);

  useEffect(() => {
    if (!open || !baselineFlow || !pendingPatch) return;
    reset();
  }, [open, baselineFlow?.id, pendingPatch, transferItems, reset]);

  const close = () => {
    reset();
    onClose();
  };

  /**
   * Looks up the container and validates it's usable for warehouse staging.
   */
  const lookupContainer = async () => {
    const b = scanBarcode.trim();
    if (!b) {
      toast.error("Scan or enter container barcode");
      return;
    }
    setScanLoading(true);
    setScannedContainer(null);
    try {
      const c = await containersMasterService.getByBarcode(b);
      if (!containerRef(c)) {
        toast.error("Container has no barcode or id.");
        return;
      }
      setScannedContainer(c);
      toast.success("Container verified — save to stage for warehouse");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Container not found");
    } finally {
      setScanLoading(false);
    }
  };

  /**
   * Executes the dispatch → warehouse transfer via PATCH …/transfer.
   */
  const persistTransfer = async () => {
    if (!baselineFlow || !pendingPatch) return;
    if (!scannedContainer) {
      toast.error("Load a container first");
      return;
    }
    const ref = containerRef(scannedContainer)?.trim();
    if (!ref) {
      toast.error("Missing container reference");
      return;
    }
    const qty = transferItems.reduce((s, i) => s + Math.max(0, Number(i.transferred) || 0), 0);
    if (qty <= 0) {
      toast.error("No quantity to transfer — reopen from Dispatch process.");
      return;
    }
    setSubmitLoading(true);
    try {
      const transferItemsPayload = transferItems
        .filter((i) => (Number(i.transferred) || 0) > 0)
        .map((i) => ({
          transferred: Math.max(0, Number(i.transferred) || 0),
          styleCode: i.styleCode?.trim() ?? "",
          brand: i.brand?.trim() ?? "",
        }));

      const updated = await vendorProductionFlowService.transfer(baselineFlow.id, {
        fromFloorKey: "dispatch",
        toFloorKey: "warehouse",
        quantity: qty,
        existingContainerBarcode: ref,
        ...(transferItemsPayload.length ? { transferItems: transferItemsPayload } : {}),
      });

      rememberVendorBagProductionFlow(ref, baselineFlow.id);

      const merged = mergeProductionFlowPreservePopulatedRefs(baselineFlow, updated);
      setSuccessBarcode(ref);
      setStep("success");
      toast.success(
        `Staged ${qty} unit(s) on container ${ref}. Warehouse: scan this barcode to complete inward.`,
      );
      onFloorUpdated(merged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!open || !baselineFlow || !pendingPatch) return null;

  const articles = scannedContainer ? getContainerArticles(scannedContainer) : [];
  const lines = transferItems.filter((r) => (Number(r.transferred) || 0) > 0);
  const totalQty = lines.reduce((s, r) => s + (Number(r.transferred) || 0), 0);
  const disp = baselineFlow.floorQuantities?.dispatch;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
        style={{ zIndex: Z_BACK }}
        onClick={() => !scanLoading && !submitLoading && close()}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{ zIndex: Z_PANEL }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">
            {step === "success" ? "Staged for warehouse" : "Scan container — stage to warehouse"}
          </h3>
          <button
            type="button"
            onClick={close}
            className="text-gray-500 hover:text-gray-700 p-1"
            disabled={scanLoading || submitLoading}
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[11px]">
          <div className="p-2 rounded border border-gray-200 bg-gray-50 space-y-1">
            <div>
              Batch:{" "}
              <strong>{baselineFlow.referenceCode || baselineFlow.id.slice(-6)}</strong>
            </div>
            <div>
              Transfer qty:{" "}
              <strong className="text-purple-800">{totalQty.toLocaleString()}</strong> unit(s)
            </div>
            {lines.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-gray-700 list-disc list-inside">
                {lines.map((row, i) => (
                  <li key={i}>{formatTransferredRowLabel(row)}</li>
                ))}
              </ul>
            ) : null}
            {disp && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600 pt-1 border-t border-gray-200">
                <span>Received: <strong>{(disp.received ?? 0).toLocaleString()}</strong></span>
                <span>Transferred: <strong>{(disp.transferred ?? 0).toLocaleString()}</strong></span>
                <span>Remaining: <strong className="text-amber-900">{(disp.remaining ?? 0).toLocaleString()}</strong></span>
              </div>
            )}
          </div>

          {step === "success" ? (
            <div className="space-y-3">
              <p className="text-gray-700">
                Quantity staged on the container. <strong>Warehouse</strong> should scan the same barcode
                to complete inward receive.
              </p>
              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/80">
                <div className="text-[10px] font-bold text-purple-800 uppercase mb-1">
                  Container barcode (scan at Warehouse)
                </div>
                <div className="font-mono text-sm font-bold break-all text-gray-900">
                  {successBarcode}
                </div>
                <button
                  type="button"
                  className="mt-2 text-[11px] font-semibold text-purple-700 underline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(successBarcode ?? "");
                      toast.success("Copied");
                    } catch {
                      toast.error("Could not copy");
                    }
                  }}
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-full px-3 py-2 text-[12px] font-bold rounded bg-white border border-gray-200 text-gray-800 hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block font-medium text-[#495057]">
                  Container barcode
                </label>
                <input
                  type="text"
                  placeholder="Scan or type barcode"
                  value={scanBarcode}
                  onChange={(e) => setScanBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void lookupContainer()}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-[11px] font-medium font-mono"
                  disabled={scanLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void lookupContainer()}
                  disabled={scanLoading || !scanBarcode.trim()}
                  className="w-full px-3 py-2 text-[12px] font-bold rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {scanLoading ? "Loading…" : "Load container"}
                </button>
              </div>

              {scannedContainer && (
                <div className="rounded border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                  <div className="font-bold text-emerald-900 text-[10px] uppercase">
                    Container details
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                    <dt className="text-gray-500">Barcode</dt>
                    <dd className="font-mono font-semibold">{scannedContainer.barcode || "—"}</dd>
                    <dt className="text-gray-500">Name</dt>
                    <dd>{scannedContainer.containerName || "—"}</dd>
                    <dt className="text-gray-500">Status</dt>
                    <dd>{scannedContainer.status}</dd>
                    <dt className="text-gray-500">Active floor</dt>
                    <dd>{scannedContainer.activeFloor?.trim() || "—"}</dd>
                    <dt className="text-gray-500">Reported qty</dt>
                    <dd>{(scannedContainer.quantity ?? 0).toLocaleString()}</dd>
                  </dl>
                  {articles.length > 0 && (
                    <p className="text-[10px] text-amber-700">
                      This container has {articles.length} active item(s) — quantity will be added.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={submitLoading || !scannedContainer}
                    onClick={() => void persistTransfer()}
                    className="w-full px-3 py-2 text-[12px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {submitLoading ? "Staging…" : "Save & stage to Warehouse"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={close}
                disabled={scanLoading || submitLoading}
                className="w-full px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
