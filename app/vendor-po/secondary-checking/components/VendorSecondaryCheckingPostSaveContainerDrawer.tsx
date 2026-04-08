"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import vendorProductionFlowService, {
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import {
  containersMasterService,
  hasActiveItems,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";

const Z_BACK = 90;
const Z_PANEL = 100;

function normalizeFloor(f: string | undefined): string {
  return (f ?? "").replace(/\s+/g, "").toLowerCase();
}

/** M1 bucket still available to stage to Branding (see doc `m1Remaining`). */
function m1RemainingForTransfer(
  sc: VendorProductionFlow["floorQuantities"]["secondaryChecking"],
): number {
  const fromApi = Number(sc.m1Remaining);
  if (Number.isFinite(fromApi) && fromApi >= 0) {
    return Math.floor(fromApi);
  }
  const m1 = Number(sc.m1Quantity ?? 0);
  const tr = Number(sc.m1Transferred ?? 0);
  const q = m1 - tr;
  return Math.max(0, Math.floor(Number.isFinite(q) ? q : 0));
}

function containerRef(c: ContainerMaster): string {
  const b = c.barcode?.trim();
  if (b) return b;
  return String(c._id ?? "").trim();
}

type Step = "scan" | "qty" | "success";

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  /** After a successful manual transfer; refresh list + merge populated refs. */
  onTransferred?: (next: VendorProductionFlow) => void | Promise<void>;
};

/**
 * After QC save: scan physical container → enter M1 qty → manual transfer to Branding with
 * `existingContainerBarcode` (API §2.A / §3).
 */
export function VendorSecondaryCheckingPostSaveContainerDrawer({
  open,
  flow,
  onClose,
  onTransferred,
}: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [scanBarcode, setScanBarcode] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedContainer, setScannedContainer] =
    useState<ContainerMaster | null>(null);
  const [qty, setQty] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [successBarcode, setSuccessBarcode] = useState<string | undefined>();

  const sc = flow?.floorQuantities.secondaryChecking;
  const m1Rem = useMemo(
    () => (flow && sc ? m1RemainingForTransfer(sc) : 0),
    [flow, sc],
  );

  const reset = useCallback(() => {
    setStep("scan");
    setScanBarcode("");
    setScannedContainer(null);
    setQty("");
    setSuccessBarcode(undefined);
  }, []);

  useEffect(() => {
    if (!open || !flow) return;
    reset();
  }, [open, flow?.id, reset]);

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
        const af = normalizeFloor(c.activeFloor);
        if (
          af &&
          af !== "secondarychecking" &&
          af !== "secondary" &&
          c.activeFloor?.trim()
        ) {
          toast.error(
            `This container is already active on "${c.activeFloor}". Use an empty container or one tied to Secondary Checking.`,
          );
          return;
        }
      }
      if (!containerRef(c)) {
        toast.error("Container has no barcode or id for transfer.");
        return;
      }
      setScannedContainer(c);
      setStep("qty");
      toast.success("Container loaded — enter quantity to transfer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Container not found");
    } finally {
      setScanLoading(false);
    }
  };

  const submitTransfer = async () => {
    if (!flow || !scannedContainer) return;
    const ref = containerRef(scannedContainer);
    if (!ref) {
      toast.error("Missing container reference");
      return;
    }
    const n = Number(String(qty).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      toast.error("Enter a whole number > 0");
      return;
    }
    if (n > m1Rem) {
      toast.error(
        `Cannot exceed M1 remaining to transfer (${m1Rem.toLocaleString()})`,
      );
      return;
    }
    setTransferLoading(true);
    try {
      const res = (await vendorProductionFlowService.transfer(flow.id, {
        fromFloorKey: "secondaryChecking",
        toFloorKey: "branding",
        quantity: n,
        existingContainerBarcode: ref,
      })) as VendorProductionFlow & {
        vendorTransferContainer?: { _id?: string; barcode?: string };
      };
      const apiBar = res.vendorTransferContainer?.barcode?.trim();
      setSuccessBarcode(apiBar || ref);
      setStep("success");
      toast.success("Staged on container — Branding receives after accept scan");
      await onTransferred?.(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  if (!open || !flow) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: Z_BACK }}
        onClick={() => !scanLoading && !transferLoading && close()}
        aria-hidden
      />
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden animate-slide-in-right"
        style={{ zIndex: Z_PANEL }}
      >
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">
            {step === "success"
              ? "Staged for Branding"
              : "M1 → Branding (container)"}
          </h3>
          <button
            type="button"
            onClick={close}
            className="text-gray-500 hover:text-gray-700 p-1"
            disabled={scanLoading || transferLoading}
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] space-y-4">
          <div className="p-2 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-700 space-y-1">
            <div>
              Batch: <strong>{flow.referenceCode || flow.id.slice(-6)}</strong>
            </div>
            <div>
              Received:{" "}
              <strong>{(sc?.received ?? 0).toLocaleString()}</strong> · M1:{" "}
              <strong>{(sc?.m1Quantity ?? 0).toLocaleString()}</strong> · M1
              transferred:{" "}
              <strong>{(sc?.m1Transferred ?? 0).toLocaleString()}</strong> ·{" "}
              <span className="text-emerald-800 font-bold">
                M1 remaining to transfer: {m1Rem.toLocaleString()}
              </span>
            </div>
          </div>

          {m1Rem <= 0 && step !== "success" ? (
            <div className="p-3 rounded border border-amber-300 bg-amber-50 text-[11px] text-amber-900 space-y-2">
              <p className="font-semibold">
                No M1 left to stage (all declared M1 is already transferred or
                none declared).
              </p>
              <button
                type="button"
                onClick={close}
                className="w-full px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-amber-400"
              >
                Close
              </button>
            </div>
          ) : step === "success" ? (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-700">
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
          ) : step === "scan" ? (
            <>
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-[#495057]">
                  Container barcode
                </label>
                <input
                  type="text"
                  placeholder="Scan or type barcode"
                  value={scanBarcode}
                  onChange={(e) => setScanBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void lookupContainer()}
                  className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium"
                  disabled={scanLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void lookupContainer()}
                  disabled={scanLoading || !scanBarcode.trim()}
                  className="w-full px-3 py-2 text-[12px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {scanLoading ? "Loading…" : "Load container"}
                </button>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={scanLoading}
                className="w-full px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="p-2 rounded border border-gray-100 bg-slate-50 text-[10px] text-gray-700">
                Container:{" "}
                <span className="font-mono font-semibold">
                  {containerRef(scannedContainer!)}
                </span>
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-[#495057]">
                  M1 quantity to stage (max {m1Rem.toLocaleString()})
                </label>
                <input
                  type="number"
                  min={1}
                  max={m1Rem}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submitTransfer()}
                  className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium"
                  disabled={transferLoading}
                />
              </div>
              <button
                type="button"
                disabled={transferLoading || !String(qty).trim()}
                onClick={() => void submitTransfer()}
                className="w-full px-3 py-2 text-[12px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {transferLoading ? "Staging…" : "Transfer to Branding"}
              </button>
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => {
                  setStep("scan");
                  setScannedContainer(null);
                  setQty("");
                  setScanBarcode("");
                }}
                className="w-full px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200"
              >
                Back to scan
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
