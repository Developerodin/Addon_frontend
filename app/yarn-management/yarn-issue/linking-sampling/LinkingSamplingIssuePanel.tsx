"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import { fetchWeightLatest } from "@/shared/data/utilities/weightApi";
import Cookies from "js-cookie";
import {
  createFloorIssueBatch,
  issueConeForFloor,
  type LinkingSamplingFloor,
} from "@/app/yarn-management/yarn-issue/linking-sampling/linkingSamplingIssueService";

/** Max net kg per cone and per yarn catalog within one batch (server-enforced). */
const MAX_NET_KG = 5;

interface ConeScanShape {
  _id: string;
  barcode?: string;
  yarnName?: string;
  yarnCatalogId?: string | { _id?: string };
  coneWeight?: number;
  tearWeight?: number;
  boxId?: string;
  issueStatus?: string;
}

/**
 * Stable key for per-batch yarn weight tracking (prefers catalog id).
 * @param cone - Cone payload from barcode API
 */
function catalogKeyFromCone(cone: ConeScanShape | null): string {
  if (!cone) return "_unknown";
  const y = cone.yarnCatalogId;
  if (y && typeof y === "object" && y._id) return String(y._id);
  if (typeof y === "string" && y) return y;
  return cone.yarnName?.trim() || "_unknown";
}

const getToken = () => Cookies.get("accessToken") || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);

function getAccessTokenHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface LinkingSamplingIssuePanelProps {
  floor: LinkingSamplingFloor;
  floorLabel: string;
  /** Increment parent state to refresh history after a successful issue. */
  onIssueSuccess?: () => void;
}

/**
 * Barcode scan + weight modal for issuing one cone to linking or sampling (no production order).
 */
export function LinkingSamplingIssuePanel({ floor, floorLabel, onIssueSuccess }: LinkingSamplingIssuePanelProps) {
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [coneData, setConeData] = useState<ConeScanShape | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [totalWeight, setTotalWeight] = useState("");
  const [totalTearWeight, setTotalTearWeight] = useState("");
  const [totalNetWeight, setTotalNetWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingWeight, setFetchingWeight] = useState(false);
  /** API error when confirming issue (shown in modal + toast). */
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueBatchId, setIssueBatchId] = useState<string | null>(null);
  const [batchCreating, setBatchCreating] = useState(false);
  /** Net kg issued in the current batch per yarn key (client hint; server is authoritative). */
  const [batchNetByYarnKey, setBatchNetByYarnKey] = useState<Record<string, number>>({});

  const handleNewBatch = async () => {
    setBatchCreating(true);
    try {
      const b = await createFloorIssueBatch(floor);
      setIssueBatchId(b.issueBatchId);
      setBatchNetByYarnKey({});
      toast.success("New batch started. You can scan cones.");
      barcodeInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not create batch.");
    } finally {
      setBatchCreating(false);
    }
  };

  useEffect(() => {
    const tw = parseFloat(totalWeight);
    const tt = parseFloat(totalTearWeight) || 0;
    if (Number.isNaN(tw)) {
      setTotalNetWeight("");
      return;
    }
    const net = Math.max(0, tw - tt);
    setTotalNetWeight((Math.trunc(net * 1000) / 1000).toFixed(3));
  }, [totalWeight, totalTearWeight]);

  useEffect(() => {
    if (!showModal) {
      barcodeInputRef.current?.focus();
    }
  }, [showModal]);

  const resetFlow = useCallback(() => {
    setShowModal(false);
    setConeData(null);
    setTotalWeight("");
    setTotalTearWeight("0");
    setTotalNetWeight("");
    setScanError(null);
    setIssueError(null);
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueBatchId) {
      toast.error("Start a new batch before scanning.");
      return;
    }
    if (!barcodeInput.trim()) {
      toast.error("Scan the cone barcode first.");
      return;
    }

    setBarcodeLoading(true);
    setScanError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${encodeURIComponent(barcodeInput.trim())}`,
        { headers: getAccessTokenHeaders() }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || "Cone not found");
      }
      const cone = (await res.json()) as ConeScanShape;

      if (cone.issueStatus === "issued") {
        const msg = "This cone is already issued (e.g. to production).";
        setScanError(msg);
        toast.error(msg);
        return;
      }
      if (cone.issueStatus === "used") {
        const msg = "This cone is already used and cannot be issued.";
        setScanError(msg);
        toast.error(msg);
        return;
      }

      setConeData(cone);
      setTotalTearWeight(cone.tearWeight != null ? String(cone.tearWeight) : "0");
      setTotalWeight("");
      setIssueError(null);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load cone.");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleFromScale = async () => {
    setFetchingWeight(true);
    try {
      const w = await fetchWeightLatest("cones");
      if (w != null && w > 0) {
        const tear = parseFloat(totalTearWeight) || 0;
        const truncatedWeight = Math.trunc(w * 1000) / 1000;
        const net = Math.max(0, truncatedWeight - tear);
        const truncatedNet = Math.trunc(net * 1000) / 1000;
        setTotalWeight(truncatedWeight.toFixed(3));
        setTotalNetWeight(truncatedNet.toFixed(3));
        toast.success(`Weight from scale: ${truncatedWeight.toFixed(3)} kg`);
      } else {
        toast.error("Could not read weight from scale.");
      }
    } finally {
      setFetchingWeight(false);
    }
  };

  const handleIssue = async () => {
    if (!issueBatchId) {
      toast.error("No active batch. Start a new batch first.");
      return;
    }
    if (!coneData?._id || !barcodeInput.trim()) {
      toast.error("Missing cone or barcode.");
      return;
    }
    const tw = parseFloat(totalWeight);
    const tt = parseFloat(totalTearWeight) || 0;
    const net = Math.max(0, tw - tt);

    if (Number.isNaN(tw) || tw <= 0) {
      toast.error("Enter a valid total weight (kg).");
      return;
    }
    if (net <= 0) {
      toast.error("Net weight must be greater than zero.");
      return;
    }
    if (net > MAX_NET_KG + 1e-9) {
      toast.error(`Net weight cannot exceed ${MAX_NET_KG} kg for ${floorLabel}.`);
      return;
    }

    const yk = catalogKeyFromCone(coneData);
    const prevInBatch = batchNetByYarnKey[yk] ?? 0;
    if (prevInBatch + net > MAX_NET_KG + 1e-9) {
      toast.error(
        `This yarn already has ${prevInBatch.toFixed(3)} kg net in this batch (max ${MAX_NET_KG} kg total).`,
        { id: "linking-sampling-batch-cap" }
      );
      return;
    }

    setSubmitting(true);
    setIssueError(null);
    try {
      await issueConeForFloor({
        barcode: barcodeInput.trim(),
        floor,
        issueBatchId,
        totalWeight: tw,
        totalTearWeight: tt,
      });
      toast.success(`Cone issued for ${floorLabel}. Transaction saved.`);
      setBatchNetByYarnKey((p) => ({ ...p, [yk]: prevInBatch + net }));
      setBarcodeInput("");
      resetFlow();
      barcodeInputRef.current?.focus();
      onIssueSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Issue failed.";
      setIssueError(msg);
      toast.error(msg, { id: "linking-sampling-issue-error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl">
      <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">
        Start a <span className="font-semibold text-gray-800">new batch</span>, then scan cones in{" "}
        <span className="font-bold text-gray-800">{floorLabel}</span>. The yarn catalog must allow{" "}
        {floor === "linking" ? "linking" : "sampling"}. Max <span className="font-semibold">{MAX_NET_KG} kg</span> net
        per cone and <span className="font-semibold">{MAX_NET_KG} kg</span> net total per yarn per batch.
      </p>

      <div
        className="flex flex-wrap items-center gap-2 mb-3 p-2.5 bg-gray-50 border border-gray-100 rounded-md"
        role="region"
        aria-label="Floor issue batch"
      >
        <button
          type="button"
          onClick={() => void handleNewBatch()}
          disabled={batchCreating}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 shrink-0"
          aria-label="Create a new issue batch with a system-generated id"
        >
          <i className={`ri-add-circle-line ${batchCreating ? "animate-pulse" : ""}`} aria-hidden />
          {batchCreating ? "Creating…" : "New batch"}
        </button>
        {issueBatchId ? (
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Active batch</div>
            <div
              className="text-[11px] font-mono text-gray-900 truncate"
              title={issueBatchId}
              aria-label={`Batch id ${issueBatchId}`}
            >
              {issueBatchId}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-amber-900 font-semibold leading-snug">
            Create a batch before scanning — each batch caps the same yarn at {MAX_NET_KG} kg net total.
          </p>
        )}
      </div>

      <form onSubmit={handleScanSubmit} className="space-y-2">
        <label htmlFor={`floor-scan-${floor}`} className="text-[11px] font-bold text-gray-700 block">
          Cone barcode
        </label>
        <div className="relative">
          <input
            ref={barcodeInputRef}
            id={`floor-scan-${floor}`}
            type="text"
            className="bg-white border border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded w-full focus:ring-0 focus:border-purple-300 font-medium placeholder:text-gray-500"
            placeholder="Scan or enter barcode…"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            disabled={barcodeLoading}
            autoComplete="off"
          />
          <i className="ri-barcode-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden />
        </div>
        {scanError && (
          <p className="text-[11px] text-red-600 font-semibold" role="alert">
            {scanError}
          </p>
        )}
        <button
          type="submit"
          className="ti-btn ti-btn-primary w-full whitespace-normal break-words leading-tight px-4 py-2 text-[11px] font-bold"
          disabled={barcodeLoading || !issueBatchId || batchCreating}
        >
          {barcodeLoading ? "Loading…" : "Load cone"}
        </button>
      </form>

      {showModal && coneData && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`floor-issue-title-${floor}`}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-start justify-between border-b border-gray-200 px-4 py-3">
              <h2 id={`floor-issue-title-${floor}`} className="text-sm font-bold text-gray-800 pr-6">
                Issue for {floorLabel}
              </h2>
              <button
                type="button"
                onClick={resetFlow}
                className="text-gray-600 hover:text-gray-900 p-1 rounded"
                aria-label="Close"
              >
                <i className="ri-close-line text-lg" aria-hidden />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {issueError && (
                <div
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-900 leading-snug"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="font-bold text-red-950 mb-0.5">Could not issue this cone</div>
                  <p className="text-red-900/95">{issueError}</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded border border-gray-100 text-[11px]">
                <div className="font-bold text-gray-800 mb-2">Cone details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                  <div>
                    <span className="text-gray-500">Barcode:</span>{" "}
                    <span className="font-medium">{coneData.barcode}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Yarn:</span>{" "}
                    <span className="font-medium">{coneData.yarnName ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Recorded cone wt:</span>{" "}
                    <span className="font-medium">{coneData.coneWeight ?? "—"} kg</span>
                  </div>
                  {coneData.boxId && (
                    <div>
                      <span className="text-gray-500">Box:</span>{" "}
                      <span className="font-medium">{coneData.boxId}</span>
                    </div>
                  )}
                </div>
              </div>

              {issueBatchId && (
                <div
                  className="p-3 rounded border border-purple-100 bg-purple-50/40 text-[11px]"
                  aria-label="Batch weight allowance for this yarn"
                >
                  <div className="font-bold text-gray-800 mb-1">This batch</div>
                  <p className="text-[10px] font-mono text-gray-700 break-all mb-2" title={issueBatchId}>
                    {issueBatchId}
                  </p>
                  <p className="text-gray-800">
                    <span className="text-gray-600">This yarn net in batch:</span>{" "}
                    <span className="font-bold tabular-nums">
                      {(batchNetByYarnKey[catalogKeyFromCone(coneData)] ?? 0).toFixed(3)}
                    </span>
                    <span className="text-gray-600"> / {MAX_NET_KG} kg</span>
                  </p>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Total weight (kg) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] flex-1 focus:border-purple-400"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
                    placeholder="e.g. 2.5"
                  />
                  <button
                    type="button"
                    onClick={handleFromScale}
                    disabled={fetchingWeight}
                    className="shrink-0 px-3 py-1.5 border border-purple-300 text-[11px] font-bold text-purple-800 rounded hover:bg-purple-50 disabled:opacity-50"
                  >
                    {fetchingWeight ? "…" : "From scale"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Tear weight (kg)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] w-full focus:border-purple-400"
                  value={totalTearWeight}
                  onChange={(e) => setTotalTearWeight(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Net (kg)</label>
                <input
                  type="text"
                  readOnly
                  className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[11px] w-full text-gray-800 font-semibold"
                  value={totalNetWeight}
                />
                <p className="text-[10px] text-gray-500 mt-1">Must be greater than 0 and at most {MAX_NET_KG} kg.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetFlow}
                  className="px-3 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssue}
                  className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50"
                  disabled={submitting || !issueBatchId}
                >
                  {submitting ? "Saving…" : `Issue to ${floorLabel}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
