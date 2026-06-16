"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import HelpIcon from "@/shared/components/HelpIcon";
import { toast } from "react-hot-toast";
import vendorProductionFlowService, {
  mergeProductionFlowPreservePopulatedRefs,
  VendorProductionFlow,
  type VendorTransferItem,
} from "@/shared/services/vendorProductionFlowService";
import { VendorScanContainerDrawer } from "../components/VendorScanContainerDrawer";
import { VendorFloorUpcomingContainersTab } from "../components/VendorFloorUpcomingContainersTab";
import { VendorDispatchProcessDrawer } from "./components/VendorDispatchProcessDrawer";
import { VendorDispatchOrderTab } from "./components/VendorDispatchOrderTab";
import { VendorDispatchArticleTab } from "./components/VendorDispatchArticleTab";
import {
  VendorDispatchWarehouseStagingModal,
  type PendingDispatchStagingPatch,
} from "./components/VendorDispatchWarehouseStagingModal";
import { VendorTransferNotePrintModal } from "./components/VendorTransferNotePrintModal";
import { VendorTransferNoteHistoryTab } from "./components/VendorTransferNoteHistoryTab";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";
import {
  filterDispatchFlowsForView,
} from "../utils/groupVendorProductionFlows";
import { getDispatchTransferableRemaining } from "./dispatchTransferUtils";

const DISPATCH_FLOOR_LABEL = "Dispatch";

type DispatchTab = "orders" | "article-view" | "upcoming" | "transfer-notes";

function DispatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DispatchTab>("article-view");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);
  const [transferNoteRefreshKey, setTransferNoteRefreshKey] = useState(0);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanInitialBarcode, setScanInitialBarcode] = useState<string | undefined>();
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(null);
  const [processOpen, setProcessOpen] = useState(false);

  const [warehouseStagingOpen, setWarehouseStagingOpen] = useState(false);
  const [warehouseStagingFlow, setWarehouseStagingFlow] = useState<VendorProductionFlow | null>(null);
  const [warehouseStagingPatch, setWarehouseStagingPatch] = useState<PendingDispatchStagingPatch | null>(null);
  const [warehouseStagingTransferItems, setWarehouseStagingTransferItems] = useState<VendorTransferItem[]>([]);

  useEffect(() => {
    const o = searchParams?.get("openScan");
    if (o !== "1") return;
    const bc = searchParams?.get("barcode")?.trim();
    if (bc) setScanInitialBarcode(bc);
    setScanOpen(true);
    router.replace("/vendor-po/dispatch", { scroll: false });
  }, [searchParams, router]);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list(
        productionFlowListParams("dispatch"),
      );
      setFlows(data.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dispatch batches";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const activeFlows = useMemo(
    () => filterDispatchFlowsForView(flows, showAllArticles),
    [flows, showAllArticles],
  );

  const stats = useMemo(() => {
    let received = 0;
    let transferred = 0;
    let remaining = 0;
    for (const flow of activeFlows) {
      const disp = flow.floorQuantities?.dispatch;
      received += disp?.received ?? 0;
      transferred += disp?.transferred ?? 0;
      remaining += getDispatchTransferableRemaining(flow);
    }
    return {
      batches: activeFlows.length,
      received,
      transferred,
      remaining,
    };
  }, [activeFlows]);

  const printFilters = useMemo(
    () => ({
      ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
    }),
    [searchQuery],
  );

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setScanOpen(false);
    setWarehouseStagingOpen(false);
    setWarehouseStagingFlow(null);
    setWarehouseStagingPatch(null);
    setWarehouseStagingTransferItems([]);
    setSelectedFlow(flow);
    setProcessOpen(true);
  };

  const mergeFlowInState = useCallback((updated: VendorProductionFlow) => {
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

  const handleProcessSaved = useCallback(
    (updated: VendorProductionFlow) => {
      mergeFlowInState(updated);
      setProcessOpen(false);
    },
    [mergeFlowInState],
  );

  const handleStagingRequested = useCallback(
    (ctx: {
      flow: VendorProductionFlow;
      patch: PendingDispatchStagingPatch;
      transferItems: VendorTransferItem[];
    }) => {
      setWarehouseStagingFlow(ctx.flow);
      setWarehouseStagingPatch(ctx.patch);
      setWarehouseStagingTransferItems(ctx.transferItems);
      setProcessOpen(false);
      queueMicrotask(() => setWarehouseStagingOpen(true));
    },
    [],
  );

  const closeWarehouseStagingModal = useCallback(() => {
    setWarehouseStagingOpen(false);
    setWarehouseStagingFlow(null);
    setWarehouseStagingPatch(null);
    setWarehouseStagingTransferItems([]);
  }, []);

  const handleContainerAccepted = useCallback(async () => {
    await loadFlows();
    setUpcomingRefreshKey((k) => k + 1);
  }, [loadFlows]);

  const handleStagingComplete = useCallback(
    (updated: VendorProductionFlow) => {
      mergeFlowInState(updated);
      setTransferNoteRefreshKey((k) => k + 1);
    },
    [mergeFlowInState],
  );

  const handleTransferNoteCreated = useCallback(() => {
    setTransferNoteRefreshKey((k) => k + 1);
    void loadFlows();
  }, [loadFlows]);

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Dispatch" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-teal-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Vendor Dispatch</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {activeFlows.length}
              </span>
              <HelpIcon
                title="Vendor Dispatch"
                content="Scan containers from Final Checking, process brand quantities, stage to warehouse, print transfer notes (V-series STN), then complete inward at Warehouse Management."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => setShowPrintModal(true)}
                title="Print transfer note list"
              >
                <i className="ri-printer-line text-xs" aria-hidden />
                Print List
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => void loadFlows()}
                disabled={loading}
                title="Refresh batches"
              >
                <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} aria-hidden />
                Refresh
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 transition-colors shadow-sm"
                onClick={() => setScanOpen(true)}
              >
                <i className="ri-qr-scan-2-line text-xs" aria-hidden />
                Scan container
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-teal-50 border border-teal-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Batches</span>
              <span className="text-sm font-bold text-teal-900">{stats.batches}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Received</span>
              <span className="text-sm font-bold text-green-900">{stats.received.toLocaleString()}</span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">WH Staged</span>
              <span className="text-sm font-bold text-yellow-900">{stats.transferred.toLocaleString()}</span>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Remaining</span>
              <span className="text-sm font-bold text-orange-900">{stats.remaining.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 mb-0">
            <div className="flex flex-wrap" role="tablist" aria-label="Dispatch views">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "orders"}
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "orders"
                    ? "border-teal-600 text-teal-600"
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
                    ? "border-teal-600 text-teal-600"
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
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "transfer-notes"}
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "transfer-notes"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("transfer-notes")}
              >
                Transfer Notes
              </button>
            </div>
            {activeTab !== "transfer-notes" && activeTab !== "upcoming" ? (
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 rounded bg-white cursor-pointer hover:bg-gray-50 mr-2">
                <input
                  type="checkbox"
                  checked={showAllArticles}
                  onChange={(e) => setShowAllArticles(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show all
              </label>
            ) : null}
          </div>
        </div>

        <div className="min-h-[300px]" role="tabpanel">
          {activeTab === "orders" ? (
            <VendorDispatchOrderTab
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
            <VendorDispatchArticleTab
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
              onScanContainerClick={() => setScanOpen(true)}
            />
          ) : activeTab === "transfer-notes" ? (
            <VendorTransferNoteHistoryTab refreshKey={transferNoteRefreshKey} />
          ) : (
            <VendorFloorUpcomingContainersTab
              floorName={DISPATCH_FLOOR_LABEL}
              refreshKey={upcomingRefreshKey}
            />
          )}
        </div>
      </div>

      <VendorDispatchProcessDrawer
        open={processOpen && !!selectedFlow}
        flow={selectedFlow}
        onClose={() => setProcessOpen(false)}
        onSaved={handleProcessSaved}
        onStagingRequested={handleStagingRequested}
      />

      <VendorDispatchWarehouseStagingModal
        open={warehouseStagingOpen}
        baselineFlow={warehouseStagingFlow}
        pendingPatch={warehouseStagingPatch}
        transferItems={warehouseStagingTransferItems}
        onClose={closeWarehouseStagingModal}
        onFloorUpdated={handleStagingComplete}
      />

      <VendorScanContainerDrawer
        open={scanOpen}
        onClose={() => {
          setScanOpen(false);
          setScanInitialBarcode(undefined);
        }}
        expectedFloorName={DISPATCH_FLOOR_LABEL}
        initialBarcode={scanInitialBarcode}
        onAccepted={handleContainerAccepted}
      />

      <VendorTransferNotePrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        printFilters={printFilters}
        onCreated={handleTransferNoteCreated}
      />
    </div>
  );
}

const DispatchPage = () => (
  <Suspense
    fallback={
      <div className="main-content !p-[10px] flex flex-col items-center justify-center min-h-[240px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mb-3" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loading Dispatch…</p>
      </div>
    }
  >
    <DispatchPageContent />
  </Suspense>
);

export default DispatchPage;
