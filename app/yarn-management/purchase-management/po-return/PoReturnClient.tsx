"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, {
  type QcPendingVendorReturnInfo,
} from "@/shared/services/yarnPurchaseOrderService";
import poReturnChallanService, { PoReturnChallan } from "@/shared/services/poReturnChallanService";
import { printChallanDocument } from "@/shared/utils/poReturnChallanPrint";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import ChallanDetailDrawer from "@/shared/components/po-return-challan/ChallanDetailDrawer";
import { PoReturnHistoryPanel } from "./PoReturnHistoryPanel";
import { PoReturnWorkflowPanel } from "./PoReturnWorkflowPanel";
import {
  getPoQueryDateBounds,
  getErrorMessage,
  mapToPoOptions,
  sumPendingNetKg,
  type PendingRow,
  type PoOption,
} from "./poReturnHelpers";

/**
 * PO Return scan workflow: session, barcode staging, finalize, history.
 */
export function PoReturnClient() {
  const searchParams = useSearchParams();
  const urlPoNumber = searchParams.get("poNumber")?.trim() || "";
  const urlLot = searchParams.get("lot")?.trim() || "";
  const urlSessionId = searchParams.get("sessionId")?.trim() || "";

  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission("/yarn-management/purchase-management", "PO Return");
  const canAccessChallanHistory = hasSubPermission(
    "/yarn-management/purchase-management",
    "PO Return Challan"
  );

  const [poOptions, setPoOptions] = useState<PoOption[]>([]);
  const [poLoading, setPoLoading] = useState(true);
  const [poSearch, setPoSearch] = useState("");
  const [selectedPo, setSelectedPo] = useState<PoOption | null>(null);
  const [remark, setRemark] = useState("");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  const [challanRows, setChallanRows] = useState<PoReturnChallan[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"return" | "history">("return");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [activeChallan, setActiveChallan] = useState<PoReturnChallan | null>(null);
  const [qcPending, setQcPending] = useState<QcPendingVendorReturnInfo | null>(null);
  const urlPrefillDone = useRef(false);
  const sessionResumeDone = useRef(false);

  const fetchQcPending = useCallback(async (poNumber?: string) => {
    const po = poNumber?.trim();
    if (!po) {
      setQcPending(null);
      return;
    }
    try {
      const info = await yarnPurchaseOrderService.getQcPendingVendorReturns(po);
      setQcPending(info);
    } catch (e) {
      console.error(e);
      setQcPending(null);
    }
  }, []);

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

  const fetchChallanPreview = useCallback(async (poNumber?: string) => {
    if (!canAccessChallanHistory) {
      setChallanRows([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await poReturnChallanService.listChallans({
        poNumber: poNumber?.trim() || undefined,
        page: 1,
        limit: 5,
        sortBy: "createdAt:desc",
      });
      setChallanRows(res.results || []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load challan history");
      setChallanRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [canAccessChallanHistory]);

  useEffect(() => {
    if (!canAccess || isLoading) return;
    void fetchPos();
  }, [canAccess, isLoading, fetchPos]);

  useEffect(() => {
    if (!canAccess || isLoading || activeTab !== "history") return;
    const po = selectedPo?.poNumber?.trim() || undefined;
    void fetchChallanPreview(po);
  }, [canAccess, isLoading, activeTab, fetchChallanPreview, selectedPo?.poNumber]);

  useEffect(() => {
    if (!canAccess || isLoading || poLoading) return;
    void fetchQcPending(selectedPo?.poNumber);
  }, [canAccess, isLoading, poLoading, selectedPo?.poNumber, fetchQcPending]);

  useEffect(() => {
    if (!canAccess || poLoading || urlPrefillDone.current || !urlPoNumber || poOptions.length === 0) return;
    const match = poOptions.find((p) => p.poNumber === urlPoNumber);
    if (match) {
      setSelectedPo(match);
      if (urlLot) setPoSearch(urlLot);
    }
    urlPrefillDone.current = true;
  }, [canAccess, poLoading, urlPoNumber, urlLot, poOptions]);

  useEffect(() => {
    if (!canAccess || sessionResumeDone.current || !urlSessionId) return;
    sessionResumeDone.current = true;
    void (async () => {
      try {
        const res = await yarnPurchaseOrderService.getVendorReturnSession(urlSessionId);
        setSessionId(urlSessionId);
        setPendingRows(res.pendingRows as PendingRow[]);
        setWorkflowError(null);
        toast.success(`Resumed QC return session (${res.pendingRows.length} cone(s) staged)`);
      } catch (e) {
        const msg = getErrorMessage(e, "Could not resume session");
        setWorkflowError(msg);
        toast.error(msg);
      }
    })();
  }, [canAccess, urlSessionId]);

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
      const result = await yarnPurchaseOrderService.finalizeVendorReturnSession(sessionId);
      setWorkflowError(null);
      const challan = result.challan as PoReturnChallan | undefined;
      const challanNo = challan?.challanNumber;
      if (challanNo) {
        toast.success(`Vendor return completed — Challan ${challanNo} issued`);
      } else {
        toast.success("Vendor return completed — inventory updated");
      }
      resetSessionUi();
      void fetchChallanPreview(selectedPo?.poNumber?.trim());
      void fetchPos();
      void fetchQcPending(selectedPo?.poNumber);
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

  const handleViewChallan = async (row: PoReturnChallan) => {
    try {
      const full = await poReturnChallanService.getChallanById(row.id);
      setActiveChallan(full);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load challan");
    }
  };

  const handlePrintChallan = async (row: PoReturnChallan) => {
    try {
      const full = await poReturnChallanService.getChallanById(row.id);
      await printChallanDocument(full);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Print failed");
    }
  };

  return (
    <div className="space-y-4">
      {canAccessChallanHistory && (
        <div className="flex justify-end">
          <Link
            href="/yarn-management/purchase-management/po-return-challan"
            className="text-[11px] font-bold text-purple-700 hover:underline"
          >
            Return Challan History
          </Link>
        </div>
      )}
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
          qcPending={qcPending}
          deepLinkLot={urlLot || null}
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
          {!canAccessChallanHistory ? (
            <p className="text-xs text-gray-500">
              You need the &quot;PO Return Challan&quot; permission to view return challan history here.
            </p>
          ) : (
            <PoReturnHistoryPanel
              historyLoading={historyLoading}
              challanRows={challanRows}
              onRefresh={() => void fetchChallanPreview(selectedPo?.poNumber?.trim())}
              onView={handleViewChallan}
              onPrint={handlePrintChallan}
              canAccessChallanHistory={canAccessChallanHistory}
            />
          )}
        </>
      )}

      <ChallanDetailDrawer challan={activeChallan} onClose={() => setActiveChallan(null)} />
    </div>
  );
}
