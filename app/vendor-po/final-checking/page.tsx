"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, { 
  VendorProductionFlow, 
  FinalCheckingFloorQuantity 
} from "@/shared/services/vendorProductionFlowService";

const FinalCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] = useState<Partial<FinalCheckingFloorQuantity>>({});

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list({ limit: 100 });
      setFlows(data.results || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load final checking flows");
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
    const q = flow.floorQuantities.finalChecking;
    setProcessingData({
      received: q.received || 0,
      m1Quantity: q.m1Quantity || 0,
      m2Quantity: q.m2Quantity || 0,
      m4Quantity: q.m4Quantity || 0,
      m1Transferred: q.m1Transferred || 0,
      repairStatus: q.repairStatus || "NOT_REQUIRED",
      transferredData: q.transferredData || [],
    });
    setIsProcessing(true);
  };

  const handleSaveProcessing = async () => {
    if (!selectedFlow) return;
    try {
      await vendorProductionFlowService.updateFloor(selectedFlow.id, "finalChecking", processingData);
      toast.success("Final quality details saved");
      setIsProcessing(false);
      loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  };

  const handleConfirmFinalQuality = async (id: string) => {
    try {
      await vendorProductionFlowService.confirmFinalQuality(id);
      toast.success("Batch quality confirmed and completed");
      loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Confirmation failed");
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
            content="Conduct final inspection before dispatch. Items confirmed here will move to Counting & Dispatch."
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadFlows} className={CRM.btnSecondary}>
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
          </div>

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                   <th className={CRM.th}>Batch Ref</th>
                   <th className={CRM.th}>Vendor</th>
                   <th className={CRM.thRight}>QC In</th>
                   <th className={CRM.th}>M1/M2/M4</th>
                   <th className={CRM.th}>Style Status</th>
                   <th className={CRM.th}>Confirmation</th>
                   <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                 {paginatedFlows.length === 0 ? (
                   <tr>
                     <td colSpan={7} className={CRM.emptyWrap + " py-20 text-center"}>No QC tasks found</td>
                   </tr>
                 ) : (
                   paginatedFlows.map(flow => {
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
                            <div className="text-[10px] text-gray-500 max-w-[150px] truncate">
                               {fc.transferredData?.map(t => `${t.brand} ${t.styleCode}`).join(", ") || "No styles recorded"}
                            </div>
                         </td>
                         <td className={CRM.td}>
                            <span className={flow.finalQualityConfirmed ? CRM.badgeActive : CRM.badgeInactive}>
                               {flow.finalQualityConfirmed ? "CONFIRMED" : "PENDING"}
                            </span>
                         </td>
                         <td className={CRM.td}>
                            <div className={CRM.rowActions}>
                               <button onClick={() => handleOpenProcess(flow)} className={CRM.btnSecondary + " h-7 w-7 !p-0"}>
                                 <i className="ri-edit-line" />
                               </button>
                               {!flow.finalQualityConfirmed && (
                                 <button 
                                   onClick={() => handleConfirmFinalQuality(flow.id)}
                                   className={CRM.btnPrimarySm}
                                 >
                                   Confirm Batch
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
        </div>
      </div>

      {/* Process Modal */}
      {isProcessing && selectedFlow && (
        <div className={CRM.modalOverlay}>
          <div className={CRM.modalPanel}>
             <div className={CRM.modalHeader}>
                <h2 className={CRM.modalTitle}>Final QC Record — {selectedFlow.referenceCode || selectedFlow.id.slice(-6)}</h2>
                <button onClick={() => setIsProcessing(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="ri-close-line text-lg" />
                </button>
             </div>
             
             <div className={CRM.modalBody}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                   <div>
                     <label className={CRM.label}>Total Received for QC</label>
                     <input type="number" readOnly className={CRM.input + " bg-gray-50"} value={processingData.received} />
                   </div>
                   <div>
                      <label className={CRM.label}>Repair Status</label>
                      <select 
                        className={CRM.select}
                        value={processingData.repairStatus}
                        onChange={(e) => setProcessingData(p => ({ ...p, repairStatus: e.target.value as any }))}
                      >
                        <option value="NOT_REQUIRED">Not Required</option>
                        <option value="REQUIRED">Required</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REPAIRED">Repaired</option>
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                   <div>
                     <label className={CRM.label}>M1 Qty (Pass)</label>
                     <input 
                       type="number" 
                       className={CRM.input + " border-emerald-200"} 
                       value={processingData.m1Quantity}
                       onChange={(e) => setProcessingData(p => ({ ...p, m1Quantity: Number(e.target.value) }))}
                     />
                   </div>
                   <div>
                     <label className={CRM.label}>M2 Qty (Fix)</label>
                     <input 
                       type="number" 
                       className={CRM.input + " border-amber-200"} 
                       value={processingData.m2Quantity}
                       onChange={(e) => setProcessingData(p => ({ ...p, m2Quantity: Number(e.target.value) }))}
                     />
                   </div>
                   <div>
                     <label className={CRM.label}>M4 Qty (Reject)</label>
                     <input 
                       type="number" 
                       className={CRM.input + " border-red-200"} 
                       value={processingData.m4Quantity}
                       onChange={(e) => setProcessingData(p => ({ ...p, m4Quantity: Number(e.target.value) }))}
                     />
                   </div>
                </div>

                <div className="mb-4">
                   <label className={CRM.label}>M1 Transferred to Stock</label>
                   <input 
                     type="number" 
                     className={CRM.input + " border-purple-200"} 
                     value={processingData.m1Transferred}
                     onChange={(e) => setProcessingData(p => ({ ...p, m1Transferred: Number(e.target.value) }))}
                   />
                </div>

                <div className="mb-2">
                   <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Article Breakdown (Read-Only)</h4>
                   <div className="mt-2 space-y-1">
                      {processingData.transferredData?.map((t, i) => (
                        <div key={i} className="text-[10px] text-gray-500 bg-white p-2 border border-gray-100 rounded">
                           {t.brand} — {t.styleCode}: <span className="font-bold text-gray-800">{t.transferred} pcs</span>
                        </div>
                      ))}
                    </div>
                </div>
             </div>

             <div className={CRM.modalFooter}>
                <button onClick={() => setIsProcessing(false)} className={CRM.btnSecondary}>Cancel</button>
                <button onClick={handleSaveProcessing} className={CRM.btnPrimary}>Save QC Findings</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalCheckingPage;
