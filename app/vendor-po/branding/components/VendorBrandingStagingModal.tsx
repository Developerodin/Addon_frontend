"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import vendorProductionFlowService, {
  type TransferredDataRow,
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import {
  containersMasterService,
  getContainerArticles,
  hasActiveItems,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";
import { containerRef } from "../../secondary-checking/utils/m1Staging";
import { formatTransferredRowLabel, resolveBrandingStageTargetLabel } from "../../utils/transferredStyleRows";
import { VendorStagingBatchHeader } from "../../components/VendorFlowBatchLabels";

const Z_BACK = 100;
const Z_PANEL = 110;

/** Branding floor PATCH body fragment: delta `transferredData` only; modal adds container + auto-transfer. */
export type PendingBrandingStagingPatch = {
  transferredData: TransferredDataRow[];
};

type Step = "form" | "success";

type Props = {
  open: boolean;
  baselineFlow: VendorProductionFlow | null;
  pendingPatch: PendingBrandingStagingPatch | null;
  onClose: () => void;
  onFloorUpdated: (updated: VendorProductionFlow) => void;
};

/**
 * Container scan + PATCH branding with auto-transfer to Final Checking.
 * APIs run here only (not in the process drawer), matching vendor secondary-checking M1 staging.
 */
export function VendorBrandingStagingModal({
  open,
  baselineFlow,
  pendingPatch,
  onClose,
  onFloorUpdated,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [scanBarcode, setScanBarcode] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedContainer, setScannedContainer] =
    useState<ContainerMaster | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successBarcode, setSuccessBarcode] = useState<string | undefined>();

  /** Destination from delta lines' per-row branding type (not flow-level). */
  const destinationLabel = resolveBrandingStageTargetLabel(
    pendingPatch?.transferredData ?? [],
    baselineFlow?.brandingType,
  );

  const reset = useCallback(() => {
    setStep("form");
    setScanBarcode("");
    setScannedContainer(null);
    setSuccessBarcode(undefined);
  }, []);

  useEffect(() => {
    if (!open || !baselineFlow || !pendingPatch) return;
    reset();
  }, [open, baselineFlow?.id, pendingPatch, reset]);

  const close = () => {
    reset();
    onClose();
  };

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
      if (hasActiveItems(c)) {
        toast.error(
          "This container is not empty. Use an empty container with no active stock.",
        );
        return;
      }
      if (!containerRef(c)) {
        toast.error("Container has no barcode or id for transfer.");
        return;
      }
      setScannedContainer(c);
      toast.success("Empty container verified — save to apply and stage");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Container not found");
    } finally {
      setScanLoading(false);
    }
  };

  const persistAndTransfer = async () => {
    if (!baselineFlow || !pendingPatch) return;
    if (!scannedContainer) {
      toast.error("Load an empty container first");
      return;
    }
    if (hasActiveItems(scannedContainer)) {
      toast.error("Container must be empty.");
      return;
    }
    const ref = containerRef(scannedContainer);
    if (!ref) {
      toast.error("Missing container reference");
      return;
    }
    setSubmitLoading(true);
    try {
      const patchWithContainer = {
        ...pendingPatch,
        existingContainerBarcode: ref,
        autoTransferToNextFloor: true,
      };
      const updated = (await vendorProductionFlowService.updateFloor(
        baselineFlow.id,
        "branding",
        patchWithContainer,
      )) as VendorProductionFlow & {
        vendorTransferContainer?: { _id?: string; barcode?: string };
      };
      const apiBar = updated.vendorTransferContainer?.barcode?.trim();
      setSuccessBarcode(apiBar || ref);
      setStep("success");
      toast.success(
        `Staged on container — ${destinationLabel} receives after accept scan`,
      );
      onFloorUpdated(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!open || !baselineFlow || !pendingPatch) return null;

  const articles = scannedContainer ? getContainerArticles(scannedContainer) : [];
  const lines = pendingPatch.transferredData.filter(
    (r) => (Number(r.transferred) || 0) > 0,
  );
  const totalQty = lines.reduce((s, r) => s + (Number(r.transferred) || 0), 0);

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
            {step === "success"
              ? `Staged for ${destinationLabel}`
              : `Scan container — save & stage to ${destinationLabel}`}
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
          <VendorStagingBatchHeader flow={baselineFlow}>
            <div>
              Style lines to stage:{" "}
              <strong className="text-purple-800">
                {totalQty.toLocaleString()}
              </strong>{" "}
              unit(s)
            </div>
            {lines.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-gray-700 list-disc list-inside">
                {lines.map((row, i) => (
                  <li key={i}>{formatTransferredRowLabel(row)}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600 pt-1 border-t border-gray-200">
              <span>
                Received:{" "}
                <strong>
                  {(
                    baselineFlow.floorQuantities.branding.received ?? 0
                  ).toLocaleString()}
                </strong>
              </span>
              <span>
                Completed:{" "}
                <strong className="text-emerald-800">
                  {(
                    baselineFlow.floorQuantities.branding.completed ?? 0
                  ).toLocaleString()}
                </strong>
              </span>
              <span>
                Remaining:{" "}
                <strong className="text-amber-900">
                  {(
                    baselineFlow.floorQuantities.branding.remaining ?? 0
                  ).toLocaleString()}
                </strong>
              </span>
              <span>
                Transferred (handoff):{" "}
                <strong className="text-purple-800">
                  {(
                    baselineFlow.floorQuantities.branding.transferred ?? 0
                  ).toLocaleString()}
                </strong>
              </span>
            </div>
          </VendorStagingBatchHeader>

          {step === "success" ? (
            <div className="space-y-3">
              <p className="text-gray-700">
                Scan this barcode on <strong>{destinationLabel}</strong> (accept) to
                increase received.
              </p>
              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/80">
                <div className="text-[10px] font-bold text-purple-800 uppercase mb-1">
                  Barcode
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
                className="w-full px-3 py-2 text-[12px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"
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
                    <dd className="font-mono font-semibold">
                      {scannedContainer.barcode || "—"}
                    </dd>
                    <dt className="text-gray-500">Name</dt>
                    <dd>{scannedContainer.containerName || "—"}</dd>
                    <dt className="text-gray-500">Type</dt>
                    <dd>{scannedContainer.type || "—"}</dd>
                    <dt className="text-gray-500">Status</dt>
                    <dd>{scannedContainer.status}</dd>
                    <dt className="text-gray-500">Active floor</dt>
                    <dd>{scannedContainer.activeFloor?.trim() || "—"}</dd>
                    <dt className="text-gray-500">Reported qty</dt>
                    <dd>{(scannedContainer.quantity ?? 0).toLocaleString()}</dd>
                  </dl>
                  {articles.length > 0 ? (
                    <p className="text-red-700 font-semibold">
                      This container has active line items — cannot use.
                    </p>
                  ) : (
                    <p className="text-emerald-800 font-semibold">
                      Empty — save sends delta transferredData, existingContainerBarcode,
                      and autoTransferToNextFloor to stage {destinationLabel}.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={
                      submitLoading ||
                      hasActiveItems(scannedContainer) ||
                      !scannedContainer
                    }
                    onClick={() => void persistAndTransfer()}
                    className="w-full px-3 py-2 text-[12px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {submitLoading ? "Saving…" : "Save — update & stage"}
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
