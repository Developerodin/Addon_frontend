"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  VendorProductionFlow,
  BrandingFloorQuantity,
  TransferredDataRow,
} from "@/shared/services/vendorProductionFlowService";
import { VendorProductionFloorDrawer } from "../components/VendorProductionFloorDrawer";
import { VendorFloorBatchSummary } from "../components/VendorFloorBatchSummary";

const BrandingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] = useState<Partial<BrandingFloorQuantity>>({});
  const [saving, setSaving] = useState(false);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list({ limit: 100 });
      setFlows(data.results || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load branding flows");
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
    const q = flow.floorQuantities.branding;
    setProcessingData({
      received: q.received || 0,
      completed: q.completed || 0,
      transferred: q.transferred || 0,
      transferredData: q.transferredData?.length ? q.transferredData : [{ transferred: 0, styleCode: "", brand: "" }],
    });
    setIsProcessing(true);
  };

  const handleAddStyleRow = () => {
    setProcessingData((p) => ({
      ...p,
      transferredData: [...(p.transferredData || []), { transferred: 0, styleCode: "", brand: "" }],
    }));
  };

  const handleRemoveStyleRow = (index: number) => {
    setProcessingData((p) => ({
      ...p,
      transferredData: (p.transferredData || []).filter((_, i) => i !== index),
    }));
  };

  const handleStyleRowChange = (index: number, field: keyof TransferredDataRow, value: string | number) => {
    setProcessingData((p) => {
      const next = [...(p.transferredData || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...p, transferredData: next };
    });
  };

  const handleSaveProcessing = async () => {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      await vendorProductionFlowService.updateFloor(selectedFlow.id, "branding", processingData);
      toast.success("Branding details updated");
      setIsProcessing(false);
      await loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
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
      <Seo title="Branding Floor" />

      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Branding Stage</h1>
          <HelpIcon
            title="Branding Supervisor"
            content="Mark items as branded and specify style codes/brands for final quality verification."
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
                  <th className={CRM.thRight}>Received</th>
                  <th className={CRM.thRight}>Branded</th>
                  <th className={CRM.th}>Style breakdown</th>
                  <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`${CRM.emptyWrap} py-20 text-center`}>
                      No branding tasks found
                    </td>
                  </tr>
                ) : (
                  paginatedFlows.map((flow) => {
                    const br = flow.floorQuantities.branding;
                    const vendorName = typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName : "Unknown";
                    const poNumber = typeof flow.vendorPurchaseOrder === "object" ? flow.vendorPurchaseOrder?.vpoNumber : "N/A";
                    return (
                      <tr key={flow.id} className={CRM.tbodyTr}>
                        <td className={CRM.td}>
                          <div className="font-bold text-gray-900 text-[12px]">{flow.referenceCode || "—"}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-medium leading-none">Flow: {flow.id.slice(-6)}</div>
                        </td>
                        <td className={CRM.td}>
                          <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-2">{vendorName}</div>
                          <div className="text-[10px] text-gray-500 font-bold mt-0.5">VPO: {poNumber}</div>
                        </td>
                        <td className={`${CRM.td} text-right font-medium`}>{br.received.toLocaleString()}</td>
                        <td className={`${CRM.td} text-right font-bold text-emerald-600`}>{br.completed.toLocaleString()}</td>
                        <td className={CRM.td}>
                          <div className="text-[10px] flex flex-wrap gap-1">
                            {br.transferredData?.map((row, i) => (
                              <span key={i} className="bg-gray-50 border border-gray-100 px-1 py-0.5 rounded">
                                {row.brand} ({row.styleCode}): {row.transferred}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className={CRM.td}>
                          <div className={CRM.rowActions}>
                            <button type="button" onClick={() => handleOpenProcess(flow)} className={CRM.btnPrimarySm}>
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
        title={`Branding — ${selectedFlow?.referenceCode || selectedFlow?.id.slice(-6) || ""}`}
        titleId="vendor-branding-drawer-title"
        onClose={() => setIsProcessing(false)}
        onSave={handleSaveProcessing}
        saveLabel="Save & move to final QC"
        saving={saving}
        hint={
          <p className={CRM.drawerHint}>
            <strong>Branding floor:</strong> set branded totals and transit to final checking; add style/brand lines as needed.
          </p>
        }
      >
        {selectedFlow && (
          <>
            <VendorFloorBatchSummary flow={selectedFlow} />
            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>2. Totals</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={CRM.label}>Total received</label>
                  <input type="number" readOnly className={`${CRM.input} bg-gray-50`} value={processingData.received} />
                </div>
                <div>
                  <label className={CRM.label}>Total branded</label>
                  <input
                    type="number"
                    className={`${CRM.input} border-emerald-200 focus:border-emerald-500`}
                    value={processingData.completed}
                    onChange={(e) => setProcessingData((p) => ({ ...p, completed: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={CRM.label}>To final QC</label>
                  <input
                    type="number"
                    className={`${CRM.input} border-sky-200 focus:border-sky-500`}
                    value={processingData.transferred}
                    onChange={(e) => setProcessingData((p) => ({ ...p, transferred: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className={CRM.drawerSection}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-200 border-b-2 border-gray-300">
                <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">3. Style &amp; brand breakdown</span>
                <button type="button" onClick={handleAddStyleRow} className={CRM.linkRowAction}>
                  + Add row
                </button>
              </div>
              <div className="p-3 space-y-3">
                {processingData.transferredData?.map((row, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap gap-3 items-end p-3 bg-white border border-gray-200 rounded shadow-sm"
                  >
                    <div className="flex-1 min-w-[120px]">
                      <label className={CRM.label}>Style code</label>
                      <input
                        type="text"
                        className={CRM.input}
                        value={row.styleCode}
                        onChange={(e) => handleStyleRowChange(i, "styleCode", e.target.value)}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className={CRM.label}>Brand</label>
                      <input
                        type="text"
                        className={CRM.input}
                        value={row.brand}
                        onChange={(e) => handleStyleRowChange(i, "brand", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <label className={CRM.label}>Qty</label>
                      <input
                        type="number"
                        className={CRM.input}
                        value={row.transferred}
                        onChange={(e) => handleStyleRowChange(i, "transferred", Number(e.target.value))}
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveStyleRow(i)} className={CRM.iconDanger} aria-label="Remove row">
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </VendorProductionFloorDrawer>
    </div>
  );
};

export default BrandingPage;
