"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  VendorProductionFlow,
  QualityFloorQuantity,
  CreateProductionFlowPayload,
  type VendorTransferToFloorKey,
} from "@/shared/services/vendorProductionFlowService";
import vendorManagementService, { VendorManagementDocument } from "@/shared/services/vendorManagementService";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import { VendorSecondaryCheckingCreateDrawer } from "./components/VendorSecondaryCheckingCreateDrawer";
import { VendorSecondaryCheckingProcessDrawer } from "./components/VendorSecondaryCheckingProcessDrawer";

/**
 * M1 (good) is derived from received minus M2/M4 buckets.
 * Keeping this derivation here ensures the backend still receives `m1Quantity`
 * even if the drawer UI no longer exposes an M1 input.
 */
function deriveSecondaryCheckingM1(
  received?: number,
  m2Quantity?: number,
  m4Quantity?: number
): number {
  const r = Number(received ?? 0);
  const m2 = Number(m2Quantity ?? 0);
  const m4 = Number(m4Quantity ?? 0);
  if (![r, m2, m4].every(Number.isFinite)) return 0;
  return Math.max(0, r - m2 - m4);
}

const SecondaryCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Create Flow Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vendors, setVendors] = useState<VendorManagementDocument[]>([]);
  const [vendorPos, setVendorPos] = useState<VendorPurchaseOrder[]>([]);
  const [createData, setCreateData] = useState<CreateProductionFlowPayload>({
    vendor: "",
    vendorPurchaseOrder: "",
    product: "",
    plannedQuantity: 0,
    referenceCode: "",
    remarks: "",
  });

  // Processing Modal State
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] = useState<Partial<QualityFloorQuantity>>({});
  const [transferLoading, setTransferLoading] = useState(false);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list({ limit: 100 });
      setFlows(data.results || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load production flows");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const vData = await vendorManagementService.list({ limit: 1000 });
      setVendors(vData.results || []);
    } catch (err: any) {
      console.error("Failed to load vendors", err);
    }
  }, []);

  useEffect(() => {
    loadFlows();
    loadInitialData();
  }, [loadFlows, loadInitialData]);

  // Load POs when vendor changes in Create Modal
  useEffect(() => {
    if (createData.vendor) {
      void (async () => {
        try {
          const poData = await vendorPurchaseOrderService.list({ vendor: createData.vendor, limit: 1000 });
          setVendorPos(poData.results || []);
        } catch (err) {
          console.error("Failed to load POs", err);
        }
      })();
    } else {
      setVendorPos([]);
    }
  }, [createData.vendor]);

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

  const handleCreateFlow = async () => {
    if (!createData.vendor) {
      toast.error("Vendor is required");
      return;
    }
    try {
      await vendorProductionFlowService.create(createData);
      toast.success("Production flow created");
      setIsCreateModalOpen(false);
      setCreateData({
        vendor: "",
        vendorPurchaseOrder: "",
        product: "",
        plannedQuantity: 0,
        referenceCode: "",
        remarks: "",
      });
      loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Failed to create flow");
    }
  };

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setSelectedFlow(flow);
    const q = flow.floorQuantities.secondaryChecking;
    setProcessingData({
      received: q.received || 0,
      m1Quantity: q.m1Quantity || 0,
      m2Quantity: q.m2Quantity || 0,
      m4Quantity: q.m4Quantity || 0,
      repairStatus: q.repairStatus || "NOT_REQUIRED",
      repairRemarks: q.repairRemarks || "",
    });
    setIsProcessing(true);
  };

  const handleSaveProcessing = async () => {
    if (!selectedFlow) return;
    try {
      const received = Number(processingData.received ?? 0);
      const m2Quantity = Number(processingData.m2Quantity ?? 0);
      const m4Quantity = Number(processingData.m4Quantity ?? 0);

      // Since M1 is derived from received - M2 - M4, enforce that M2+M4 doesn't exceed received.
      if ([received, m2Quantity, m4Quantity].every(Number.isFinite) && m2Quantity + m4Quantity > received) {
        toast.error("M2 + M4 cannot exceed Batch received quantity");
        return;
      }

      const payload = {
        ...processingData,
        m1Quantity: deriveSecondaryCheckingM1(received, m2Quantity, m4Quantity),
      };

      await vendorProductionFlowService.updateFloor(selectedFlow.id, "secondaryChecking", payload);
      toast.success("Secondary checking updated");
      setIsProcessing(false);
      loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  };

  const handleTransferM1 = useCallback(
    async (toFloorKey: VendorTransferToFloorKey, quantity: number) => {
      if (!selectedFlow) return;
      setTransferLoading(true);
      try {
        const updated = await vendorProductionFlowService.transfer(selectedFlow.id, {
          fromFloorKey: "secondaryChecking",
          toFloorKey: toFloorKey,
          quantity,
        });
        toast.success(`Transferred ${quantity.toLocaleString()} → ${toFloorKey}`);
        setSelectedFlow(updated);
        setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        const q = updated.floorQuantities.secondaryChecking;
        setProcessingData({
          received: q.received ?? 0,
          m1Quantity: q.m1Quantity ?? 0,
          m2Quantity: q.m2Quantity ?? 0,
          m4Quantity: q.m4Quantity ?? 0,
          repairStatus: q.repairStatus ?? "NOT_REQUIRED",
          repairRemarks: q.repairRemarks ?? "",
        });
      } catch (err: any) {
        toast.error(err.message || "Transfer failed");
      } finally {
        setTransferLoading(false);
      }
    },
    [selectedFlow]
  );

  const getStatusBadge = (flow: VendorProductionFlow) => {
    const isCompleted = flow.floorQuantities.secondaryChecking.completed > 0;
    if (isCompleted) return CRM.badgeActive;
    return CRM.badgeInactive;
  };

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading Flows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title="Secondary Checking" />
      
      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Secondary Checking Floor</h1>
          <HelpIcon 
            title="Secondary Checking"
            content="Monitor and record quality status for vendor production batches. This is the first quality gate in the vendor flow."
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsCreateModalOpen(true)} className={CRM.btnPrimary}>
            <i className="ri-add-line" />
            Add New Batch
          </button>
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
                placeholder="Search by Batch, Vendor or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            </div>
            
            <div className="flex items-center gap-2">
               <label className={CRM.label + " mb-0"}>Show:</label>
               <select 
                 className={CRM.select + " w-20"} 
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
                  <th className={CRM.th}>Vendor & PO</th>
                  <th className={CRM.thRight}>Planned</th>
                  <th className={CRM.thRight}>Received</th>
                  <th className={CRM.th}>M1/M2/M4 Counts</th>
                  <th className={CRM.th}>Status</th>
                  <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 text-xs font-bold tracking-widest uppercase">
                      No production flows found
                    </td>
                  </tr>
                ) : (
                  paginatedFlows.map((flow) => {
                    const sc = flow.floorQuantities.secondaryChecking;
                    const vendorName = typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName : "Unknown";
                    const poNumber = typeof flow.vendorPurchaseOrder === "object" ? flow.vendorPurchaseOrder?.vpoNumber : "N/A";
                    
                    return (
                      <tr key={flow.id} className={CRM.tbodyTr}>
                        <td className={CRM.td}>
                          <div className="font-bold text-gray-900 text-[12px]">{flow.referenceCode || "—"}</div>
                          <div className="text-[10px] text-gray-400 font-medium tracking-tight uppercase leading-none">ID: {flow.id.slice(-6)}</div>
                        </td>
                        <td className={CRM.td}>
                          <div className="font-bold text-purple-600 underline underline-offset-2 decoration-purple-200">{vendorName}</div>
                          <div className="text-[10px] text-gray-500 font-bold mt-0.5">VPO: {poNumber}</div>
                        </td>
                        <td className={`${CRM.td} text-right font-bold text-gray-800`}>{flow.plannedQuantity.toLocaleString()}</td>
                        <td className={`${CRM.td} text-right font-medium`}>{sc.received.toLocaleString()}</td>
                        <td className={CRM.td}>
                          <div className="flex gap-2">
                             <div className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                               <span className="text-emerald-700 font-bold text-[10px]">M1: {sc.m1Quantity}</span>
                             </div>
                             <div className="bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                               <span className="text-amber-700 font-bold text-[10px]">M2: {sc.m2Quantity}</span>
                             </div>
                             <div className="bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                               <span className="text-red-700 font-bold text-[10px]">M4: {sc.m4Quantity}</span>
                             </div>
                          </div>
                        </td>
                        <td className={CRM.td}>
                           <span className={getStatusBadge(flow)}>
                             {sc.completed > 0 ? "Completed" : "Pending"}
                           </span>
                        </td>
                        <td className={CRM.td}>
                           <div className={CRM.rowActions}>
                             <button 
                               onClick={() => handleOpenProcess(flow)}
                               className={CRM.btnPrimarySm}
                             >
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
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of {filteredFlows.length} flows
            </p>
            <div className="flex gap-1">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className={CRM.pageNavBtn}
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className={CRM.pageNavBtn}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <VendorSecondaryCheckingCreateDrawer
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createData={createData}
        setCreateData={setCreateData}
        vendors={vendors}
        vendorPos={vendorPos}
        onSubmit={handleCreateFlow}
      />

      <VendorSecondaryCheckingProcessDrawer
        open={isProcessing}
        flow={selectedFlow}
        onClose={() => setIsProcessing(false)}
        processingData={processingData}
        setProcessingData={setProcessingData}
        onSave={handleSaveProcessing}
        onTransferM1={handleTransferM1}
        transferLoading={transferLoading}
      />
    </div>
  );
};

export default SecondaryCheckingPage;
