"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import vendorPurchaseOrderService from "@/shared/services/vendorPurchaseOrderService";
import vendorPoReturnService, {
  type VendorPoReturnArticleCandidate,
  type VendorPoReturnArticleBox,
} from "@/shared/services/vendorPoReturnService";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { VendorPoReturnWorkflowPanel } from "./VendorPoReturnWorkflowPanel";
import { VendorPoReturnChallanPanel } from "./VendorPoReturnChallanPanel";
import {
  getErrorMessage,
  mapToVpoOptions,
  sumPendingReturnUnits,
  type PendingArticleQtyRow,
  type PendingBoxRow,
  type VpoOption,
} from "./vendorPoReturnHelpers";

/**
 * Vendor PO return workflow + challan history (single page, tabbed).
 */
export function VendorPoReturnClient() {
  const searchParams = useSearchParams();
  const urlVpoNumber = searchParams.get("vpoNumber")?.trim() || "";
  const urlSessionId = searchParams.get("sessionId")?.trim() || "";

  const { hasSubPermission, isLoading } = useNavigation();
  const canAccessReturn = hasSubPermission("/vendor-po", "Vendor PO Return");
  const canAccessChallan = hasSubPermission("/vendor-po", "Vendor PO Return Challan");

  const [poOptions, setPoOptions] = useState<VpoOption[]>([]);
  const [poLoading, setPoLoading] = useState(true);
  const [poSearch, setPoSearch] = useState("");
  const [selectedPo, setSelectedPo] = useState<VpoOption | null>(null);
  const [remark, setRemark] = useState("");
  const [cancellationIntent, setCancellationIntent] = useState<"partial" | "full_vpo">("partial");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [pendingBoxes, setPendingBoxes] = useState<PendingBoxRow[]>([]);
  const [pendingArticleQtyLines, setPendingArticleQtyLines] = useState<PendingArticleQtyRow[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  const [articleCandidates, setArticleCandidates] = useState<VendorPoReturnArticleCandidate[]>([]);
  const [articleCandidatesLoading, setArticleCandidatesLoading] = useState(false);
  const [articleDraftFlowId, setArticleDraftFlowId] = useState("");
  const [articleDraftQty, setArticleDraftQty] = useState("");
  const [articleBoxes, setArticleBoxes] = useState<VendorPoReturnArticleBox[]>([]);
  const [articleBoxesLoading, setArticleBoxesLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"return" | "challan">(
    canAccessReturn ? "return" : "challan"
  );
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const urlPrefillDone = useRef(false);
  const sessionResumeDone = useRef(false);

  const fetchVpos = useCallback(async () => {
    setPoLoading(true);
    try {
      const res = await vendorPurchaseOrderService.list({
        limit: 200,
        sortBy: "createdAt:desc",
        populate: "vendor",
      });
      setPoOptions(mapToVpoOptions(res.results || []));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, "Could not load vendor POs"));
      setPoOptions([]);
    } finally {
      setPoLoading(false);
    }
  }, []);

  const fetchArticleCandidates = useCallback(async (vpoNumber?: string) => {
    const vpo = vpoNumber?.trim();
    if (!vpo) {
      setArticleCandidates([]);
      return;
    }
    setArticleCandidatesLoading(true);
    try {
      const res = await vendorPoReturnService.getArticleCandidates(vpo);
      setArticleCandidates(res.results || []);
    } catch (e) {
      console.error(e);
      setArticleCandidates([]);
    } finally {
      setArticleCandidatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((!canAccessReturn && !canAccessChallan) || isLoading) return;
    void fetchVpos();
  }, [canAccessReturn, canAccessChallan, isLoading, fetchVpos]);

  useEffect(() => {
    if (!canAccessReturn || !selectedPo?.vpoNumber) return;
    void fetchArticleCandidates(selectedPo.vpoNumber);
  }, [canAccessReturn, selectedPo?.vpoNumber, fetchArticleCandidates]);

  /** Load the boxes for the selected article so the user can pick which boxes to return. */
  useEffect(() => {
    const vpo = selectedPo?.vpoNumber?.trim();
    if (!canAccessReturn || !vpo || !articleDraftFlowId) {
      setArticleBoxes([]);
      return;
    }
    let cancelled = false;
    setArticleBoxesLoading(true);
    void (async () => {
      try {
        const res = await vendorPoReturnService.getArticleBoxes(vpo, articleDraftFlowId);
        if (!cancelled) setArticleBoxes(res.results || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setArticleBoxes([]);
      } finally {
        if (!cancelled) setArticleBoxesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAccessReturn, selectedPo?.vpoNumber, articleDraftFlowId]);

  useEffect(() => {
    if (!canAccessReturn || poLoading || urlPrefillDone.current || !urlVpoNumber || poOptions.length === 0) return;
    const match = poOptions.find((p) => p.vpoNumber === urlVpoNumber);
    if (match) setSelectedPo(match);
    urlPrefillDone.current = true;
  }, [canAccessReturn, poLoading, urlVpoNumber, poOptions]);

  useEffect(() => {
    if (!canAccessReturn || sessionResumeDone.current || !urlSessionId) return;
    sessionResumeDone.current = true;
    void (async () => {
      try {
        const res = await vendorPoReturnService.getSession(urlSessionId);
        setSessionId(urlSessionId);
        setPendingBoxes(res.pendingRows || []);
        setPendingArticleQtyLines(res.pendingArticleQtyLines || res.pendingM4Lines?.map((l) => ({
          vendorProductionFlowId: l.vendorProductionFlowId,
          lotNumber: l.lotNumber,
          quantity: l.m4Quantity,
        })) || []);
        setWorkflowError(null);
        const count = (res.pendingRows?.length || 0) + (res.pendingArticleQtyLines?.length || 0);
        toast.success(`Resumed return session (${count} item(s))`);
      } catch (e) {
        const msg = getErrorMessage(e, "Could not resume session");
        setWorkflowError(msg);
        toast.error(msg);
      }
    })();
  }, [canAccessReturn, urlSessionId]);

  const filteredPoOptions = useMemo(() => {
    const q = poSearch.trim().toLowerCase();
    if (!q) return poOptions;
    return poOptions.filter(
      (p) =>
        p.vpoNumber.toLowerCase().includes(q) ||
        p.vendorLabel.toLowerCase().includes(q) ||
        p.currentStatus.toLowerCase().includes(q)
    );
  }, [poOptions, poSearch]);

  const resetSessionUi = useCallback(() => {
    setSessionId(null);
    setPendingBoxes([]);
    setPendingArticleQtyLines([]);
    setBarcodeInput("");
    setArticleDraftFlowId("");
    setArticleDraftQty("");
    setArticleBoxes([]);
    setWorkflowError(null);
  }, []);

  const handleStartSession = async () => {
    if (!selectedPo) {
      toast.error("Select a vendor PO first");
      return;
    }
    setSessionBusy(true);
    try {
      const created = await vendorPoReturnService.createSession({
        vpoNumber: selectedPo.vpoNumber,
        remark,
        cancellationIntent,
      });
      const id = String(created.id ?? created._id ?? "");
      if (!id) throw new Error("Session created but no id returned");
      setSessionId(id);
      setPendingBoxes([]);
      setPendingArticleQtyLines([]);
      setWorkflowError(null);
      toast.success("Session started — scan boxes or enter article quantity");
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
      const res = await vendorPoReturnService.scanBarcode(sessionId, bc);
      const preview = res.boxPreview;
      setPendingBoxes((prev) => {
        const next = prev.filter((r) => r.barcode !== preview.barcode);
        next.push(preview);
        return next;
      });
      setBarcodeInput("");
      setWorkflowError(null);
      toast.success(`Added ${preview.barcode}`);
    } catch (e) {
      const msg = getErrorMessage(e, "Scan failed");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  const handleRemoveBox = async (barcode: string) => {
    if (!sessionId) return;
    setSessionBusy(true);
    try {
      await vendorPoReturnService.removeBarcode(sessionId, barcode);
      setPendingBoxes((prev) => prev.filter((r) => r.barcode !== barcode));
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

  const handleAddArticleQtyLine = async () => {
    if (!sessionId || !articleDraftFlowId) return;
    const qty = Number(articleDraftQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const candidate = articleCandidates.find((c) => c.flowId === articleDraftFlowId);
    /** Maximum return validation — never allow more than the verified available quantity. */
    const maxAvailable = candidate?.verifiedAvailable;
    if (typeof maxAvailable === "number" && qty > maxAvailable) {
      toast.error(`Cannot return more than ${maxAvailable} available unit(s) for this article`);
      return;
    }
    setSessionBusy(true);
    try {
      await vendorPoReturnService.addArticleQtyLine(sessionId, {
        vendorProductionFlowId: articleDraftFlowId,
        quantity: qty,
        lotNumber: candidate?.referenceCode,
      });
      setPendingArticleQtyLines((prev) => {
        const next = prev.filter((r) => r.vendorProductionFlowId !== articleDraftFlowId);
        next.push({
          vendorProductionFlowId: articleDraftFlowId,
          lotNumber: candidate?.referenceCode || "",
          quantity: Math.round(qty),
          productName: candidate?.productName,
          vendorCode: candidate?.vendorCode,
          referenceCode: candidate?.referenceCode,
          verifiedAvailable: candidate?.verifiedAvailable,
          breakdown: candidate?.breakdown,
        });
        return next;
      });
      setArticleDraftQty("");
      setWorkflowError(null);
      toast.success("Article quantity staged");
    } catch (e) {
      const msg = getErrorMessage(e, "Could not stage article quantity");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  /**
   * Toggle a specific box into / out of the return (article-wise box selection).
   * Selecting stages the box via the scan endpoint; unselecting removes it.
   */
  const handleToggleArticleBox = async (box: VendorPoReturnArticleBox, selected: boolean) => {
    if (!sessionId) {
      toast.error("Start a session first");
      return;
    }
    setSessionBusy(true);
    try {
      if (selected) {
        const res = await vendorPoReturnService.scanBarcode(sessionId, box.barcode);
        const preview = res.boxPreview;
        setPendingBoxes((prev) => {
          const next = prev.filter((r) => r.barcode !== preview.barcode);
          next.push(preview);
          return next;
        });
        toast.success(`Box ${preview.boxId || preview.barcode} added`);
      } else {
        await vendorPoReturnService.removeBarcode(sessionId, box.barcode);
        setPendingBoxes((prev) => prev.filter((r) => r.barcode !== box.barcode));
        toast.success(`Box ${box.boxId || box.barcode} removed`);
      }
      setWorkflowError(null);
    } catch (e) {
      const msg = getErrorMessage(e, "Could not update box selection");
      setWorkflowError(msg);
      toast.error(msg);
    } finally {
      setSessionBusy(false);
    }
  };

  const handleRemoveArticleQty = async (flowId: string) => {
    if (!sessionId) return;
    setSessionBusy(true);
    try {
      await vendorPoReturnService.removeArticleQtyLine(sessionId, flowId);
      setPendingArticleQtyLines((prev) => prev.filter((r) => r.vendorProductionFlowId !== flowId));
      toast.success("Article line removed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Remove failed"));
    } finally {
      setSessionBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!sessionId) return;
    const totals = sumPendingReturnUnits(pendingBoxes, pendingArticleQtyLines);
    if (totals.boxCount === 0 && totals.articleQtyUnits === 0) {
      toast.error("Scan at least one box or enter article quantity");
      return;
    }
    const ok = window.confirm(
      `Return ${totals.boxCount} box(es) and ${totals.articleQtyUnits} verified unit(s) to vendor? This cannot be undone.`
    );
    if (!ok) return;
    setSessionBusy(true);
    try {
      const result = await vendorPoReturnService.finalizeSession(sessionId);
      setWorkflowError(null);
      const challanNo = result.challan?.challanNumber;
      if (challanNo) toast.success(`Return completed — Challan ${challanNo} issued`);
      else toast.success("Return completed");
      resetSessionUi();
      void fetchVpos();
      void fetchArticleCandidates(selectedPo?.vpoNumber);
      setActiveTab("challan");
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!canAccessReturn && !canAccessChallan) {
    return (
      <div className="box border border-gray-100">
        <div className="box-body text-center py-12">
          <p className="text-sm text-gray-600">You don&apos;t have permission to access Vendor PO Return.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2" role="tablist" aria-label="Vendor PO Return sections">
        {canAccessReturn && (
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
        )}
        {canAccessChallan && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "challan"}
            className={`text-xs font-semibold px-3 py-1.5 rounded ${
              activeTab === "challan" ? "bg-purple-100 text-purple-800" : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("challan")}
          >
            Return challan history
          </button>
        )}
      </div>

      {activeTab === "return" && canAccessReturn && (
        <VendorPoReturnWorkflowPanel
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
          cancellationIntent={cancellationIntent}
          onCancellationIntentChange={setCancellationIntent}
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
          pendingBoxes={pendingBoxes}
          pendingArticleQtyLines={pendingArticleQtyLines}
          onRemoveBox={handleRemoveBox}
          onRemoveArticleQty={handleRemoveArticleQty}
          onFinalize={handleFinalize}
          articleCandidates={articleCandidates}
          articleCandidatesLoading={articleCandidatesLoading}
          articleDraftFlowId={articleDraftFlowId}
          onArticleDraftFlowIdChange={setArticleDraftFlowId}
          articleDraftQty={articleDraftQty}
          onArticleDraftQtyChange={setArticleDraftQty}
          onAddArticleQtyLine={handleAddArticleQtyLine}
          articleBoxes={articleBoxes}
          articleBoxesLoading={articleBoxesLoading}
          stagedBarcodes={pendingBoxes.map((b) => b.barcode)}
          onToggleArticleBox={handleToggleArticleBox}
        />
      )}

      {activeTab === "challan" && canAccessChallan && (
        <VendorPoReturnChallanPanel vpoNumberFilter={selectedPo?.vpoNumber} />
      )}
    </div>
  );
}
