"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { PoReturnHistoryPanel } from "./PoReturnHistoryPanel";
import { PoReturnWorkflowPanel } from "./PoReturnWorkflowPanel";
import {
  getPoQueryDateBounds,
  getErrorMessage,
  mapToPoOptions,
  sumPendingNetKg,
  type HistoryRow,
  type PendingRow,
  type PoOption,
} from "./poReturnHelpers";

/**
 * PO Return scan workflow: session, barcode staging, finalize, history.
 */
export function PoReturnClient() {
  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission("/yarn-management/purchase-management", "PO Return");

  const [poOptions, setPoOptions] = useState<PoOption[]>([]);
  const [poLoading, setPoLoading] = useState(true);
  const [poSearch, setPoSearch] = useState("");
  const [selectedPo, setSelectedPo] = useState<PoOption | null>(null);
  const [remark, setRemark] = useState("");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"return" | "history">("return");
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const fetchPos = useCallback(async () => {
    setPoLoading(true);
    try {
      const { start_date, end_date } = getPoQueryDateBounds();
      const raw = await yarnPurchaseOrderService.getPurchaseOrders({ start_date, end_date });
      const ordersData = Array.isArray(raw) ? raw : (raw.results ?? []);
      setPoOptions(mapToPoOptions(ordersData as unknown[]));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load purchase orders");
      setPoOptions([]);
    } finally {
      setPoLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (poNumber?: string) => {
    setHistoryLoading(true);
    try {
      const rows = await yarnPurchaseOrderService.getVendorReturnHistory(poNumber, 100);
      setHistoryRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load history");
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess || isLoading) return;
    void fetchPos();
  }, [canAccess, isLoading, fetchPos]);

  useEffect(() => {
    if (!canAccess || isLoading || activeTab !== "history") return;
    const po = selectedPo?.poNumber?.trim() || undefined;
    void fetchHistory(po);
  }, [canAccess, isLoading, activeTab, fetchHistory, selectedPo?.poNumber]);

  const filteredPoOptions = useMemo(() => {
    const q = poSearch.trim().toLowerCase();
    if (!q) return poOptions;
    return poOptions.filter(
      (p) =>
        p.poNumber.toLowerCase().includes(q) ||
        p.supplierLabel.toLowerCase().includes(q) ||
        p.currentStatus.toLowerCase().includes(q)
    );
  }, [poOptions, poSearch]);

  const resetSessionUi = useCallback(() => {
    setSessionId(null);
    setPendingRows([]);
    setBarcodeInput("");
    setWorkflowError(null);
  }, []);

  const handleStartSession = async () => {
    if (!selectedPo) {
      toast.error("Select a purchase order first");
      return;
    }
    setSessionBusy(true);
    try {
      const created = await yarnPurchaseOrderService.createVendorReturnSession({
        poNumber: selectedPo.poNumber,
        remark,
        cancellationIntent: "partial",
      });
      const id = String(created._id ?? created.id ?? "");
      if (!id) {
        throw new Error("Session created but no id returned");
      }
      setSessionId(id);
      setPendingRows([]);
      setWorkflowError(null);
      toast.success("Session started — scan ST cones for this PO");
    } catch (e) {
      const msg = getErrorMessage(e, "Could not start session");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  const handleAddBarcode = async () => {
    const bc = barcodeInput.trim();
    if (!bc || !sessionId) {
      toast.error("Enter a barcode and ensure a session is started");
      return;
    }
    setSessionBusy(true);
    try {
      const res = await yarnPurchaseOrderService.scanVendorReturnSession(sessionId, bc);
      const preview = res.conePreview as Record<string, unknown>;
      const row: PendingRow = {
        barcode: String(preview.barcode ?? bc),
        yarnName: String(preview.yarnName ?? "—"),
        lotNumber: String(preview.lotNumber ?? "—"),
        boxId: String(preview.boxId ?? "—"),
        coneWeight: Number(preview.coneWeight ?? 0),
        tearWeight: Number(preview.tearWeight ?? 0),
      };
      setPendingRows((prev) => {
        const next = prev.filter((r) => r.barcode !== row.barcode);
        next.push(row);
        return next;
      });
      setBarcodeInput("");
      setWorkflowError(null);
      toast.success(`Added ${row.barcode}`);
    } catch (e) {
      const msg = getErrorMessage(e, "Scan failed");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  const handleRemoveRow = async (barcode: string) => {
    if (!sessionId) return;
    setSessionBusy(true);
    try {
      await yarnPurchaseOrderService.removeVendorReturnSessionScan(sessionId, barcode);
      setPendingRows((prev) => prev.filter((r) => r.barcode !== barcode));
      setWorkflowError(null);
      toast.success(`Removed ${barcode}`);
    } catch (e) {
      const msg = getErrorMessage(e, "Remove failed");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!sessionId || pendingRows.length === 0) {
      toast.error("No cones to finalize");
      return;
    }
    const netKg = sumPendingNetKg(pendingRows);
    const ok = window.confirm(
      `Return ${pendingRows.length} cone(s) (${netKg.toFixed(3)} kg net) to vendor? This cannot be undone.`
    );
    if (!ok) return;
    setSessionBusy(true);
    try {
      await yarnPurchaseOrderService.finalizeVendorReturnSession(sessionId);
      setWorkflowError(null);
      toast.success("Vendor return completed — inventory updated");
      resetSessionUi();
      void fetchHistory(selectedPo?.poNumber?.trim());
      void fetchPos();
    } catch (e) {
      const msg = getErrorMessage(e, "Finalize failed");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="box border border-gray-100">
        <div className="box-body text-center py-12">
          <p className="text-sm text-gray-600">You don&apos;t have permission to access PO Return.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2" role="tablist" aria-label="PO Return sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "return"}
          className={`text-xs font-semibold px-3 py-1.5 rounded ${
            activeTab === "return" ? "bg-purple-100 text-purple-800" : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("return")}
        >
          Return to vendor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "history"}
          className={`text-xs font-semibold px-3 py-1.5 rounded ${
            activeTab === "history" ? "bg-purple-100 text-purple-800" : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("history")}
        >
          History
          {selectedPo && (
            <span className="ml-1 text-[10px] font-normal text-gray-500">(PO filter)</span>
          )}
        </button>
      </div>

      {activeTab === "return" && (
        <PoReturnWorkflowPanel
          workflowError={workflowError}
          onDismissWorkflowError={() => setWorkflowError(null)}
          poSearch={poSearch}
          onPoSearchChange={setPoSearch}
          poLoading={poLoading}
          filteredPoOptions={filteredPoOptions}
          selectedPo={selectedPo}
          onSelectPo={(po) => {
            setSelectedPo(po);
            resetSessionUi();
          }}
          remark={remark}
          onRemarkChange={setRemark}
          sessionBusy={sessionBusy}
          sessionId={sessionId}
          onStartSession={handleStartSession}
          onClearSessionLocal={() => {
            resetSessionUi();
            toast("Session cleared locally — create a new session to continue");
          }}
          barcodeInput={barcodeInput}
          onBarcodeInputChange={(v) => {
            setWorkflowError(null);
            setBarcodeInput(v);
          }}
          onAddBarcode={handleAddBarcode}
          pendingRows={pendingRows}
          onRemoveRow={handleRemoveRow}
          onFinalize={handleFinalize}
        />
      )}

      {activeTab === "history" && (
        <>
          {selectedPo && (
            <p className="text-[11px] text-gray-600 px-0.5">
              Showing returns for <span className="font-mono font-semibold">{selectedPo.poNumber}</span>.
              Clear the PO selection on the Return tab to load all returns (select another PO or use search).
            </p>
          )}
          <PoReturnHistoryPanel
            historyLoading={historyLoading}
            historyRows={historyRows}
            onRefresh={() => void fetchHistory(selectedPo?.poNumber?.trim())}
          />
        </>
      )}
    </div>
  );
}
