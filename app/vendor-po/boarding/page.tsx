"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorProductionFlowService, {
  VendorProductionFlow,
  type BoardingFloorPatchPayload,
} from "@/shared/services/vendorProductionFlowService";
import { VendorProductionFloorDrawer } from "../components/VendorProductionFloorDrawer";
import { VendorFloorBatchSummary } from "../components/VendorFloorBatchSummary";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";

const BoardingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedQty, setCompletedQty] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list(
        productionFlowListParams("boarding"),
      );
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

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    setSelectedFlow(flow);
    setCompletedQty(flow.floorQuantities.boarding.completed ?? 0);
    setIsProcessing(true);
  };

  const handleSaveProcessing = async () => {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      const payload: BoardingFloorPatchPayload = {
        completed: Number(completedQty) || 0,
      };
      await vendorProductionFlowService.updateFloor(
        selectedFlow.id,
        "boarding",
        payload,
      );
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
    if (isCompleted)
      return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-green-100 text-green-800";
    return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-red-100 text-red-800";
  };

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
      <Seo title="Boarding Floor" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">
                Boarding Stage
              </h1>
              <HelpIcon
                title="Boarding Process"
                content="Main vendor pipeline is secondaryChecking → branding → finalChecking → dispatch. Boarding is optional (e.g. rework). This list shows flows where currentFloorKey is boarding."
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
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80 min-w-[200px]">
              <input
                type="text"
                className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                placeholder="Search by batch, vendor or PO..."
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
                <option value={30}>30</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Batch / Reference
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Vendor &amp; PO
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Received
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Completed
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Transferred
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Status
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
                    className="px-1.5 py-20 text-center font-bold tracking-widest text-[#7987A1] text-[10px] uppercase border border-gray-200"
                  >
                    No boarding tasks found
                  </td>
                </tr>
              ) : (
                paginatedFlows.map((flow) => {
                  const bs = flow.floorQuantities.boarding;
                  const vendorName =
                    typeof flow.vendor === "object"
                      ? flow.vendor?.header?.vendorName
                      : "Unknown";
                  const poNumber =
                    typeof flow.vendorPurchaseOrder === "object"
                      ? flow.vendorPurchaseOrder?.vpoNumber
                      : "N/A";
                  return (
                    <tr
                      key={flow.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="font-bold text-gray-800 text-[12px]">
                          {flow.referenceCode || "—"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium uppercase leading-none">
                          Flow: {flow.id.slice(-6)}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-2">
                          {vendorName}
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                          VPO: {poNumber}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-medium text-[12px] text-gray-700 border border-gray-200">
                        {bs.received.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-[12px] text-emerald-600 border border-gray-200">
                        {bs.completed.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-right text-[12px] text-sky-600 border border-gray-200">
                        {bs.transferred.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span className={getStatusBadge(flow)}>
                          {bs.completed > 0 ? "Processed" : "Pending"}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenProcess(flow)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
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
            <strong>Boarding:</strong> only <strong>completed</strong> is sent
            to the API from this screen.
          </p>
        }
      >
        {selectedFlow && (
          <>
            <VendorFloorBatchSummary flow={selectedFlow} />
            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>2. Completed quantity</div>
              <div className="p-3">
                <label className={CRM.label}>Completed quantity</label>
                <input
                  type="number"
                  min={0}
                  className={`${CRM.input} border-emerald-200 focus:border-emerald-500 max-w-[200px]`}
                  value={completedQty}
                  onChange={(e) => setCompletedQty(Number(e.target.value))}
                />
              </div>
            </div>
          </>
        )}
      </VendorProductionFloorDrawer>
    </div>
  );
};

export default BoardingPage;
