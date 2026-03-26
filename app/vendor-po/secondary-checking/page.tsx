"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { VendorSecondaryCheckingTransferModal } from "./components/VendorSecondaryCheckingTransferModal";

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
  const [saving, setSaving] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  /** True while GET-by-id runs after clicking Process — avoids stale list data in the drawer. */
  const [processDrawerFetching, setProcessDrawerFetching] = useState(false);
  const processDrawerSessionRef = useRef(0);

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
    const session = ++processDrawerSessionRef.current;
    setIsProcessing(true);
    setProcessDrawerFetching(true);
    setSelectedFlow(null);
    setProcessingData({});
    void (async () => {
      try {
        const fresh = await vendorProductionFlowService.getById(flow.id);
        if (session !== processDrawerSessionRef.current) return;
        setSelectedFlow(fresh);
        setFlows((prev) => prev.map((f) => (f.id === fresh.id ? fresh : f)));
        const q = fresh.floorQuantities.secondaryChecking;
        setProcessingData({
          received: q.received || 0,
          repairStatus: q.repairStatus || "NOT_REQUIRED",
          repairRemarks: q.repairRemarks || "",
        });
      } catch (err: any) {
        if (session !== processDrawerSessionRef.current) return;
        toast.error(err.message || "Failed to load batch");
        setIsProcessing(false);
      } finally {
        if (session === processDrawerSessionRef.current) {
          setProcessDrawerFetching(false);
        }
      }
    })();
  };

  const closeProcessDrawer = useCallback(() => {
    processDrawerSessionRef.current += 1;
    setIsProcessing(false);
    setProcessDrawerFetching(false);
    setSelectedFlow(null);
  }, []);

  const handleOpenTransfer = useCallback(async (flow: VendorProductionFlow) => {
    setIsTransferModalOpen(true);
    setSelectedFlow(null);
    setTransferLoading(true);
    try {
      const fresh = await vendorProductionFlowService.getById(flow.id);
      setSelectedFlow(fresh);
      setFlows((prev) => prev.map((f) => (f.id === fresh.id ? fresh : f)));
    } catch (err: any) {
      toast.error(err.message || "Failed to load batch for transfer");
      setIsTransferModalOpen(false);
    } finally {
      setTransferLoading(false);
    }
  }, []);

  const handleSaveProcessing = async () => {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      const received = Number(selectedFlow.floorQuantities.secondaryChecking.received ?? 0);
      const currentSc = selectedFlow.floorQuantities.secondaryChecking;
      const currentM1 = Number(currentSc.m1Quantity ?? 0);
      const currentM2 = Number(currentSc.m2Quantity ?? 0);
      const currentM4 = Number(currentSc.m4Quantity ?? 0);
      const m1Quantity =
        processingData.m1Quantity !== undefined && processingData.m1Quantity !== null
          ? Number(processingData.m1Quantity)
          : currentM1;
      const m2Quantity =
        processingData.m2Quantity !== undefined && processingData.m2Quantity !== null
          ? Number(processingData.m2Quantity)
          : currentM2;
      const m4Quantity =
        processingData.m4Quantity !== undefined && processingData.m4Quantity !== null
          ? Number(processingData.m4Quantity)
          : currentM4;

      if ([m1Quantity, m2Quantity, m4Quantity].some((v) => !Number.isInteger(v) || v < 0)) {
        toast.error("M1, M2, and M4 must be whole numbers ≥ 0");
        return;
      }

      if ([received, m1Quantity, m2Quantity, m4Quantity].every(Number.isFinite) && m1Quantity + m2Quantity + m4Quantity > received) {
        toast.error("M1 + M2 + M4 cannot exceed batch received quantity");
        return;
      }

      const qtyEdited =
        processingData.m1Quantity !== undefined && processingData.m1Quantity !== null
          ? Number(processingData.m1Quantity)
          : null;
      const qtyEditedM2 =
        processingData.m2Quantity !== undefined && processingData.m2Quantity !== null
          ? Number(processingData.m2Quantity)
          : null;
      const qtyEditedM4 =
        processingData.m4Quantity !== undefined && processingData.m4Quantity !== null
          ? Number(processingData.m4Quantity)
          : null;

      const hasAnyChange =
        (qtyEdited !== null && qtyEdited !== currentM1) ||
        (qtyEditedM2 !== null && qtyEditedM2 !== currentM2) ||
        (qtyEditedM4 !== null && qtyEditedM4 !== currentM4) ||
        (processingData.repairStatus ?? "NOT_REQUIRED") !== (currentSc.repairStatus ?? "NOT_REQUIRED") ||
        (processingData.repairRemarks ?? "") !== (currentSc.repairRemarks ?? "");

      if (!hasAnyChange) {
        toast("No changes to save");
        return;
      }

      /** Explicit M1/M2/M4 — use absolute replace (no `mode: increment`). Blank inputs keep server values (resolved above). */
      const payload: Record<string, unknown> = {
        m1Quantity,
        m2Quantity,
        m4Quantity,
        repairStatus: processingData.repairStatus,
        repairRemarks: processingData.repairRemarks,
      };

      const updated = await vendorProductionFlowService.updateFloor(selectedFlow.id, "secondaryChecking", payload);
      toast.success("Secondary checking updated");
      setSelectedFlow(updated);
      setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      const q = updated.floorQuantities.secondaryChecking;
      setProcessingData({
        received: q.received ?? 0,
        repairStatus: q.repairStatus ?? "NOT_REQUIRED",
        repairRemarks: q.repairRemarks ?? "",
      });

      // After save, immediately ask destination + qty in modal.
      setIsTransferModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTransferM1 = useCallback(
    async (args: { toFloorKey: VendorTransferToFloorKey; quantity: number }) => {
      if (!selectedFlow) return;
      setTransferLoading(true);
      try {
        await vendorProductionFlowService.transfer(selectedFlow.id, {
          mode: "increment",
          fromFloorKey: "secondaryChecking",
          toFloorKey: args.toFloorKey,
          quantity: args.quantity,
        });
        toast.success(`Transferred ${args.quantity.toLocaleString()} → ${args.toFloorKey}`);
        // Transfer response may omit populated vendor/PO; refetch so the table matches list/refresh.
        const fresh = await vendorProductionFlowService.getById(selectedFlow.id);
        setSelectedFlow(fresh);
        setFlows((prev) => prev.map((f) => (f.id === fresh.id ? fresh : f)));
        const q = fresh.floorQuantities.secondaryChecking;
        setProcessingData({
          received: q.received ?? 0,
          repairStatus: q.repairStatus ?? "NOT_REQUIRED",
          repairRemarks: q.repairRemarks ?? "",
        });
        setIsTransferModalOpen(false);
        closeProcessDrawer();
      } catch (err: any) {
        toast.error(err.message || "Transfer failed");
      } finally {
        setTransferLoading(false);
      }
    },
    [selectedFlow, closeProcessDrawer]
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
                    const hasM1ToTransfer = Math.max(0, (sc.m1Quantity ?? 0) - (sc.m1Transferred ?? 0)) > 0;
                    
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
                             {hasM1ToTransfer && (
                               <button
                                 onClick={() => void handleOpenTransfer(flow)}
                                 className={CRM.btnSecondary}
                                 disabled={transferLoading}
                                 title="Transfer M1 quantity to next floor"
                               >
                                 Transfer
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
        onClose={closeProcessDrawer}
        loading={processDrawerFetching}
        processingData={processingData}
        setProcessingData={setProcessingData}
        onSave={handleSaveProcessing}
        saving={saving || transferLoading}
      />

      <VendorSecondaryCheckingTransferModal
        open={isTransferModalOpen}
        flow={selectedFlow}
        loading={transferLoading}
        onClose={() => {
          // allow skipping transfer; just close modal and close drawer
          setIsTransferModalOpen(false);
          closeProcessDrawer();
        }}
        onSubmit={handleTransferM1}
      />
    </div>
  );
};

export default SecondaryCheckingPage;
