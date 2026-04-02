"use client";
import React, { useState, useEffect } from "react";
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
  sameYarnId,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permission
  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  // Fetch data from APIs
  useEffect(() => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // API caps limit (~100); service pages until all rows are loaded
        const inventoryResults =
          await yarnInventoryService.getAllYarnInventories();

        // Transform API response to UI format
        const transformedInventory: YarnInventory[] =
          inventoryResults.map((item) => {
            const totalWeight =
              item.longTermStorage.totalWeight +
              item.shortTermStorage.totalWeight;
            const totalNetWeight =
              item.longTermStorage.netWeight +
              item.shortTermStorage.netWeight;
            const blockedQty = item.overbooked
              ? totalNetWeight
              : 0; // We'll get blocked from requisitions
            const availableQty = totalNetWeight - blockedQty;

            // Map inventory status to UI status
            let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
            if (item.inventoryStatus === 'low_stock' || item.inventoryStatus === 'soon_to_be_low') {
              status = 'Low Stock';
            } else if (totalWeight === 0) {
              status = 'Out of Stock';
            }

            return {
              id: item._id || inventoryYarnId(item) || item.yarnName,
              yarnName: item.yarnName,
              weight: totalWeight, // Total weight (LTS + STS)
              longTermWeight: item.longTermStorage.totalWeight,
              shortTermWeight: item.shortTermStorage.totalWeight,
              conesLongTerm: item.longTermStorage.numberOfCones,
              conesShortTerm: item.shortTermStorage.numberOfCones,
              blockedQty: blockedQty,
              availableQty: availableQty,
              unitOfMeasurement: 'kg',
              ratePerUnit: 0, // Not available from API
              totalValue: 0, // Not available from API
              lastUpdated: new Date().toISOString().split('T')[0],
              status: status,
              supplier: '', // Not available from API
              yarnId: inventoryYarnId(item),
              inventoryStatus: item.inventoryStatus,
              overbooked: item.overbooked,
            };
          });

        // Fetch yarn requisitions (last 90 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const requisitions = await yarnInventoryService.getYarnRequisitions({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          poSent: false, // Only pending deliveries
        });

        const pendingDeliveriesCount = requisitions.filter((req) => !req.poSent).length;

        // Transform requisitions to alerts
        const transformedAlerts: InventoryAlert[] = requisitions
          .filter(
            (req) =>
              req.alertStatus === 'below_minimum' ||
              req.alertStatus === 'overbooked'
          )
          .map((req) => {
            let alertType: 'Low Stock' | 'Out of Stock' | 'Overblocked' =
              'Low Stock';
            let message = '';
            let severity: 'low' | 'medium' | 'high' = 'medium';

            if (req.alertStatus === 'below_minimum') {
              alertType = 'Low Stock';
              message = `Stock is below minimum threshold. Available: ${req.availableQty} kg, Required: ${req.minQty} kg`;
              severity = 'medium';
            } else if (req.alertStatus === 'overbooked') {
              alertType = 'Overblocked';
              message = `Blocked quantity (${req.blockedQty} kg) exceeds available stock (${req.availableQty} kg). Urgent PO required.`;
              severity = 'high';
            }

            return {
              id: req._id,
              yarnId: requisitionYarnId(req) ?? "",
              yarnName: req.yarnName,
              alertType: alertType,
              message: message,
              createdAt: req.created,
              severity: severity,
              minQty: req.minQty,
              availableQty: req.availableQty,
              blockedQty: req.blockedQty,
              alertStatus: req.alertStatus,
            };
          });

        // Update blocked quantities from requisitions
        transformedInventory.forEach((inv) => {
          const relatedRequisitions = requisitions.filter(
            (req) => sameYarnId(requisitionYarnId(req), inv.yarnId)
          );
          if (relatedRequisitions.length > 0) {
            const totalBlocked = relatedRequisitions.reduce(
              (sum, req) => sum + req.blockedQty,
              0
            );
            inv.blockedQty = totalBlocked;
            const inventoryItem = inventoryResults.find(
              (item) => item.yarnId === inv.yarnId
            );
            if (inventoryItem) {
              const totalNetWeight =
                inventoryItem.longTermStorage.netWeight +
                inventoryItem.shortTermStorage.netWeight;
              inv.availableQty = Math.max(0, totalNetWeight - totalBlocked);
            }
          }
        });

        // Calculate summary
        const totalStock = transformedInventory.reduce(
          (sum, item) => sum + item.weight,
          0
        );
        const inventoryValue = transformedInventory.reduce(
          (sum, item) => sum + item.totalValue,
          0
        );

        setInventory(transformedInventory);
        setAlerts(transformedAlerts);
        setSummary({
          totalStock: totalStock,
          purchaseYarn: totalStock, // Same as total stock
          pendingDeliveries: pendingDeliveriesCount,
          inventoryAlerts: transformedAlerts.length,
          inventoryValue: inventoryValue,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load dashboard data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasPermission]);

  // Open alerts modal by default when alerts are loaded
  useEffect(() => {
    if (alerts.length > 0) {
      setShowAlertsModal(true);
    }
  }, [alerts.length]);

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-500 mb-4">You don't have permission to access Yarn Management Dashboard.</p>
            <Link href="/yarn-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
              <i className="ri-arrow-left-line"></i> Back to Yarn Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-red-400 mb-4">
              <i className="ri-error-warning-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Error Loading Dashboard</h3>
            <p className="text-[11px] text-gray-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            >
              <i className="ri-refresh-line"></i> Retry
            </button>
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
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {inventory.length}
              </span>
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
                {alerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                    {alerts.length > 99 ? "99+" : alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-[10px] pb-[10px]">
          <SummaryCards summary={summary} />
        </div>

        <LiveInventoryTable inventory={inventory} />
      </div>

      <InventoryAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={alerts}
      />
    </div>
  );
};

export default DashboardPage;
