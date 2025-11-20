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
import { yarnInventoryService } from "./services/yarnInventoryService";

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

        // Fetch yarn inventories
        const inventoryResponse = await yarnInventoryService.getYarnInventories({
          limit: 1000, // Get all inventories
        });

        // Transform API response to UI format
        const transformedInventory: YarnInventory[] =
          inventoryResponse.results.map((item) => {
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
              id: item._id || item.yarnId,
              yarnName: item.yarnName,
              weight: totalWeight,
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
              yarnId: item.yarnId,
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

        // Transform requisitions to pending deliveries
        const transformedDeliveries: PendingDelivery[] = requisitions
          .filter((req) => !req.poSent)
          .map((req) => ({
            id: req._id,
            yarnName: req.yarnName,
            quantity: req.minQty - req.availableQty, // Quantity needed
            expectedDate: new Date(
              new Date(req.created).getTime() + 30 * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split('T')[0], // 30 days from creation
            supplier: 'Supplier', // Not available from API
            poNumber: `PO-${req._id.slice(-6)}`,
            yarns: [
              {
                yarnName: req.yarnName,
                quantity: req.minQty - req.availableQty,
                ratePerUnit: 0, // Not available from API
                totalValue: 0, // Not available from API
              },
            ],
          }));

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
              yarnId: req.yarn._id,
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
            (req) => req.yarn._id === inv.yarnId
          );
          if (relatedRequisitions.length > 0) {
            const totalBlocked = relatedRequisitions.reduce(
              (sum, req) => sum + req.blockedQty,
              0
            );
            inv.blockedQty = totalBlocked;
            const inventoryItem = inventoryResponse.results.find(
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
        setPendingDeliveries(transformedDeliveries);
        setAlerts(transformedAlerts);
        setSummary({
          totalStock: totalStock,
          purchaseYarn: totalStock, // Same as total stock
          pendingDeliveries: transformedDeliveries.length,
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

  if (loading) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-refresh-line me-2"></i>
            Retry
          </button>
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
