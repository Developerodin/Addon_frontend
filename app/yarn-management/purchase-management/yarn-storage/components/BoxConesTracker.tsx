"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import TrackerTimeline from "./tracker/TrackerTimeline";
import { BoxTrackerDetails, ConeTrackerDetails } from "./tracker/TrackerDetailCards";
import RelocateModal, { RelocateKind } from "./tracker/RelocateModal";
import yarnTrackerService, {
  BoxTrackerResponse,
  ConeTrackerResponse,
} from "@/shared/services/yarnTrackerService";

type ScannerMode = "idle" | "box" | "cone";

interface RelocateTarget {
  kind: RelocateKind;
  itemId: string;
  itemBarcode: string;
  fromLocation: string;
}

/**
 * Box & cones tracker tab: scan a box or cone barcode and view full details + timeline.
 */
const BoxConesTracker: React.FC = () => {
  const [mode, setMode] = useState<ScannerMode>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [boxData, setBoxData] = useState<BoxTrackerResponse | null>(null);
  const [coneData, setConeData] = useState<ConeTrackerResponse | null>(null);
  const [relocateTarget, setRelocateTarget] = useState<RelocateTarget | null>(null);

  const clearResults = () => {
    setBoxData(null);
    setConeData(null);
  };

  /**
   * Re-fetch the currently displayed tracker after a successful relocate.
   */
  const refreshAfterRelocate = async () => {
    if (relocateTarget?.kind === "box" && relocateTarget.itemBarcode) {
      await handleBoxScan(relocateTarget.itemBarcode);
      return;
    }
    if (relocateTarget?.kind === "cone" && relocateTarget.itemBarcode) {
      await handleConeScan(relocateTarget.itemBarcode);
    }
  };

  const handleBoxScan = async (barcode: string): Promise<boolean> => {
    setIsLoading(true);
    clearResults();
    try {
      const data = await yarnTrackerService.getBoxTracker(barcode, {
        includeInactive: true,
      });
      setBoxData(data);
      toast.success(`Box ${data.box.boxId} loaded`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Box not found";
      toast.error(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConeScan = async (barcode: string): Promise<boolean> => {
    setIsLoading(true);
    clearResults();
    try {
      const data = await yarnTrackerService.getConeTracker(barcode, {
        includeInactive: true,
      });
      setConeData(data);
      const issueStatus = String(data.cone.issueStatus ?? "").toLowerCase();
      const machineLabel = String(data.cone.machineLabel ?? "").trim();
      if (issueStatus === "issued") {
        if (machineLabel) {
          toast.success(`Cone ${String(data.cone.barcode)} — issued on ${machineLabel}`);
        } else {
          toast.success(`Cone ${String(data.cone.barcode)} loaded (issued, machine unknown)`);
        }
      } else {
        toast.success(`Cone ${String(data.cone.barcode)} loaded`);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cone not found";
      toast.error(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const activeTimeline =
    mode === "box" && boxData
      ? boxData.timeline
      : mode === "cone" && coneData
        ? coneData.timeline
        : [];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-600">
        Scan or enter a box or cone barcode to view full details, weights, storage, QC, and
        transaction history.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("box");
            clearResults();
          }}
          className={`ti-btn text-xs ${mode === "box" ? "ti-btn-primary" : "ti-btn-light"}`}
          aria-pressed={mode === "box"}
        >
          <i className="ri-box-3-line me-1" aria-hidden />
          Box scanner
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("cone");
            clearResults();
          }}
          className={`ti-btn text-xs ${mode === "cone" ? "ti-btn-primary" : "ti-btn-light"}`}
          aria-pressed={mode === "cone"}
        >
          <i className="ri-contrast-drop-line me-1" aria-hidden />
          Cone scanner
        </button>
        {mode !== "idle" ? (
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              clearResults();
            }}
            className="ti-btn ti-btn-light text-xs"
          >
            Clear
          </button>
        ) : null}
      </div>

      {mode === "box" ? (
        <BarcodeScanner
          label="Box barcode"
          placeholder="Scan or enter box barcode"
          onScan={handleBoxScan}
          disabled={isLoading}
          invalidMessage="Box not found. Check barcode and try again."
          autoFocus
        />
      ) : null}

      {mode === "cone" ? (
        <BarcodeScanner
          label="Cone barcode"
          placeholder="Scan or enter cone barcode"
          onScan={handleConeScan}
          disabled={isLoading}
          invalidMessage="Cone not found. Check barcode and try again."
          autoFocus
        />
      ) : null}

      {mode === "idle" ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Choose Box scanner or Cone scanner to start tracking.
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-600">
          <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full" />
          Loading tracker…
        </div>
      ) : null}

      {!isLoading && boxData && mode === "box" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BoxTrackerDetails
            data={boxData}
            onRelocate={() => {
              const from = String(boxData.box.storageLocation ?? "").trim();
              if (!from) return;
              setRelocateTarget({
                kind: "box",
                itemId: boxData.box.boxId,
                itemBarcode: String(boxData.box.barcode ?? boxData.box.boxId),
                fromLocation: from,
              });
            }}
          />
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i className="ri-time-line text-purple-600" aria-hidden />
              Timeline
              <span className="text-xs font-normal text-gray-500">
                ({boxData.transactionCount} transactions)
              </span>
            </h3>
            <TrackerTimeline events={activeTimeline} />
          </div>
        </div>
      ) : null}

      {!isLoading && coneData && mode === "cone" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConeTrackerDetails
            data={coneData}
            onRelocate={() => {
              const from = String(coneData.cone.coneStorageId ?? "").trim();
              if (!from) return;
              setRelocateTarget({
                kind: "cone",
                itemId: String(coneData.cone._id ?? ""),
                itemBarcode: String(coneData.cone.barcode ?? ""),
                fromLocation: from,
              });
            }}
          />
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i className="ri-time-line text-purple-600" aria-hidden />
              Timeline
              <span className="text-xs font-normal text-gray-500">
                ({coneData.transactionCount} transactions)
              </span>
            </h3>
            <TrackerTimeline events={activeTimeline} />
          </div>
        </div>
      ) : null}

      {relocateTarget ? (
        <RelocateModal
          isOpen
          kind={relocateTarget.kind}
          itemId={relocateTarget.itemId}
          itemBarcode={relocateTarget.itemBarcode}
          fromLocation={relocateTarget.fromLocation}
          onClose={() => setRelocateTarget(null)}
          onSuccess={refreshAfterRelocate}
        />
      ) : null}
    </div>
  );
};

export default BoxConesTracker;
