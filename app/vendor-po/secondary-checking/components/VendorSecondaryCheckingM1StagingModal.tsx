"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import vendorProductionFlowService, {
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import {
  containersMasterService,
  getContainerArticles,
  hasActiveItems,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";
import { containerRef } from "../utils/m1Staging";
import type { SecondaryCheckingFloorPatchBody } from "../utils/buildSecondaryCheckingPatch";

const Z_BACK = 100;
const Z_PANEL = 110;

/** Payload for PATCH .../floors/secondaryChecking (absolute qty fields user set, optional repair / auto-transfer). */
export type PendingSecondaryCheckingPatch = SecondaryCheckingFloorPatchBody;

type Step = "form" | "success";

type Props = {
  open: boolean;
  baselineFlow: VendorProductionFlow | null;
  pendingPatch: PendingSecondaryCheckingPatch | null;
  /** Resolved totals after this save (for display); pendingPatch carries entered absolutes + repair. */
  displayTotals: { m1: number; m2: number; m3: number; vm4: number } | null;
  /** When true, Save requires an empty container and runs transfer after PATCH. */
  requireContainerScan: boolean;
  /** Client hint: M1 − m1Transferred before PATCH (for copy in UI). */
  plannedTransferQtyHint: number;
  onClose: () => void;
  onFloorUpdated: (updated: VendorProductionFlow) => void;
  onTransferred?: (next: VendorProductionFlow) => void | Promise<void>;
};

/**
 * APIs run here only (not on the process drawer Save): PATCH secondary checking, then optional
 * transfer to Branding when an empty container was scanned.
 */
export function VendorSecondaryCheckingM1StagingModal({
  open,
  baselineFlow,
  pendingPatch,
  displayTotals,
  requireContainerScan,
  plannedTransferQtyHint,
  onClose,
  onFloorUpdated,
  onTransferred,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [scanBarcode, setScanBarcode] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedContainer, setScannedContainer] =
    useState<ContainerMaster | null>(null);
  const [scanBlockReason, setScanBlockReason] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successBarcode, setSuccessBarcode] = useState<string | undefined>();

  const reset = useCallback(() => {
    setStep("form");
    setScanBarcode("");
    setScannedContainer(null);
    setScanBlockReason(null);
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
    setScanBlockReason(null);
    try {
      const c = await containersMasterService.getByBarcode(b);
      // Always show the scanned container, even if it's unusable.
      setScannedContainer(c);
      if (hasActiveItems(c)) {
        const activeCount = Array.isArray(c.activeItems) ? c.activeItems.length : 0;
        const reason = `Not empty: activeFloor=\"${c.activeFloor ?? "—"}\", activeItems=${activeCount}, qty=${Number(
          c.quantity ?? 0,
        ).toLocaleString()}`;
        setScanBlockReason(reason);
        toast.error(
          "This container is not empty. Use an empty container with no active stock.",
        );
        return;
      }
      if (!containerRef(c)) {
        const reason = "Missing usable container reference (barcode/id) for staging.";
        setScanBlockReason(reason);
        toast.error("Container has no barcode or id for transfer.");
        return;
      }
      toast.success("Empty container verified — save to apply and stage");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Container not found");
    } finally {
      setScanLoading(false);
    }
  };

  const persistFloorOnly = async () => {
    if (!baselineFlow || !pendingPatch) return;
    setSubmitLoading(true);
    try {
      const updated = await vendorProductionFlowService.updateFloor(
        baselineFlow.id,
        "secondaryChecking",
        pendingPatch,
      );
      onFloorUpdated(updated);
      toast.success("Secondary checking updated");
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  const persistAndTransfer = async () => {
    if (!baselineFlow || !pendingPatch) return;
    if (requireContainerScan && !scannedContainer) {
      toast.error("Load an empty container first");
      return;
    }
    if (hasActiveItems(scannedContainer!)) {
      toast.error(scanBlockReason || "Container must be empty.");
      return;
    }
    const ref = containerRef(scannedContainer!);
    if (!ref) {
      toast.error("Missing container reference");
      return;
    }
    setSubmitLoading(true);
    try {
      /** Backend requires `existingContainerBarcode` + `autoTransferToNextFloor` on this PATCH (see vendor doc §2.A.1). */
      const patchWithContainer = {
        ...pendingPatch,
        existingContainerBarcode: ref,
        autoTransferToNextFloor: true,
      };
      const updated = (await vendorProductionFlowService.updateFloor(
        baselineFlow.id,
        "secondaryChecking",
        patchWithContainer,
      )) as VendorProductionFlow & {
        vendorTransferContainer?: { _id?: string; barcode?: string };
      };
      const apiBar = updated.vendorTransferContainer?.barcode?.trim();
      setSuccessBarcode(apiBar || ref);
      setStep("success");
      toast.success("Staged on container — Branding receives after accept scan");
      await onTransferred?.(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!open || !baselineFlow || !pendingPatch || !displayTotals) return null;

  const articles = scannedContainer ? getContainerArticles(scannedContainer) : [];
  const d = displayTotals;
  const canStage =
    Boolean(scannedContainer) &&
    !hasActiveItems(scannedContainer) &&
    Boolean(containerRef(scannedContainer));

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
              ? "Staged for Branding"
              : requireContainerScan
                ? "Scan container — save & stage M1"
                : "Confirm save — secondary checking"}
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
              <strong>
                {baselineFlow.referenceCode || baselineFlow.id.slice(-6)}
              </strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <span>
                M1: <strong>{d.m1.toLocaleString()}</strong>
              </span>
              <span>
                M2: <strong>{d.m2.toLocaleString()}</strong>
              </span>
              <span>
                VM4: <strong>{d.vm4.toLocaleString()}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600">
              <span>
                SC remaining:{" "}
                <strong className="text-amber-900">
                  {(
                    baselineFlow.floorQuantities.secondaryChecking.remaining ?? 0
                  ).toLocaleString()}
                </strong>
              </span>
              <span>
                SC transferred:{" "}
                <strong>
                  {(
                    baselineFlow.floorQuantities.secondaryChecking.transferred ??
                    0
                  ).toLocaleString()}
                </strong>
              </span>
            </div>
            {requireContainerScan && plannedTransferQtyHint > 0 ? (
              <div className="text-emerald-900 font-bold">
                Up to {plannedTransferQtyHint.toLocaleString()} M1 unit(s) can be
                staged after save (from your totals vs already transferred).
              </div>
            ) : null}
          </div>

          {step === "success" ? (
            <div className="space-y-3">
              <p className="text-gray-700">
                Scan this barcode on <strong>Branding</strong> (accept) to
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
          ) : requireContainerScan ? (
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
                      Empty — save will update quantities then stage M1 to
                      Branding.
                    </p>
                  )}
                  {scanBlockReason ? (
                    <div className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
                      <div className="font-bold text-[10px] uppercase tracking-wide">
                        Blocked
                      </div>
                      <div className="font-mono break-words">{scanBlockReason}</div>
                    </div>
                  ) : null}
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
                  {!canStage ? (
                    <p className="text-[10px] text-gray-700">
                      Pick an <strong>empty</strong> Active container (no active items).
                      This modal will not stage onto a “dirty” bag.
                    </p>
                  ) : null}
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
          ) : (
            <div className="space-y-3">
              <p className="text-gray-700">
                No M1 staging on a container is needed for this save. Confirm to
                write M1 / M2 / M3 / VM4 and repair fields to the server.
              </p>
              <button
                type="button"
                disabled={submitLoading}
                onClick={() => void persistFloorOnly()}
                className="w-full px-3 py-2 text-[12px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {submitLoading ? "Saving…" : "Save & update"}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={submitLoading}
                className="w-full px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
