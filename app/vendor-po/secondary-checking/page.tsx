"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import vendorProductionFlowService, {
  VendorProductionFlow,
  mergeProductionFlowPreservePopulatedRefs,
} from "@/shared/services/vendorProductionFlowService";
import type { ScanAcceptResponse } from "@/shared/services/vendorBoxService";
import {
  VendorSecondaryCheckingProcessDrawer,
  type VendorSecondaryCheckingProcessData,
} from "./components/VendorSecondaryCheckingProcessDrawer";
import { VendorSecondaryCheckingScanDrawer } from "./components/VendorSecondaryCheckingScanDrawer";
import {
  VendorSecondaryCheckingM1StagingModal,
  type PendingSecondaryCheckingPatch,
} from "./components/VendorSecondaryCheckingM1StagingModal";
import { VendorSecondaryCheckingOrderTab } from "./components/VendorSecondaryCheckingOrderTab";
import { VendorSecondaryCheckingArticleTab } from "./components/VendorSecondaryCheckingArticleTab";
import { VendorSecondaryCheckingUpcomingTab } from "./components/VendorSecondaryCheckingUpcomingTab";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";
import { getFlowId, getVpoId } from "./utils/groupVendorScFlows";
import { m1RemainingForTransfer } from "./utils/m1Staging";
import { evaluateSecondaryCheckingSave } from "./utils/evaluateSecondaryCheckingSave";
import vendorGrnService from "@/shared/services/vendorGrnService";

type SecondaryCheckingTab = "orders" | "article-view" | "upcoming";

const SecondaryCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SecondaryCheckingTab>("article-view");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [highlightFlowId, setHighlightFlowId] = useState<string | null>(null);
  const [highlightVpoId, setHighlightVpoId] = useState<string | null>(null);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);
  const [scanDrawerOpen, setScanDrawerOpen] = useState(false);

  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] =
    useState<VendorSecondaryCheckingProcessData>({});
  const [saving, setSaving] = useState(false);
  const [processDrawerFetching, setProcessDrawerFetching] = useState(false);
  const processDrawerSessionRef = useRef(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFlows = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await vendorProductionFlowService.list(
        productionFlowListParams("secondaryChecking"),
      );
      setFlows(data.results || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load production flows");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setM1StagingModalOpen(false);
    setM1StagingFlow(null);
    setM1StagingPatch(null);
    setM1StagingDisplayTotals(null);
    setM1StagingRequireContainer(false);
    setM1StagingPlannedQtyHint(0);
    const session = ++processDrawerSessionRef.current;
    setIsProcessing(true);
    setProcessDrawerFetching(true);
    setSelectedFlow(null);
    setProcessingData({});
    void (async () => {
      try {
        const fresh = await vendorProductionFlowService.getById(flow.id);
        if (session !== processDrawerSessionRef.current) return;
        setSelectedFlow(fresh);
        setFlows((prev) => prev.map((f) => (f.id === fresh.id ? fresh : f)));
        const q = fresh.floorQuantities.secondaryChecking;
        setProcessingData({
          received: q.received || 0,
          repairStatus: q.repairStatus || "NOT_REQUIRED",
          repairRemarks: q.repairRemarks || "",
        });
      } catch (err: unknown) {
        if (session !== processDrawerSessionRef.current) return;
        toast.error(err instanceof Error ? err.message : "Failed to load batch");
        setIsProcessing(false);
      } finally {
        if (session === processDrawerSessionRef.current) {
          setProcessDrawerFetching(false);
        }
      }
    })();
  };

  const closeProcessDrawer = useCallback(() => {
    processDrawerSessionRef.current += 1;
    setIsProcessing(false);
    setProcessDrawerFetching(false);
    setSelectedFlow(null);
  }, []);

  const [m1StagingModalOpen, setM1StagingModalOpen] = useState(false);
  const [m1StagingFlow, setM1StagingFlow] = useState<VendorProductionFlow | null>(
    null,
  );
  const [m1StagingPatch, setM1StagingPatch] =
    useState<PendingSecondaryCheckingPatch | null>(null);
  const [m1StagingDisplayTotals, setM1StagingDisplayTotals] = useState<{
    m1: number;
    m2: number;
    m3: number;
    vm4: number;
  } | null>(null);
  const [m1StagingRequireContainer, setM1StagingRequireContainer] =
    useState(false);
  const [m1StagingPlannedQtyHint, setM1StagingPlannedQtyHint] = useState(0);

  const processDrawerSaveEval = useMemo(() => {
    if (!selectedFlow) return null;
    return evaluateSecondaryCheckingSave(
      selectedFlow.floorQuantities.secondaryChecking,
      processingData,
      selectedFlow.plannedQuantity,
    );
  }, [selectedFlow, processingData]);

  const handleSaveProcessing = async () => {
    if (!selectedFlow) {
      toast.error("Batch not loaded — close the drawer and open Process again.");
      return;
    }

    const currentSc = selectedFlow.floorQuantities.secondaryChecking;
    const ev = evaluateSecondaryCheckingSave(
      currentSc,
      processingData,
      selectedFlow.plannedQuantity,
    );
    if (!ev.ok) {
      toast.error(ev.error);
      return;
    }

    setSaving(true);
    try {
      if (ev.route === "immediate") {
        const updated = await vendorProductionFlowService.updateFloor(
          selectedFlow.id,
          "secondaryChecking",
          ev.body,
        );
        setFlows((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f)),
        );
        toast.success("Secondary checking updated");
        try {
          const grn = await vendorGrnService.getActiveForFlow(updated.id);
          if (grn && !grn.incompleteClassification) {
            toast.success(`GRN ${grn.grnNumber} issued`, { duration: 5000 });
          }
        } catch {
          /* GRN lookup is best-effort */
        }
        closeProcessDrawer();
        return;
      }

      const { m1Remaining: _staleM1Rem, ...scRest } = currentSc;
      const mergedSc = {
        ...scRest,
        m1Quantity: ev.displayTotals.m1,
        m2Quantity: ev.displayTotals.m2,
        m3Quantity: ev.displayTotals.m3,
        vm4Quantity: ev.displayTotals.vm4,
      };
      const plannedHint = m1RemainingForTransfer(
        mergedSc as VendorProductionFlow["floorQuantities"]["secondaryChecking"],
      );

      setM1StagingFlow(selectedFlow);
      setM1StagingPatch(ev.body);
      setM1StagingDisplayTotals(ev.displayTotals);
      const m1Positive =
        ev.body.m1Quantity !== undefined && ev.body.m1Quantity > 0;
      setM1StagingRequireContainer(m1Positive);
      setM1StagingPlannedQtyHint(plannedHint);
      closeProcessDrawer();
      queueMicrotask(() => setM1StagingModalOpen(true));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBoxScanAccepted = useCallback(
    async (result: ScanAcceptResponse) => {
      if (result.flow) {
        const raw = result.flow as VendorProductionFlow & { _id?: string };
        const incoming: VendorProductionFlow = {
          ...raw,
          id: raw.id || String(raw._id || ""),
        };
        const fId = getFlowId(incoming);
        setFlows((prev) => {
          const exists = prev.some((f) => getFlowId(f) === fId);
          if (exists) {
            return prev.map((f) =>
              getFlowId(f) === fId
                ? mergeProductionFlowPreservePopulatedRefs(f, incoming)
                : f,
            );
          }
          return [incoming, ...prev];
        });
        setHighlightFlowId(fId);
        setHighlightVpoId(getVpoId(incoming));
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setHighlightFlowId(null);
          setHighlightVpoId(null);
        }, 5000);
      }
      setUpcomingRefreshKey((k) => k + 1);
      await loadFlows({ silent: true });
    },
    [loadFlows],
  );

  const scanBoxButton = (
    <button
      type="button"
      onClick={() => setScanDrawerOpen(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
      aria-label="Open scan box drawer"
    >
      <i className="ri-barcode-line text-xs" aria-hidden="true" />
      Scan Box
    </button>
  );

  return (
    <>
      <div className="main-content !p-[10px]">
        <Seo title="Secondary Checking" />

        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-[10px] border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
                <h1 className="text-sm font-bold text-gray-800">
                  Secondary Checking Floor
                </h1>
                <HelpIcon
                  title="Secondary Checking"
                  content="Use Scan Box to look up a box, review details, then Accept. Same vendor PO groups into one order; each product is an article line."
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scanBoxButton}
                <button
                  type="button"
                  onClick={() => void loadFlows()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  aria-label="Refresh flows"
                >
                  <i className="ri-refresh-line text-xs" aria-hidden="true" />
                  Refresh
                </button>
              </div>
            </div>

            <div
              className="flex items-center justify-between border-b border-gray-300"
              role="tablist"
              aria-label="Secondary checking views"
            >
              <div className="flex flex-wrap">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "orders"}
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "orders"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("orders")}
              >
                Order-wise
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "article-view"}
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "article-view"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("article-view")}
              >
                Article-wise
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "upcoming"}
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "upcoming"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
              </div>
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 rounded bg-white cursor-pointer hover:bg-gray-50 mr-2">
                <input
                  type="checkbox"
                  checked={showAllArticles}
                  onChange={(e) => setShowAllArticles(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show all
              </label>
            </div>
          </div>

          <div role="tabpanel">
            {activeTab === "orders" ? (
              <VendorSecondaryCheckingOrderTab
                flows={flows}
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                highlightVpoId={highlightVpoId}
                highlightFlowId={highlightFlowId}
                onProcess={handleOpenProcess}
                showAll={showAllArticles}
              />
            ) : activeTab === "article-view" ? (
              <VendorSecondaryCheckingArticleTab
                flows={flows}
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                highlightFlowId={highlightFlowId}
                onProcess={handleOpenProcess}
                showAllArticles={showAllArticles}
              />
            ) : (
              <VendorSecondaryCheckingUpcomingTab refreshKey={upcomingRefreshKey} />
            )}
          </div>
        </div>
      </div>

      <VendorSecondaryCheckingScanDrawer
        open={scanDrawerOpen}
        onClose={() => setScanDrawerOpen(false)}
        onAccepted={handleBoxScanAccepted}
      />

      <VendorSecondaryCheckingProcessDrawer
        open={isProcessing}
        flow={selectedFlow}
        onClose={closeProcessDrawer}
        loading={processDrawerFetching}
        processingData={processingData}
        setProcessingData={setProcessingData}
        onSave={handleSaveProcessing}
        saving={saving}
        saveDisabled={
          saving ||
          processDrawerFetching ||
          !(processDrawerSaveEval?.ok ?? false)
        }
      />
      <VendorSecondaryCheckingM1StagingModal
        open={m1StagingModalOpen}
        baselineFlow={m1StagingFlow}
        pendingPatch={m1StagingPatch}
        displayTotals={m1StagingDisplayTotals}
        requireContainerScan={m1StagingRequireContainer}
        plannedTransferQtyHint={m1StagingPlannedQtyHint}
        onClose={() => {
          setM1StagingModalOpen(false);
          setM1StagingFlow(null);
          setM1StagingPatch(null);
          setM1StagingDisplayTotals(null);
          setM1StagingRequireContainer(false);
          setM1StagingPlannedQtyHint(0);
        }}
        onFloorUpdated={(updated) => {
          setFlows((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f)),
          );
        }}
        onTransferred={async (next) => {
          setFlows((prev) =>
            prev.map((f) =>
              f.id === next.id
                ? mergeProductionFlowPreservePopulatedRefs(f, next)
                : f,
            ),
          );
          await loadFlows();
        }}
      />
    </>
  );
};

export default SecondaryCheckingPage;
