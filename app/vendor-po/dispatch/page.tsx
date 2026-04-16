"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import HelpIcon from "@/shared/components/HelpIcon";
import { toast } from "react-hot-toast";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  mergeProductionFlowPreservePopulatedRefs,
  VendorProductionFlow,
  type VendorTransferItem,
} from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../utils/transferredStyleRows";
import { getDispatchTransferableRemaining } from "./dispatchTransferUtils";
import { VendorScanContainerDrawer } from "../components/VendorScanContainerDrawer";
import { VendorDispatchProcessDrawer } from "./components/VendorDispatchProcessDrawer";
import {
  VendorDispatchWarehouseStagingModal,
  type PendingDispatchStagingPatch,
} from "./components/VendorDispatchWarehouseStagingModal";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";

const DISPATCH_FLOOR_LABEL = "Dispatch";

function DispatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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

  /**
   * Called by the process drawer when user clicks "Save & stage to Warehouse".
   * Closes the process drawer and opens the warehouse staging modal.
   */
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

  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      const q = searchQuery.trim().toLowerCase();
      const refCode = f.referenceCode?.toLowerCase() || "";
      const vendorName =
        typeof f.vendor === "object"
          ? f.vendor?.header?.vendorName?.toLowerCase() || ""
          : "";
      const poNumber =
        typeof f.vendorPurchaseOrder === "object"
          ? f.vendorPurchaseOrder?.vpoNumber?.toLowerCase() || ""
          : "";
      return (
        !q ||
        refCode.includes(q) ||
        vendorName.includes(q) ||
        poNumber.includes(q)
      );
    });
  }, [flows, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlows.length / itemsPerPage),
  );
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlows.slice(start, start + itemsPerPage);
  }, [filteredFlows, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading Dispatch...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title="Dispatch" />

      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Dispatch Stage</h1>
          <HelpIcon
            title="Dispatch"
            content="1) Scan container: accept goods from FC onto dispatch floor. 2) Process: enter quantity per style code. Save updates counters. Save & stage opens container scan to stage goods for warehouse. 3) Warehouse scans the same barcode to complete inward."
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadFlows} className={CRM.btnSecondary}>
            <i className="ri-refresh-line text-xs" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className={CRM.btnSecondary}
          >
            <i className="ri-qr-scan-2-line text-xs" aria-hidden />
            Scan container
          </button>
        </div>
      </div>

      <div className={CRM.card}>
        <div className={CRM.cardBody}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                className={CRM.inputSearch}
                placeholder="Search by batch, vendor or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search dispatch batches"
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" aria-hidden />
            </div>
            <div className="flex items-center gap-2">
              <label className={`${CRM.label} mb-0`} htmlFor="dispatch-page-size">
                Show:
              </label>
              <select
                id="dispatch-page-size"
                className={`${CRM.select} w-20`}
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                  <th className={CRM.th}>Batch / Reference</th>
                  <th className={CRM.th}>Vendor &amp; PO</th>
                  <th className={CRM.thRight}>FC received</th>
                  <th className={CRM.thRight}>Dispatch received</th>
                  <th className={CRM.thRight} title="Units already staged to warehouse">
                    WH staged
                  </th>
                  <th className={CRM.thRight} title="Units still on dispatch (max transferable)">
                    Remaining
                  </th>
                  <th className={CRM.th}>Style lines (FC / dispatch)</th>
                  <th className={CRM.th}>Final QC</th>
                  <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest"
                    >
                      No dispatch batches found
                    </td>
                  </tr>
                ) : (
                  paginatedFlows.map((flow) => {
                    const final = flow.floorQuantities.finalChecking;
                    const disp = flow.floorQuantities.dispatch;
                    const remaining = getDispatchTransferableRemaining(flow);
                    const dispRows = disp?.receivedData?.length
                      ? disp.receivedData.filter(
                          (r) => !String(r.receivedStatusFromPreviousFloor ?? "").startsWith("warehouse:"),
                        )
                      : final?.receivedData ?? [];
                    const vendorName =
                      typeof flow.vendor === "object"
                        ? flow.vendor?.header?.vendorName
                        : "Unknown";
                    const poNumber =
                      typeof flow.vendorPurchaseOrder === "object"
                        ? flow.vendorPurchaseOrder?.vpoNumber
                        : "N/A";
                    return (
                      <tr key={flow.id} className={CRM.tbodyTr}>
                        <td className={CRM.td}>
                          <div className="font-bold text-gray-900 text-[12px]">
                            {flow.referenceCode || "—"}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase leading-none">
                            ID: {flow.id.slice(-6)}
                          </div>
                        </td>
                        <td className={CRM.td}>
                          <div className="font-bold text-purple-600 underline underline-offset-2 decoration-purple-200">
                            {vendorName}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                            VPO: {poNumber}
                          </div>
                        </td>
                        <td className={`${CRM.td} text-right font-medium`}>
                          {(final.received ?? 0).toLocaleString()}
                        </td>
                        <td
                          className={`${CRM.td} text-right font-bold text-emerald-700`}
                          title="Total accepted on Dispatch (container scans)"
                        >
                          {(disp?.received ?? 0).toLocaleString()}
                        </td>
                        <td className={`${CRM.td} text-right font-medium tabular-nums`} title="dispatch.transferred">
                          {(disp?.transferred ?? 0).toLocaleString()}
                        </td>
                        <td
                          className={`${CRM.td} text-right font-bold tabular-nums ${
                            remaining <= 0 ? "text-gray-400" : "text-amber-800"
                          }`}
                          title="dispatch.remaining (transferable to warehouse)"
                        >
                          {remaining.toLocaleString()}
                        </td>
                        <td className={CRM.td}>
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {dispRows.length ? (
                              dispRows.map((row, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-1 py-0.5 rounded border ${
                                    disp?.receivedData?.length
                                      ? "bg-emerald-50/80 border-emerald-100"
                                      : "bg-gray-50 border-gray-100"
                                  }`}
                                  title={
                                    disp?.receivedData?.length
                                      ? "dispatch.receivedData"
                                      : "finalChecking.receivedData (from FC)"
                                  }
                                >
                                  {formatTransferredRowLabel(row)}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-[10px]">—</span>
                            )}
                          </div>
                        </td>
                        <td className={CRM.td}>
                          <span
                            className={
                              flow.finalQualityConfirmed
                                ? CRM.badgeActive
                                : CRM.badgeInactive
                            }
                          >
                            {flow.finalQualityConfirmed
                              ? "CONFIRMED"
                              : "PENDING"}
                          </span>
                        </td>
                        <td className={CRM.td}>
                          <button
                            type="button"
                            onClick={() => handleOpenProcess(flow)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            aria-label={`Process batch ${flow.referenceCode || flow.id.slice(-6)}`}
                          >
                            <i className="ri-edit-line" aria-hidden />
                            Process
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={CRM.paginationBar}>
            <p className={CRM.paginationSummary}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of{" "}
              {filteredFlows.length} batches
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={CRM.pageNavBtn}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className={CRM.pageNavBtn}
              >
                Next
              </button>
            </div>
          </div>
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
        onFloorUpdated={mergeFlowInState}
      />

      <VendorScanContainerDrawer
        open={scanOpen}
        onClose={() => {
          setScanOpen(false);
          setScanInitialBarcode(undefined);
        }}
        expectedFloorName={DISPATCH_FLOOR_LABEL}
        initialBarcode={scanInitialBarcode}
        onAccepted={loadFlows}
      />
    </div>
  );
}

const DispatchPage = () => (
  <Suspense
    fallback={
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading Dispatch...</p>
        </div>
      </div>
    }
  >
    <DispatchPageContent />
  </Suspense>
);

export default DispatchPage;
