"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import vendorProductionFlowService, {
  mergeProductionFlowPreservePopulatedRefs,
  type VendorTransferItem,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { VendorFinalCheckingProcessDrawer } from "./components/VendorFinalCheckingProcessDrawer";
import {
  VendorFinalCheckingDispatchStagingModal,
  type PendingFinalCheckingStagingPatch,
} from "./components/VendorFinalCheckingDispatchStagingModal";
import { VendorFinalCheckingOrderTab } from "./components/VendorFinalCheckingOrderTab";
import { VendorFinalCheckingArticleTab } from "./components/VendorFinalCheckingArticleTab";
import { VendorScanContainerDrawer } from "../components/VendorScanContainerDrawer";
import { VendorFloorUpcomingContainersTab } from "../components/VendorFloorUpcomingContainersTab";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";

type FinalCheckingTab = "orders" | "article-view" | "upcoming";

const FinalCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FinalCheckingTab>("article-view");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [finalStagingOpen, setFinalStagingOpen] = useState(false);
  const [finalStagingFlow, setFinalStagingFlow] =
    useState<VendorProductionFlow | null>(null);
  const [finalStagingPatch, setFinalStagingPatch] =
    useState<PendingFinalCheckingStagingPatch | null>(null);
  const [finalStagingTransferItems, setFinalStagingTransferItems] = useState<
    VendorTransferItem[]
  >([]);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list(
        productionFlowListParams("finalChecking"),
      );
      setFlows(data.results || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load final checking flows";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setScanOpen(false);
    setFinalStagingOpen(false);
    setFinalStagingFlow(null);
    setFinalStagingPatch(null);
    setFinalStagingTransferItems([]);
    setSelectedFlow(flow);
    setIsProcessing(true);
  };

  const mergeFinalFlowInState = useCallback((updated: VendorProductionFlow) => {
    setFlows((prev) =>
      prev.map((f) =>
        f.id === updated.id
          ? mergeProductionFlowPreservePopulatedRefs(f, updated)
          : f,
      ),
    );
    setSelectedFlow((prev) =>
      prev && prev.id === updated.id
        ? mergeProductionFlowPreservePopulatedRefs(prev, updated)
        : prev,
    );
  }, []);

  const handleFinalSaved = useCallback(
    (updated: VendorProductionFlow) => {
      mergeFinalFlowInState(updated);
      setIsProcessing(false);
    },
    [mergeFinalFlowInState],
  );

  const handleFinalStagingRequested = useCallback(
    (ctx: {
      flow: VendorProductionFlow;
      patch: PendingFinalCheckingStagingPatch;
      transferItems: VendorTransferItem[];
    }) => {
      setFinalStagingFlow(ctx.flow);
      setFinalStagingPatch(ctx.patch);
      setFinalStagingTransferItems(ctx.transferItems);
      setIsProcessing(false);
      queueMicrotask(() => setFinalStagingOpen(true));
    },
    [],
  );

  const closeFinalStagingModal = useCallback(() => {
    setFinalStagingOpen(false);
    setFinalStagingFlow(null);
    setFinalStagingPatch(null);
    setFinalStagingTransferItems([]);
  }, []);

  const handleContainerAccepted = useCallback(async () => {
    await loadFlows();
    setUpcomingRefreshKey((k) => k + 1);
  }, [loadFlows]);

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Final Checking Floor" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">
                Final Quality Verification
              </h1>
              <HelpIcon
                title="Final QC"
                content="M1 by style. Save (no transferredData) updates counts only. Save & stage: PATCH …/floors/finalChecking with transferredData + existingContainerBarcode — no PATCH …/transfer. Vendor dispatch accept does not create WHMS inward rows; warehouse runs POST …/promote-vendor-dispatch, then PATCH inward lines. Confirm (no container) still uses POST …/confirm when applicable."
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadFlows}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-refresh-line text-xs" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-qr-scan-2-line text-xs" />
                Scan container
              </button>
            </div>
          </div>

          <div
            className="flex items-center justify-between border-b border-gray-300"
            role="tablist"
            aria-label="Final checking views"
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
            <VendorFinalCheckingOrderTab
              flows={flows}
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onProcess={handleOpenProcess}
              showAll={showAllArticles}
            />
          ) : activeTab === "article-view" ? (
            <VendorFinalCheckingArticleTab
              flows={flows}
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onProcess={handleOpenProcess}
              showAllArticles={showAllArticles}
            />
          ) : (
            <VendorFloorUpcomingContainersTab
              floorName="Final Checking"
              refreshKey={upcomingRefreshKey}
            />
          )}
        </div>
      </div>

      <VendorFinalCheckingProcessDrawer
        open={isProcessing && !!selectedFlow}
        flow={selectedFlow}
        onClose={() => setIsProcessing(false)}
        onSaved={handleFinalSaved}
        onStagingRequested={handleFinalStagingRequested}
      />

      <VendorFinalCheckingDispatchStagingModal
        open={finalStagingOpen}
        baselineFlow={finalStagingFlow}
        pendingPatch={finalStagingPatch}
        transferItems={finalStagingTransferItems}
        onClose={closeFinalStagingModal}
        onFloorUpdated={mergeFinalFlowInState}
      />

      <VendorScanContainerDrawer
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        expectedFloorName="Final Checking"
        onAccepted={handleContainerAccepted}
      />
    </div>
  );
};

export default FinalCheckingPage;
