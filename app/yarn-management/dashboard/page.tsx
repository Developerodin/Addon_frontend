"use client";
import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import Link from "next/link";
import SummaryCards from "./components/SummaryCards";
import LiveInventoryTable from "./components/LiveInventoryTable";
import InventoryAlertsModal from "./components/InventoryAlertsModal";
import {
  YarnInventory,
  InventorySummary,
  InventoryAlert,
} from "./types";
import {
  yarnInventoryService,
  inventoryYarnId,
  requisitionYarnId,
} from "./services/yarnInventoryService";

const DashboardPage = () => {
  const { hasSubPermission } = useNavigation();
  const [inventory, setInventory] = useState<YarnInventory[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalStock: 0,
    purchaseYarn: 0,
    pendingDeliveries: 0,
    inventoryAlerts: 0,
    inventoryValue: 0,
  });
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  const fetchInventory = useCallback(async () => {
    try {
      setInventoryLoading(true);
      setInventoryError(null);

      const inventoryPage = await yarnInventoryService.getYarnInventories({
        limit: 20,
        page: 1,
      });

      const transformedInventory: YarnInventory[] = inventoryPage.results.map(
        (item) => {
          const totalWeight =
            item.longTermStorage.totalWeight + item.shortTermStorage.totalWeight;
          const totalNetWeight =
            item.longTermStorage.netWeight + item.shortTermStorage.netWeight;
          const blockedQty = item.overbooked ? totalNetWeight : 0;
          const availableQty = totalNetWeight - blockedQty;

          let status: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
          if (
            item.inventoryStatus === "low_stock" ||
            item.inventoryStatus === "soon_to_be_low"
          ) {
            status = "Low Stock";
          } else if (totalWeight === 0) {
            status = "Out of Stock";
          }

          return {
            id: item._id || inventoryYarnId(item) || item.yarnName,
            yarnName: item.yarnName,
            weight: totalWeight,
            longTermWeight: item.longTermStorage.totalWeight,
            shortTermWeight: item.shortTermStorage.totalWeight,
            conesLongTerm: item.longTermStorage.numberOfCones,
            conesShortTerm: item.shortTermStorage.numberOfCones,
            blockedQty,
            availableQty,
            unitOfMeasurement: "kg",
            ratePerUnit: 0,
            totalValue: 0,
            lastUpdated: new Date().toISOString().split("T")[0],
            status,
            supplier: "",
            yarnId: inventoryYarnId(item),
            inventoryStatus: item.inventoryStatus,
            overbooked: item.overbooked,
          };
        }
      );

      const totalStockKg = inventoryPage.summary?.totalKg ?? 0;
      setInventory(transformedInventory);
      setSummary((prev) => ({
        ...prev,
        totalStock: totalStockKg,
        purchaseYarn: totalStockKg,
      }));
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setInventoryError(
        err instanceof Error ? err.message : "Failed to load inventory"
      );
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      setAlertsError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const reqResponse = await yarnInventoryService.getYarnRequisitions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        poSent: false,
        page: 1,
        limit: 50,
        skipRecalculation: true,
      });

      const requisitions = reqResponse.results;
      const alertSummary = reqResponse.alertSummary;

      const transformedAlerts: InventoryAlert[] = requisitions
        .filter(
          (req) =>
            req.alertStatus === "below_minimum" ||
            req.alertStatus === "overbooked"
        )
        .map((req) => {
          let alertType: "Low Stock" | "Out of Stock" | "Overblocked" =
            "Low Stock";
          let message = "";
          let severity: "low" | "medium" | "high" = "medium";

          if (req.alertStatus === "below_minimum") {
            alertType = "Low Stock";
            message = `Stock is below minimum threshold. Available: ${req.availableQty} kg, Required: ${req.minQty} kg`;
            severity = "medium";
          } else if (req.alertStatus === "overbooked") {
            alertType = "Overblocked";
            message = `Blocked quantity (${req.blockedQty} kg) exceeds available stock (${req.availableQty} kg). Urgent PO required.`;
            severity = "high";
          }

          return {
            id: req._id,
            yarnId: requisitionYarnId(req) ?? "",
            yarnName: req.yarnName,
            alertType,
            message,
            createdAt: req.created,
            severity,
            minQty: req.minQty,
            availableQty: req.availableQty,
            blockedQty: req.blockedQty,
            alertStatus: req.alertStatus,
          };
        });

      setAlerts(transformedAlerts);
      setSummary((prev) => ({
        ...prev,
        pendingDeliveries: alertSummary.pendingDeliveries,
        inventoryAlerts: alertSummary.alertCount,
      }));
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setAlertsError(
        err instanceof Error ? err.message : "Failed to load alerts"
      );
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      setInventoryLoading(false);
      setAlertsLoading(false);
      return;
    }
    fetchInventory();
    fetchAlerts();
  }, [hasPermission, fetchInventory, fetchAlerts]);

  useEffect(() => {
    if (alerts.length > 0 && !alertsLoading) {
      setShowAlertsModal(true);
    }
  }, [alerts.length, alertsLoading]);

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-500 mb-4">You don&apos;t have permission to access Yarn Management Dashboard.</p>
            <Link href="/yarn-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
              <i className="ri-arrow-left-line"></i> Back to Yarn Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Inventory Dashboard" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Inventory Dashboard</h1>
              {!inventoryLoading && (
                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {inventory.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href="/yarn-management/dashboard/report"
                className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                aria-label="Yarn report"
              >
                <i className="ri-file-chart-line text-lg"></i>
              </Link>
              <button
                type="button"
                onClick={() => setShowAlertsModal(true)}
                className="relative w-9 h-9 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="View inventory alerts"
              >
                <i className="ri-notification-3-line text-lg text-gray-600"></i>
                {alertsLoading ? (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-[18px] h-[18px] bg-gray-300 rounded-full border-2 border-white">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                  </span>
                ) : alerts.length > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                    {alerts.length > 99 ? "99+" : alerts.length}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>

        <div className="px-[10px] pb-[10px]">
          <SummaryCards summary={summary} loading={inventoryLoading || alertsLoading} />
        </div>

        {inventoryLoading ? (
          <div className="border-t border-gray-100 p-[10px]">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Loading Inventory...</p>
            </div>
          </div>
        ) : inventoryError ? (
          <div className="border-t border-gray-100 p-[10px]">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <i className="ri-error-warning-line text-3xl text-red-400 mb-2"></i>
              <p className="text-[11px] text-gray-500 mb-2">{inventoryError}</p>
              <button
                type="button"
                onClick={fetchInventory}
                className="text-[10px] text-purple-600 font-bold hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <LiveInventoryTable inventory={inventory} />
        )}
      </div>

      <InventoryAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={alerts}
        loading={alertsLoading}
      />
    </div>
  );
};

export default DashboardPage;
