"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import Link from "next/link";
import SummaryCards from "./components/SummaryCards";
import LiveInventoryTable from "./components/LiveInventoryTable";
import InventoryAlertsModal from "./components/InventoryAlertsModal";
import POYarnDetailsModal from "./components/POYarnDetailsModal";
import {
  YarnInventory,
  InventorySummary,
  PendingDelivery,
  InventoryAlert,
} from "./types";
import {
  getDummyInventory,
  getDummyInventoryAlerts,
  getDummyPendingDeliveries,
  getInventorySummary,
} from "./data/dummyData";

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
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [showYarnDetailsModal, setShowYarnDetailsModal] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  // Generate dummy data
  useEffect(() => {
    const inventoryData = getDummyInventory();
    const deliveriesData = getDummyPendingDeliveries();
    const alertsData = getDummyInventoryAlerts();

    setInventory(inventoryData);
    setPendingDeliveries(deliveriesData);
    setAlerts(alertsData);
    setSummary(getInventorySummary(inventoryData, deliveriesData, alertsData));
  }, []);

  // Open alerts modal by default when alerts are loaded
  useEffect(() => {
    if (alerts.length > 0) {
      setShowAlertsModal(true);
    }
  }, [alerts.length]);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-500 mb-4">
            You don't have permission to access Yarn Management Dashboard.
          </p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Yarn Inventory Dashboard" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none mb-6">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">
                  Yarn Inventory Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Overview of stock, purchases, deliveries, and inventory alerts
                </p>
              </div>
              {/* Alerts Bell Icon */}
              <button
                onClick={() => setShowAlertsModal(true)}
                className="relative p-3 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                aria-label="View inventory alerts"
              >
                <i className="ri-notification-3-line text-2xl text-gray-600 group-hover:text-gray-900 transition-colors"></i>
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white shadow-lg animate-pulse">
                    {alerts.length > 99 ? "99+" : alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <SummaryCards summary={summary} />

          {/* Recent PO Status Section */}
          {pendingDeliveries.length > 0 && (
            <div className="box mb-6">
              <div className="box-header">
                <h3 className="box-title">
                  <i className="ri-truck-line me-2"></i>
                  Recent PO Status ({pendingDeliveries.length})
                </h3>
              </div>
              <div className="box-body">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          PO Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Total Quantity (kg)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Expected Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Yarn Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {pendingDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                            {delivery.poNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                            {delivery.quantity.toLocaleString()} kg
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                            {delivery.expectedDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-b border-gray-300">
                            {delivery.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-b border-gray-300">
                            <button
                              onClick={() => {
                                setSelectedDelivery(delivery);
                                setShowYarnDetailsModal(true);
                              }}
                              className="ti-btn ti-btn-outline ti-btn-sm"
                            >
                              <i className="ri-eye-line me-1"></i>
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Live Inventory Table */}
          <LiveInventoryTable inventory={inventory} />
        </div>
      </div>

      {/* Inventory Alerts Modal */}
      <InventoryAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={alerts}
      />

      {/* PO Yarn Details Modal */}
      <POYarnDetailsModal
        isOpen={showYarnDetailsModal}
        onClose={() => {
          setShowYarnDetailsModal(false);
          setSelectedDelivery(null);
        }}
        delivery={selectedDelivery}
        inventory={inventory}
      />
    </div>
  );
};

export default DashboardPage;
