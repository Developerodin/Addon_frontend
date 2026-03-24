"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, { VendorProductionFlow, BaseFloorQuantity } from "@/shared/services/vendorProductionFlowService";
import { VendorProductionFloorDrawer } from "../components/VendorProductionFloorDrawer";
import { VendorFloorBatchSummary } from "../components/VendorFloorBatchSummary";

const BoardingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] = useState<Partial<BaseFloorQuantity>>({});
  const [saving, setSaving] = useState(false);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list({ limit: 100 });
      setFlows(data.results || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load boarding flows");
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
      const poNumber = typeof f.vendorPurchaseOrder === "object" ? f.vendorPurchaseOrder?.vpoNumber?.toLowerCase() || "" : "";
      return !q || refCode.includes(q) || vendorName.includes(q) || poNumber.includes(q);
    });
  }, [flows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredFlows.length / itemsPerPage));
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlows.slice(start, start + itemsPerPage);
  }, [filteredFlows, currentPage, itemsPerPage]);

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setSelectedFlow(flow);
    const q = flow.floorQuantities.boarding;
    setProcessingData({
      received: q.received || 0,
      completed: q.completed || 0,
      transferred: q.transferred || 0,
      repairReceived: q.repairReceived || 0,
    });
    setIsProcessing(true);
  };

  const handleSaveProcessing = async () => {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      await vendorProductionFlowService.updateFloor(selectedFlow.id, "boarding", processingData);
      toast.success("Boarding floor updated");
      setIsProcessing(false);
      await loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (flow: VendorProductionFlow) => {
    const isCompleted = flow.floorQuantities.boarding.completed > 0;
    if (isCompleted) return CRM.badgeActive;
    return CRM.badgeInactive;
  };

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading Floor Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title="Boarding Floor" />

      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Boarding Stage</h1>
          <HelpIcon
            title="Boarding Process"
            content="Final processing before branding. Quality and shape are finalized here."
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadFlows} className={CRM.btnSecondary}>
            <i className="ri-refresh-line text-xs" />
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
                placeholder="Search by batch, vendor or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            </div>

            <div className="flex items-center gap-2">
              <label className={`${CRM.label} mb-0`}>Show:</label>
              <select className={`${CRM.select} w-20`} value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                  <th className={CRM.th}>Batch / Reference</th>
                  <th className={CRM.th}>Vendor &amp; PO</th>
                  <th className={CRM.thRight}>Received</th>
                  <th className={CRM.thRight}>Completed</th>
                  <th className={CRM.thRight}>Transferred</th>
                  <th className={CRM.th}>Status</th>
                  <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center font-bold tracking-widest text-[#7987A1] text-[10px] uppercase">
                      No boarding tasks found
                    </td>
                  </tr>
                ) : (
                  paginatedFlows.map((flow) => {
                    const bs = flow.floorQuantities.boarding;
                    const vendorName = typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName : "Unknown";
                    const poNumber = typeof flow.vendorPurchaseOrder === "object" ? flow.vendorPurchaseOrder?.vpoNumber : "N/A";
                    return (
                      <tr key={flow.id} className={CRM.tbodyTr}>
                        <td className={CRM.td}>
                          <div className="font-bold text-gray-800 text-[12px]">{flow.referenceCode || "—"}</div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase leading-none">Flow: {flow.id.slice(-6)}</div>
                        </td>
                        <td className={CRM.td}>
                          <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-2">{vendorName}</div>
                          <div className="text-[10px] text-gray-500 font-bold mt-0.5">VPO: {poNumber}</div>
                        </td>
                        <td className={`${CRM.td} text-right font-medium`}>{bs.received.toLocaleString()}</td>
                        <td className={`${CRM.td} text-right font-bold text-emerald-600`}>{bs.completed.toLocaleString()}</td>
                        <td className={`${CRM.td} text-right text-sky-600`}>{bs.transferred.toLocaleString()}</td>
                        <td className={CRM.td}>
                          <span className={getStatusBadge(flow)}>{bs.completed > 0 ? "Processed" : "Pending"}</span>
                        </td>
                        <td className={CRM.td}>
                          <div className={CRM.rowActions}>
                            <button type="button" onClick={() => handleOpenProcess(flow)} className={CRM.btnPrimarySm}>
                              Update
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

          <div className={CRM.paginationBar}>
            <p className={CRM.paginationSummary}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of{" "}
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

      <VendorProductionFloorDrawer
        open={isProcessing && !!selectedFlow}
        title={`Boarding — ${selectedFlow?.referenceCode || selectedFlow?.id.slice(-6) || ""}`}
        titleId="vendor-boarding-drawer-title"
        onClose={() => setIsProcessing(false)}
        onSave={handleSaveProcessing}
        saveLabel="Confirm boarding"
        saving={saving}
        hint={
          <p className={CRM.drawerHint}>
            <strong>Boarding floor:</strong> record rectified receipt from wash, completion, and quantity moving to branding.
          </p>
        }
      >
        {selectedFlow && (
          <>
            <VendorFloorBatchSummary flow={selectedFlow} />
            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>2. Receipt &amp; repair</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={CRM.label}>Batch rectified from wash</label>
                  <input
                    type="number"
                    className={CRM.input}
                    value={processingData.received}
                    onChange={(e) => setProcessingData((p) => ({ ...p, received: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={CRM.label}>Repair items received</label>
                  <input
                    type="number"
                    className={CRM.input}
                    value={processingData.repairReceived}
                    onChange={(e) => setProcessingData((p) => ({ ...p, repairReceived: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>3. Output &amp; branding transit</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={CRM.label}>Completed quantity</label>
                  <input
                    type="number"
                    className={`${CRM.input} border-emerald-200 focus:border-emerald-500`}
                    value={processingData.completed}
                    onChange={(e) => setProcessingData((p) => ({ ...p, completed: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={CRM.label}>To branding stage</label>
                  <input
                    type="number"
                    className={`${CRM.input} border-sky-200 focus:border-sky-500`}
                    value={processingData.transferred}
                    onChange={(e) => setProcessingData((p) => ({ ...p, transferred: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </VendorProductionFloorDrawer>
    </div>
  );
};

export default BoardingPage;
