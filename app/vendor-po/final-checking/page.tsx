"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  mergeProductionFlowPreservePopulatedRefs,
  type VendorTransferItem,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../utils/transferredStyleRows";
import { VendorFinalCheckingProcessDrawer } from "./components/VendorFinalCheckingProcessDrawer";
import {
  VendorFinalCheckingDispatchStagingModal,
  type PendingFinalCheckingStagingPatch,
} from "./components/VendorFinalCheckingDispatchStagingModal";
import { VendorScanContainerDrawer } from "../components/VendorScanContainerDrawer";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";

const FinalCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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

  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      const q = searchQuery.trim().toLowerCase();
      const refCode = f.referenceCode?.toLowerCase() || "";
      const vendorName =
        typeof f.vendor === "object"
          ? f.vendor?.header?.vendorName?.toLowerCase() || ""
          : "";

      return !q || refCode.includes(q) || vendorName.includes(q);
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

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
            Loading Data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Final Checking Floor" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
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

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80 min-w-[200px]">
              <input
                type="text"
                className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                placeholder="Search Batch or Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-[#495057] mb-0">
                Show:
              </label>
              <select
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer w-20"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Batch Ref
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Vendor
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  QC In
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  M1/M2/M4
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Style breakdown
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Confirmation
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedFlows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-1.5 py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest border border-gray-200"
                  >
                    No QC tasks found
                  </td>
                </tr>
              ) : (
                paginatedFlows.map((flow) => {
                  const fc = flow.floorQuantities.finalChecking;
                  const vendorName =
                    typeof flow.vendor === "object"
                      ? flow.vendor?.header?.vendorName
                      : "Unknown";
                  return (
                    <tr
                      key={flow.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="font-bold text-[12px]">
                          {flow.referenceCode || "—"}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          BATCH ID: {flow.id.slice(-6)}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-1">
                          {vendorName}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-medium text-[12px] text-gray-700 border border-gray-200">
                        {fc.received.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1 py-0.5 rounded">
                            M1: {fc.m1Quantity}
                          </span>
                          <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-1 py-0.5 rounded">
                            M2: {fc.m2Quantity}
                          </span>
                          <span className="text-red-700 font-bold text-[10px] bg-red-50 px-1 py-0.5 rounded">
                            M4: {fc.m4Quantity}
                          </span>
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="text-[10px] flex flex-wrap gap-1 max-w-[220px]">
                          {fc.transferredData?.length ? (
                            fc.transferredData.map((t, i) => (
                              <span
                                key={i}
                                className="bg-gray-50 border border-gray-100 px-1 py-0.5 rounded"
                              >
                                {formatTransferredRowLabel(t)}
                              </span>
                            ))
                          ) : fc.receivedData?.length ? (
                            fc.receivedData.map((t, i) => (
                              <span
                                key={i}
                                className="bg-emerald-50/80 border border-emerald-100 px-1 py-0.5 rounded"
                                title="Inbound from container (receivedData)"
                              >
                                {formatTransferredRowLabel(t)}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span
                          className={
                            flow.finalQualityConfirmed
                              ? "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-green-100 text-green-800"
                              : "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-red-100 text-red-800"
                          }
                        >
                          {flow.finalQualityConfirmed ? "CONFIRMED" : "PENDING"}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenProcess(flow)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            <i className="ri-edit-line" />
                            Process
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of{" "}
            {filteredFlows.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-[11px] font-bold text-gray-500 px-2">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
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
        onAccepted={loadFlows}
      />
    </div>
  );
};

export default FinalCheckingPage;
