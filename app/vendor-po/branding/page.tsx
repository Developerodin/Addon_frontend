"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  mergeProductionFlowPreservePopulatedRefs,
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";
import { VendorBrandingProcessDrawer } from "./components/VendorBrandingProcessDrawer";
import {
  VendorBrandingStagingModal,
  type PendingBrandingStagingPatch,
} from "./components/VendorBrandingStagingModal";
import { VendorBrandingOrderTab } from "./components/VendorBrandingOrderTab";
import { VendorBrandingArticleTab } from "./components/VendorBrandingArticleTab";
import { VendorScanContainerDrawer } from "../components/VendorScanContainerDrawer";
import { VendorFloorUpcomingContainersTab } from "../components/VendorFloorUpcomingContainersTab";

type BrandingTab = "orders" | "article-view" | "upcoming";

const BrandingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BrandingTab>("article-view");
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
  const [brandingStagingOpen, setBrandingStagingOpen] = useState(false);
  const [brandingStagingFlow, setBrandingStagingFlow] =
    useState<VendorProductionFlow | null>(null);
  const [brandingStagingPatch, setBrandingStagingPatch] =
    useState<PendingBrandingStagingPatch | null>(null);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list(
        productionFlowListParams("branding"),
      );
      setFlows(data.results || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load branding flows";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    /** Scan drawer is z-[61]; process drawer is z-50 — close scan or Save clicks hit the wrong layer. */
    setScanOpen(false);
    setSelectedFlow(flow);
    setIsProcessing(true);
  };

  const handleBrandingSaved = useCallback((updated: VendorProductionFlow) => {
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

  const handleBrandingStagingRequested = useCallback(
    (ctx: {
      flow: VendorProductionFlow;
      patch: PendingBrandingStagingPatch;
    }) => {
      setBrandingStagingFlow(ctx.flow);
      setBrandingStagingPatch(ctx.patch);
      setIsProcessing(false);
      queueMicrotask(() => setBrandingStagingOpen(true));
    },
    [],
  );

  const closeBrandingStagingModal = useCallback(() => {
    setBrandingStagingOpen(false);
    setBrandingStagingFlow(null);
    setBrandingStagingPatch(null);
  }, []);

  const handleContainerAccepted = useCallback(async () => {
    await loadFlows();
    setUpcomingRefreshKey((k) => k + 1);
  }, [loadFlows]);

  return (
    <div className={CRM.mainContent}>
      <Seo title="Branding Floor" />

      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Branding Stage</h1>
          <HelpIcon
            title="Branding Supervisor"
            content="Table shows API received, completed, remaining, and scalar transferred (handoff to next floor), plus style lines. In Process: Save sends delta transferredData; counters stay server-side. Save & stage opens the container modal; PATCH adds existingContainerBarcode + autoTransferToNextFloor."
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadFlows}
            className={CRM.btnSecondary}
          >
            <i className="ri-refresh-line" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className={CRM.btnSecondary}
          >
            <i className="ri-qr-scan-2-line" />
            Scan container
          </button>
        </div>
      </div>

      <div className={CRM.card}>
        <div className={CRM.cardBody}>
          <div
            className="flex items-center justify-between border-b border-gray-300 mb-0"
            role="tablist"
            aria-label="Branding views"
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

          <div role="tabpanel">
            {activeTab === "orders" ? (
              <VendorBrandingOrderTab
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
              <VendorBrandingArticleTab
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
                floorName="Branding"
                refreshKey={upcomingRefreshKey}
              />
            )}
          </div>
        </div>
      </div>

      <VendorBrandingProcessDrawer
        open={isProcessing && !!selectedFlow}
        flow={selectedFlow}
        onClose={() => setIsProcessing(false)}
        onSaved={handleBrandingSaved}
        onStagingRequested={handleBrandingStagingRequested}
      />

      <VendorBrandingStagingModal
        open={brandingStagingOpen}
        baselineFlow={brandingStagingFlow}
        pendingPatch={brandingStagingPatch}
        onClose={closeBrandingStagingModal}
        onFloorUpdated={handleBrandingSaved}
      />

      <VendorScanContainerDrawer
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        expectedFloorName="Branding"
        onAccepted={handleContainerAccepted}
      />
    </div>
  );
};

export default BrandingPage;
