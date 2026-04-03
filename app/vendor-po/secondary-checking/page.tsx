"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import vendorProductionFlowService, {
  VendorProductionFlow,
  QualityFloorQuantity,
  CreateProductionFlowPayload,
} from "@/shared/services/vendorProductionFlowService";
import vendorManagementService, { VendorManagementDocument } from "@/shared/services/vendorManagementService";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import { VendorSecondaryCheckingCreateDrawer } from "./components/VendorSecondaryCheckingCreateDrawer";
import { VendorSecondaryCheckingProcessDrawer } from "./components/VendorSecondaryCheckingProcessDrawer";

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
      setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      closeProcessDrawer();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (flow: VendorProductionFlow) => {
    const isCompleted = flow.floorQuantities.secondaryChecking.completed > 0;
    if (isCompleted) return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-green-100 text-green-800";
    return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Secondary Checking" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Secondary Checking Floor</h1>
              <HelpIcon
                title="Secondary Checking"
                content="Monitor and record quality status for vendor production batches. This is the first quality gate in the vendor flow."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" />
                Add New Batch
              </button>
              <button
                onClick={loadFlows}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-refresh-line text-xs" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80 min-w-[200px]">
              <input
                type="text"
                className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                placeholder="Search by Batch, Vendor or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-[#495057] mb-0">Show:</label>
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
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Batch / Reference</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Vendor & PO</th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Planned</th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">M1/M2/M4 Counts</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-1.5 py-10 border border-gray-200 text-center text-gray-400 text-xs font-bold tracking-widest uppercase">
                      No batches found
                    </td>
                  </tr>
                ) : (
                  paginatedFlows.map((flow) => {
                    const sc = flow.floorQuantities.secondaryChecking;
                    const vendorName = typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName : "Unknown";
                    const poNumber = typeof flow.vendorPurchaseOrder === "object" ? flow.vendorPurchaseOrder?.vpoNumber : "N/A";
                    return (
                      <tr key={flow.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <div className="font-bold text-gray-900 text-[12px]">{flow.referenceCode || "—"}</div>
                          <div className="text-[10px] text-gray-400 font-medium tracking-tight uppercase leading-none">ID: {flow.id.slice(-6)}</div>
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <div className="font-bold text-purple-600 underline underline-offset-2 decoration-purple-200">{vendorName}</div>
                          <div className="text-[10px] text-gray-500 font-bold mt-0.5">VPO: {poNumber}</div>
                        </td>
                        <td className="px-1.5 py-2.5 text-right font-bold text-gray-800 text-[12px] border border-gray-200">{flow.plannedQuantity.toLocaleString()}</td>
                        <td className="px-1.5 py-2.5 text-right font-medium text-gray-700 text-[12px] border border-gray-200">{sc.received.toLocaleString()}</td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
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
                        <td className="px-1.5 py-2.5 border border-gray-200">
                           <span className={getStatusBadge(flow)}>
                             {sc.completed > 0 ? "Completed" : "Pending"}
                           </span>
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => handleOpenProcess(flow)}
                               className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
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

        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of {filteredFlows.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-[11px] font-bold text-gray-500 px-2">
              Page {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
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
        saving={saving}
      />
    </div>
  );
};

export default SecondaryCheckingPage;
