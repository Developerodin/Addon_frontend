"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import { PoVendorReturnConfirmModal } from "./PoVendorReturnConfirmModal";
import { PoVendorReturnHistoryTable } from "./PoVendorReturnHistoryTable";
import {
  getPoQueryDateBounds,
  lotsFromPo,
  supplierLabelFromPo,
  type VendorReturnSummary,
} from "./vendorReturnWizardUtils";

const MODAL_STEPS = 4;

/**
 * Renders the PO Return wizard: preview, multi-step confirm, finalize, and history tab.
 */
export function PoReturnWizard() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [poRows, setPoRows] = useState<Record<string, unknown>[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [poFilter, setPoFilter] = useState("");

  const [selectedPoNumber, setSelectedPoNumber] = useState("");
  const [scope, setScope] = useState<"entire_po" | "lots">("entire_po");
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [remark, setRemark] = useState("");
  const [cancellationIntent, setCancellationIntent] = useState<"partial" | "full_po">("full_po");

  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(0);
  const [typedAck, setTypedAck] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const [historyRows, setHistoryRows] = useState<Record<string, unknown>[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPos = useCallback(async () => {
    setListLoading(true);
    try {
      const { start_date, end_date } = getPoQueryDateBounds();
      const raw = await yarnPurchaseOrderService.getPurchaseOrders({ start_date, end_date });
      const ordersData = Array.isArray(raw) ? raw : raw.results ?? [];
      setPoRows(ordersData as Record<string, unknown>[]);
    } catch (err) {
      console.error("[PoReturnWizard] PO list failed", err);
      toast.error(err instanceof Error ? err.message : "Could not load POs");
      setPoRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const rows = await yarnPurchaseOrderService.getVendorReturnHistory(undefined, 80);
      setHistoryRows(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[PoReturnWizard] history failed", err);
      toast.error(err instanceof Error ? err.message : "Could not load history");
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPos();
  }, [loadPos]);

  useEffect(() => {
    if (tab === "history") void loadHistory();
  }, [tab, loadHistory]);

  const filteredPos = useMemo(() => {
    const q = poFilter.trim().toLowerCase();
    if (!q) return poRows;
    return poRows.filter((o) => {
      const num = String(o.poNumber ?? "").toLowerCase();
      const sup = supplierLabelFromPo(o).toLowerCase();
      return num.includes(q) || sup.includes(q);
    });
  }, [poRows, poFilter]);

  const selectedPo = useMemo(
    () => poRows.find((o) => String(o.poNumber ?? "") === selectedPoNumber) ?? null,
    [poRows, selectedPoNumber]
  );

  const availableLots = useMemo(
    () => (selectedPo ? lotsFromPo(selectedPo) : []),
    [selectedPo]
  );

  useEffect(() => {
    setPreview(null);
    setSelectedLots([]);
  }, [selectedPoNumber, scope]);

  const toggleLot = useCallback((ln: string) => {
    setSelectedLots((prev) =>
      prev.includes(ln) ? prev.filter((x) => x !== ln) : [...prev, ln]
    );
  }, []);

  const runPreview = useCallback(async () => {
    if (!selectedPoNumber.trim()) {
      toast.error("Select a PO");
      return;
    }
    if (scope === "lots" && selectedLots.length === 0) {
      toast.error("Select at least one lot");
      return;
    }
    setPreviewLoading(true);
    try {
      const lot_numbers = scope === "lots" ? selectedLots.join(",") : undefined;
      const data = await yarnPurchaseOrderService.getVendorReturnPreview({
        po_number: selectedPoNumber.trim(),
        scope,
        lot_numbers,
      });
      setPreview(data);
      if (data.canFinalize === false) {
        toast.error(
          "Vendor return blocked: yarn is issued or used on this PO/lot. Administrator approval is required — see the alert below."
        );
      } else {
        toast.success("Preview updated");
      }
    } catch (err) {
      console.error("[PoReturnWizard] preview failed", err);
      toast.error(err instanceof Error ? err.message : "Preview failed");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedPoNumber, scope, selectedLots]);

  const summary = preview?.summary as VendorReturnSummary | undefined;
  const poSummary = preview?.poSummary as Record<string, unknown> | undefined;
  const canFinalize = preview?.canFinalize === true;

  const headline = useMemo(() => {
    if (!summary) return "";
    const st = summary.shortTerm;
    const lt = summary.longTerm;
    const un = summary.unallocated;
    return `ST: ${st?.eligibleConeCount ?? 0} cones (${st?.coneNetWeight ?? 0} kg net), ${st?.boxCount ?? 0} boxes · LT: ${lt?.boxCount ?? 0} boxes · Unalloc: ${un?.boxCount ?? 0} boxes`;
  }, [summary]);

  const closeModal = useCallback(() => {
    if (finalizing) return;
    setModalOpen(false);
    setModalStep(0);
    setTypedAck("");
  }, [finalizing]);

  const openConfirmFlow = useCallback(() => {
    if (!preview) {
      toast.error("Load preview first");
      return;
    }
    if (!canFinalize) {
      toast.error("Resolve blockers before continuing");
      return;
    }
    setTypedAck("");
    setModalStep(0);
    setModalOpen(true);
  }, [preview, canFinalize]);

  const executeFinalize = useCallback(async () => {
    if (!selectedPoNumber.trim()) return;
    setFinalizing(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `vr-${Date.now()}`;
      const result = await yarnPurchaseOrderService.finalizeVendorReturn({
        poNumber: selectedPoNumber.trim(),
        scope,
        lotNumbers: scope === "lots" ? selectedLots : [],
        remark,
        cancellationIntent,
        includeLongTermBoxes: true,
        idempotencyKey,
      });
      toast.success(String(result.message ?? "Vendor return recorded"));
      setModalOpen(false);
      setPreview(null);
      void loadPos();
      void loadHistory();
    } catch (err) {
      console.error("[PoReturnWizard] finalize failed", err);
      toast.error(err instanceof Error ? err.message : "Finalize failed");
    } finally {
      setFinalizing(false);
    }
  }, [
    selectedPoNumber,
    scope,
    selectedLots,
    remark,
    cancellationIntent,
    loadPos,
    loadHistory,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
            tab === "new"
              ? "bg-purple-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          aria-pressed={tab === "new"}
        >
          New return
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
            tab === "history"
              ? "bg-purple-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          aria-pressed={tab === "history"}
        >
          History
        </button>
      </div>

      {tab === "new" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-gray-900">1. Select PO &amp; scope</h2>
            <div>
              <label htmlFor="po-return-po-filter" className="block text-[11px] font-medium text-gray-600 mb-1">
                Search PO / supplier
              </label>
              <input
                id="po-return-po-filter"
                type="search"
                value={poFilter}
                onChange={(e) => setPoFilter(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                placeholder="Filter list…"
              />
            </div>
            <div>
              <label htmlFor="po-return-select" className="block text-[11px] font-medium text-gray-600 mb-1">
                Purchase order
              </label>
              <select
                id="po-return-select"
                value={selectedPoNumber}
                onChange={(e) => setSelectedPoNumber(e.target.value)}
                disabled={listLoading}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
              >
                <option value="">— Select —</option>
                {filteredPos.map((o) => {
                  const pn = String(o.poNumber ?? "");
                  return (
                    <option key={String(o._id ?? pn)} value={pn}>
                      {pn} — {supplierLabelFromPo(o)}
                    </option>
                  );
                })}
              </select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[11px] font-medium text-gray-600">Return scope</legend>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="vr-scope"
                  checked={scope === "entire_po"}
                  onChange={() => setScope("entire_po")}
                  className="text-purple-600"
                />
                Entire PO (all ST, LT, and unallocated stock for this PO)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="vr-scope"
                  checked={scope === "lots"}
                  onChange={() => setScope("lots")}
                  className="text-purple-600"
                />
                Selected lot(s) — all boxes and cones in those lots
              </label>
            </fieldset>

            {scope === "lots" && (
              <div
                className="rounded-md border border-gray-100 p-2 max-h-40 overflow-y-auto"
                role="group"
                aria-label="Lots to return"
              >
                {availableLots.length === 0 ? (
                  <p className="text-[11px] text-gray-500">No received lots on this PO.</p>
                ) : (
                  availableLots.map((ln) => (
                    <label key={ln} className="flex items-center gap-2 py-0.5 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedLots.includes(ln)}
                        onChange={() => toggleLot(ln)}
                        className="rounded text-purple-600"
                      />
                      {ln}
                    </label>
                  ))
                )}
              </div>
            )}

            <div>
              <label htmlFor="po-return-remark" className="block text-[11px] font-medium text-gray-600 mb-1">
                Remark (issue / reason)
              </label>
              <textarea
                id="po-return-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                placeholder="Describe defect or return reason…"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[11px] font-medium text-gray-600">ERP cancellation intent</legend>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="vr-cancel"
                  checked={cancellationIntent === "full_po"}
                  onChange={() => setCancellationIntent("full_po")}
                  className="text-purple-600"
                />
                Full PO cancellation (in ERP)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="vr-cancel"
                  checked={cancellationIntent === "partial"}
                  onChange={() => setCancellationIntent("partial")}
                  className="text-purple-600"
                />
                Partial cancellation (in ERP)
              </label>
            </fieldset>

            <button
              type="button"
              onClick={() => void runPreview()}
              disabled={previewLoading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {previewLoading ? "Loading preview…" : "Load preview"}
            </button>
            {selectedPo && (
              <Link
                href={`/yarn-management/purchase-management/purchase/edit/${String(selectedPo._id ?? "")}`}
                className="ml-2 text-xs font-semibold text-purple-600 hover:underline"
              >
                Open PO
              </Link>
            )}
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-gray-900">2. Summary</h2>
            {!preview && (
              <p className="text-[11px] text-gray-500">Load preview to see ST / LT / unallocated and PO details.</p>
            )}
            {preview && (
              <>
                {!canFinalize && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-xs text-red-950 shadow-sm space-y-2"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-red-900">
                      Cannot return — issued or used cones
                    </p>
                    <p className="leading-relaxed font-medium">
                      {String(
                        preview.finalizeBlockedReason ??
                          "Cones on this PO or lot are already issued or used; this stock cannot be removed without administrator approval."
                      )}
                    </p>
                    <p className="text-[11px] text-red-800/90">
                      Return cones to storage from the shop floor first, or contact an administrator if an exception is required.
                    </p>
                  </div>
                )}
                {canFinalize && (
                  <p className="text-[11px] font-medium text-green-700">Ready to confirm return.</p>
                )}
                <div className="rounded-md bg-gray-50 p-3 text-[11px] text-gray-800 space-y-1">
                  <p>
                    <span className="font-semibold">PO:</span> {String(preview.poNumber)} ·{" "}
                    <span className="font-semibold">Scope:</span> {scope}
                  </p>
                  <p className="font-mono text-[10px] text-gray-600">{headline}</p>
                </div>
                {poSummary && (
                  <div className="rounded-md border border-gray-100 p-3 text-[11px] space-y-1" aria-label="PO document summary">
                    <p className="font-semibold text-gray-800">PO document</p>
                    <p>Status: {String(poSummary.currentStatus)} · Total: ₹{Number(poSummary.total ?? 0).toLocaleString()}</p>
                    <p>
                      Received lots:{" "}
                      {String((poSummary.receivedRollup as { lotCount?: number })?.lotCount ?? 0)} · Weight rollup:{" "}
                      {(poSummary.receivedRollup as { totalWeight?: number })?.totalWeight ?? "—"}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={openConfirmFlow}
                  disabled={!canFinalize}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40"
                >
                  Start confirmations ({MODAL_STEPS} steps)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <PoVendorReturnHistoryTable historyLoading={historyLoading} historyRows={historyRows} />
      )}

      <PoVendorReturnConfirmModal
        open={modalOpen}
        onClose={closeModal}
        modalStep={modalStep}
        modalTotalSteps={MODAL_STEPS}
        headline={headline}
        selectedPoNumber={selectedPoNumber}
        scope={scope}
        typedAck={typedAck}
        onTypedAckChange={setTypedAck}
        onNextStep={() => setModalStep((s) => s + 1)}
        onFinalize={() => void executeFinalize()}
        finalizing={finalizing}
      />
    </div>
  );
}
