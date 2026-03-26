"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  type FinalCheckingM2TransferToFloorKey,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../utils/transferredStyleRows";
import { VendorFinalCheckingProcessDrawer } from "./components/VendorFinalCheckingProcessDrawer";

const FinalCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list({ limit: 100 });
      setFlows(data.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load final checking flows";
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
      const vendorName = typeof f.vendor === "object" ? f.vendor?.header?.vendorName?.toLowerCase() || "" : "";

      return !q || refCode.includes(q) || vendorName.includes(q);
    });
  }, [flows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredFlows.length / itemsPerPage));
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlows.slice(start, start + itemsPerPage);
  }, [filteredFlows, currentPage, itemsPerPage]);

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setSelectedFlow(flow);
    setIsProcessing(true);
  };

  const handleFinalSaved = useCallback((updated: VendorProductionFlow) => {
    setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setSelectedFlow(updated);
    setIsProcessing(false);
  }, []);

  const handleTransferM2 = useCallback(
    async (toFloorKey: FinalCheckingM2TransferToFloorKey, quantity: number) => {
      if (!selectedFlow) return;
      setTransferLoading(true);
      try {
        const updated = await vendorProductionFlowService.transferFinalCheckingM2(selectedFlow.id, {
          toFloorKey,
          quantity,
        });
        toast.success(`Transferred M2 ${quantity.toLocaleString()} -> ${toFloorKey}`);
        setSelectedFlow(updated);
        setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "M2 transfer failed";
        toast.error(msg);
      } finally {
        setTransferLoading(false);
      }
    },
    [selectedFlow]
  );

  const handleConfirmFinalQuality = async (id: string) => {
    const flow = flows.find((f) => f.id === id);
    const final = flow?.floorQuantities?.finalChecking;
    const effectiveCompleted =
      (final?.completed ?? 0) + (final?.m1Quantity ?? 0) + (final?.m2Quantity ?? 0) + (final?.m4Quantity ?? 0);
    if (effectiveCompleted <= 0) {
      toast.error("Cannot confirm: final checking has no QC quantities yet");
      return;
    }
    setConfirmingId(id);
    try {
      await vendorProductionFlowService.confirmFinalQuality(id, {
        remarks: "Dispatch ready and confirmed",
      });
      toast.success("Batch quality confirmed and completed");
      loadFlows();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Confirmation failed";
      toast.error(msg);
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading QC Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title="Final Checking Floor" />

      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Final Quality Verification</h1>
          <HelpIcon
            title="Final QC"
            content="Conduct final inspection before dispatch. Style breakdown uses the same transferredData + style-codes-by-vendor-code flow as branding."
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadFlows} className={CRM.btnSecondary}>
            <i className="ri-refresh-line" />
            Refresh
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
                placeholder="Search Batch or Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <label className={`${CRM.label} mb-0`}>Show:</label>
              <select className={`${CRM.select} w-20`} value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
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
                  <th className={CRM.th}>Batch Ref</th>
                  <th className={CRM.th}>Vendor</th>
                  <th className={CRM.thRight}>QC In</th>
                  <th className={CRM.th}>M1/M2/M4</th>
                  <th className={CRM.th}>Style breakdown</th>
                  <th className={CRM.th}>Confirmation</th>
                  <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`${CRM.emptyWrap} py-20 text-center`}>
                      No QC tasks found
                    </td>
                  </tr>
                ) : (
                  paginatedFlows.map((flow) => {
                    const fc = flow.floorQuantities.finalChecking;
                    const vendorName = typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName : "Unknown";
                    return (
                      <tr key={flow.id} className={CRM.tbodyTr}>
                        <td className={CRM.td}>
                          <div className="font-bold text-[12px]">{flow.referenceCode || "—"}</div>
                          <div className="text-[10px] text-gray-400">BATCH ID: {flow.id.slice(-6)}</div>
                        </td>
                        <td className={CRM.td}>
                          <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-1">{vendorName}</div>
                        </td>
                        <td className={`${CRM.td} text-right font-medium`}>{fc.received.toLocaleString()}</td>
                        <td className={CRM.td}>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1 py-0.5 rounded">M1: {fc.m1Quantity}</span>
                            <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-1 py-0.5 rounded">M2: {fc.m2Quantity}</span>
                            <span className="text-red-700 font-bold text-[10px] bg-red-50 px-1 py-0.5 rounded">M4: {fc.m4Quantity}</span>
                          </div>
                        </td>
                        <td className={CRM.td}>
                          <div className="text-[10px] flex flex-wrap gap-1 max-w-[220px]">
                            {fc.transferredData?.length ? (
                              fc.transferredData.map((t, i) => (
                                <span key={i} className="bg-gray-50 border border-gray-100 px-1 py-0.5 rounded">
                                  {formatTransferredRowLabel(t)}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className={CRM.td}>
                          <span className={flow.finalQualityConfirmed ? CRM.badgeActive : CRM.badgeInactive}>
                            {flow.finalQualityConfirmed ? "CONFIRMED" : "PENDING"}
                          </span>
                        </td>
                        <td className={CRM.td}>
                          <div className={CRM.rowActions}>
                            <button type="button" onClick={() => handleOpenProcess(flow)} className={CRM.btnPrimarySm}>
                              <i className="ri-edit-line" />
                              Process
                            </button>
                            {!flow.finalQualityConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleConfirmFinalQuality(flow.id)}
                                className={CRM.btnPrimarySm}
                                disabled={confirmingId === flow.id}
                              >
                                {confirmingId === flow.id ? "..." : "Confirm Batch"}
                              </button>
                            )}
                          </div>
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
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of{" "}
              {filteredFlows.length} batches
            </p>
            <div className="flex gap-1">
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className={CRM.pageNavBtn}>
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
      <VendorFinalCheckingProcessDrawer
        open={isProcessing}
        flow={selectedFlow}
        onClose={() => setIsProcessing(false)}
        onSaved={handleFinalSaved}
        onTransferM2={handleTransferM2}
        transferLoading={transferLoading}
      />
    </div>
  );
};

export default FinalCheckingPage;
