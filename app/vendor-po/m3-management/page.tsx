"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import vendorM2M3M4ManagementService, {
  type VendorM3FlowRow,
  type VendorM3FlowSummary,
  type VendorM3Statistics,
} from "@/shared/services/vendorM2M3M4ManagementService";
import { getVendorFlowRowId } from "@/app/vendor-po/utils/getVendorFlowRowId";
import FlowViewTab from "./components/FlowViewTab";
import OrdersViewTab from "./components/OrdersViewTab";
import LogsTab from "./components/LogsTab";
import M3OutwardDrawer from "./components/M3OutwardDrawer";
import M3FlowDetailDrawer from "./components/M3FlowDetailDrawer";

type M3Tab = "orders" | "flow-view" | "logs";

/**
 * Vendor M3 Management — track M3 quantity and ledger across vendor QC floors.
 */
export default function VendorM3ManagementPage() {
  const [activeTab, setActiveTab] = useState<M3Tab>("flow-view");
  const [rows, setRows] = useState<VendorM3FlowRow[]>([]);
  const [stats, setStats] = useState<VendorM3Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [refreshKey, setRefreshKey] = useState(0);

  const [outwardRow, setOutwardRow] = useState<VendorM3FlowRow | null>(null);
  const [isOutwardSubmitting, setIsOutwardSubmitting] = useState(false);

  const [detailSummary, setDetailSummary] = useState<VendorM3FlowSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [flowsRes, statsRes] = await Promise.all([
        vendorM2M3M4ManagementService.getM3Flows({ limit: 1000 }),
        vendorM2M3M4ManagementService.getM3Statistics(),
      ]);
      setRows(flowsRes.results ?? []);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load M3 data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const handleView = async (row: VendorM3FlowRow) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetailSummary(null);
    try {
      const flowId = getVendorFlowRowId(row);
      const summary = await vendorM2M3M4ManagementService.getM3FlowSummary(flowId, 30);
      setDetailSummary(summary);
    } catch {
      toast.error("Failed to load flow summary");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOutwardSubmit = async (quantity: number, remarks: string) => {
    if (!outwardRow) return;
    setIsOutwardSubmitting(true);
    try {
      const flowId = getVendorFlowRowId(outwardRow);
      await vendorM2M3M4ManagementService.markM3Outward(flowId, { quantity, remarks });
      toast.success("M3 marked outward");
      setOutwardRow(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Outward failed");
    } finally {
      setIsOutwardSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="Vendor M3 Management" />
      <div className="main-content !p-[10px]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-[10px]">
          <header className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
            <div className="w-1 h-8 bg-orange-600 rounded" aria-hidden="true" />
            <div>
              <h1 className="text-sm font-bold text-gray-900">Vendor M3 Management</h1>
              <p className="text-[10px] text-gray-500">
                Track minor defects (M3) by VPO and reference — entries by floor &amp; outward ledger
              </p>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { label: "Flows", value: stats?.flowCount ?? "—", accent: "border-gray-300" },
              { label: "M3 on hand", value: stats?.totalOnHand ?? "—", accent: "border-orange-200 bg-orange-50" },
              { label: "Outwarded", value: stats?.totalOutwarded ?? "—", accent: "border-orange-200 bg-orange-50" },
              { label: "Available", value: stats?.totalAvailable ?? "—", accent: "border-orange-300 bg-orange-50" },
            ].map((tile) => (
              <div key={tile.label} className={`rounded border-2 ${tile.accent} p-2`}>
                <div className="text-[10px] font-bold text-gray-600 uppercase">{tile.label}</div>
                <div className="text-lg font-bold text-gray-900">{tile.value}</div>
              </div>
            ))}
          </div>

          <div className="flex border-b border-gray-300 mb-3">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "orders" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("orders")}
            >
              VPO
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "flow-view" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("flow-view")}
            >
              Flow View
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "logs" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
          </div>

          {activeTab === "orders" ? (
            <OrdersViewTab rows={rows} isLoading={isLoading} onView={handleView} onOutward={setOutwardRow} />
          ) : activeTab === "flow-view" ? (
            <FlowViewTab
              rows={rows}
              isLoading={isLoading}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              onView={handleView}
              onOutward={setOutwardRow}
            />
          ) : (
            <LogsTab refreshKey={refreshKey} />
          )}
        </div>
      </div>

      {outwardRow && (
        <M3OutwardDrawer
          row={outwardRow}
          isSubmitting={isOutwardSubmitting}
          onClose={() => setOutwardRow(null)}
          onSubmit={handleOutwardSubmit}
        />
      )}

      {showDetail && (
        <M3FlowDetailDrawer
          summary={detailSummary}
          isLoading={detailLoading}
          onClose={() => {
            setShowDetail(false);
            setDetailSummary(null);
          }}
        />
      )}
    </>
  );
}
