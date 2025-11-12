"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import Link from "next/link";
import SummaryCards from "./components/SummaryCards";
import LiveInventoryTable from "./components/LiveInventoryTable";
import FullInventoryView from "./components/FullInventoryView";
import InventoryAlertsModal from "./components/InventoryAlertsModal";
import { YarnInventory, InventorySummary, PendingDelivery, InventoryAlert } from "./types";

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
  const [showFullInventory, setShowFullInventory] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  // Generate dummy data
  useEffect(() => {
    // Generate dummy inventory data
    const dummyInventory: YarnInventory[] = [
      {
        id: "1",
        yarnName: "Cotton Yarn Premium 40s",
        weight: 2500,
        conesLongTerm: 120,
        conesShortTerm: 30,
        blockedQty: 500,
        availableQty: 2000,
        unitOfMeasurement: "kg",
        ratePerUnit: 250,
        totalValue: 625000,
        lastUpdated: "2024-01-15",
        status: "In Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2024-001",
      },
      {
        id: "2",
        yarnName: "Polyester Blend 30s",
        weight: 1800,
        conesLongTerm: 85,
        conesShortTerm: 20,
        blockedQty: 300,
        availableQty: 1500,
        unitOfMeasurement: "kg",
        ratePerUnit: 180,
        totalValue: 324000,
        lastUpdated: "2024-01-14",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "POL-2024-002",
      },
      {
        id: "3",
        yarnName: "Silk Yarn Luxury 60s",
        weight: 450,
        conesLongTerm: 25,
        conesShortTerm: 5,
        blockedQty: 200,
        availableQty: 250,
        unitOfMeasurement: "kg",
        ratePerUnit: 1200,
        totalValue: 540000,
        lastUpdated: "2024-01-13",
        status: "Low Stock",
        supplier: "Silk Traders Co",
        lotNo: "SLK-2024-003",
      },
      {
        id: "4",
        yarnName: "Wool Yarn Winter 20s",
        weight: 0,
        conesLongTerm: 0,
        conesShortTerm: 0,
        blockedQty: 0,
        availableQty: 0,
        unitOfMeasurement: "kg",
        ratePerUnit: 400,
        totalValue: 0,
        lastUpdated: "2024-01-12",
        status: "Out of Stock",
        supplier: "Wool Suppliers Ltd",
        lotNo: "WOL-2024-004",
      },
      {
        id: "5",
        yarnName: "Linen Yarn Natural 35s",
        weight: 1200,
        conesLongTerm: 60,
        conesShortTerm: 15,
        blockedQty: 150,
        availableQty: 1050,
        unitOfMeasurement: "kg",
        ratePerUnit: 350,
        totalValue: 420000,
        lastUpdated: "2024-01-11",
        status: "In Stock",
        supplier: "Natural Fibers Co",
        lotNo: "LIN-2024-005",
      },
      {
        id: "6",
        yarnName: "Cotton Yarn Standard 32s",
        weight: 3200,
        conesLongTerm: 150,
        conesShortTerm: 40,
        blockedQty: 800,
        availableQty: 2400,
        unitOfMeasurement: "kg",
        ratePerUnit: 220,
        totalValue: 704000,
        lastUpdated: "2024-01-16",
        status: "In Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2024-006",
      },
      {
        id: "7",
        yarnName: "Bamboo Yarn Eco 50s",
        weight: 950,
        conesLongTerm: 45,
        conesShortTerm: 12,
        blockedQty: 200,
        availableQty: 750,
        unitOfMeasurement: "kg",
        ratePerUnit: 450,
        totalValue: 427500,
        lastUpdated: "2024-01-10",
        status: "In Stock",
        supplier: "Eco Fibers Co",
        lotNo: "BAM-2024-007",
      },
      {
        id: "8",
        yarnName: "Acrylic Yarn Soft 24s",
        weight: 2800,
        conesLongTerm: 130,
        conesShortTerm: 35,
        blockedQty: 600,
        availableQty: 2200,
        unitOfMeasurement: "kg",
        ratePerUnit: 150,
        totalValue: 420000,
        lastUpdated: "2024-01-09",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "ACR-2024-008",
      },
      {
        id: "9",
        yarnName: "Cashmere Yarn Premium 80s",
        weight: 180,
        conesLongTerm: 10,
        conesShortTerm: 2,
        blockedQty: 50,
        availableQty: 130,
        unitOfMeasurement: "kg",
        ratePerUnit: 2500,
        totalValue: 450000,
        lastUpdated: "2024-01-08",
        status: "Low Stock",
        supplier: "Luxury Yarns Ltd",
        lotNo: "CAS-2024-009",
      },
      {
        id: "10",
        yarnName: "Hemp Yarn Natural 28s",
        weight: 1500,
        conesLongTerm: 70,
        conesShortTerm: 18,
        blockedQty: 250,
        availableQty: 1250,
        unitOfMeasurement: "kg",
        ratePerUnit: 380,
        totalValue: 570000,
        lastUpdated: "2024-01-07",
        status: "In Stock",
        supplier: "Natural Fibers Co",
        lotNo: "HEM-2024-010",
      },
      {
        id: "11",
        yarnName: "Cotton Yarn Premium 40s",
        weight: 2100,
        conesLongTerm: 100,
        conesShortTerm: 25,
        blockedQty: 400,
        availableQty: 1700,
        unitOfMeasurement: "kg",
        ratePerUnit: 250,
        totalValue: 525000,
        lastUpdated: "2024-01-06",
        status: "In Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2024-011",
      },
      {
        id: "12",
        yarnName: "Polyester Yarn Strong 36s",
        weight: 1900,
        conesLongTerm: 90,
        conesShortTerm: 22,
        blockedQty: 350,
        availableQty: 1550,
        unitOfMeasurement: "kg",
        ratePerUnit: 190,
        totalValue: 361000,
        lastUpdated: "2024-01-05",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "POL-2024-012",
      },
      {
        id: "13",
        yarnName: "Silk Yarn Deluxe 70s",
        weight: 320,
        conesLongTerm: 18,
        conesShortTerm: 4,
        blockedQty: 150,
        availableQty: 170,
        unitOfMeasurement: "kg",
        ratePerUnit: 1500,
        totalValue: 480000,
        lastUpdated: "2024-01-04",
        status: "Low Stock",
        supplier: "Silk Traders Co",
        lotNo: "SLK-2024-013",
      },
      {
        id: "14",
        yarnName: "Cotton Yarn Organic 38s",
        weight: 1600,
        conesLongTerm: 75,
        conesShortTerm: 20,
        blockedQty: 300,
        availableQty: 1300,
        unitOfMeasurement: "kg",
        ratePerUnit: 280,
        totalValue: 448000,
        lastUpdated: "2024-01-03",
        status: "In Stock",
        supplier: "Organic Textiles Ltd",
        lotNo: "ORG-2024-014",
      },
      {
        id: "15",
        yarnName: "Wool Yarn Merino 22s",
        weight: 1100,
        conesLongTerm: 52,
        conesShortTerm: 13,
        blockedQty: 200,
        availableQty: 900,
        unitOfMeasurement: "kg",
        ratePerUnit: 420,
        totalValue: 462000,
        lastUpdated: "2024-01-02",
        status: "In Stock",
        supplier: "Wool Suppliers Ltd",
        lotNo: "WOL-2024-015",
      },
      {
        id: "16",
        yarnName: "Linen Yarn Fine 40s",
        weight: 800,
        conesLongTerm: 38,
        conesShortTerm: 10,
        blockedQty: 100,
        availableQty: 700,
        unitOfMeasurement: "kg",
        ratePerUnit: 400,
        totalValue: 320000,
        lastUpdated: "2024-01-01",
        status: "In Stock",
        supplier: "Natural Fibers Co",
        lotNo: "LIN-2024-016",
      },
      {
        id: "17",
        yarnName: "Bamboo Yarn Soft 45s",
        weight: 750,
        conesLongTerm: 35,
        conesShortTerm: 9,
        blockedQty: 120,
        availableQty: 630,
        unitOfMeasurement: "kg",
        ratePerUnit: 480,
        totalValue: 360000,
        lastUpdated: "2023-12-31",
        status: "In Stock",
        supplier: "Eco Fibers Co",
        lotNo: "BAM-2024-017",
      },
      {
        id: "18",
        yarnName: "Acrylic Yarn Bright 26s",
        weight: 2200,
        conesLongTerm: 105,
        conesShortTerm: 28,
        blockedQty: 500,
        availableQty: 1700,
        unitOfMeasurement: "kg",
        ratePerUnit: 160,
        totalValue: 352000,
        lastUpdated: "2023-12-30",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "ACR-2024-018",
      },
      {
        id: "19",
        yarnName: "Cotton Yarn Premium 40s",
        weight: 500,
        conesLongTerm: 24,
        conesShortTerm: 6,
        blockedQty: 600, // Overblocked
        availableQty: -100,
        unitOfMeasurement: "kg",
        ratePerUnit: 250,
        totalValue: 125000,
        lastUpdated: "2023-12-29",
        status: "Low Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2024-019",
      },
      {
        id: "20",
        yarnName: "Silk Yarn Luxury 60s",
        weight: 200,
        conesLongTerm: 12,
        conesShortTerm: 3,
        blockedQty: 50,
        availableQty: 150,
        unitOfMeasurement: "kg",
        ratePerUnit: 1200,
        totalValue: 240000,
        lastUpdated: "2023-12-28",
        status: "Low Stock",
        supplier: "Silk Traders Co",
        lotNo: "SLK-2024-020",
      },
    ];

    // Generate dummy pending deliveries
    const dummyDeliveries: PendingDelivery[] = [
      {
        id: "D1",
        yarnName: "Wool Yarn Winter 20s",
        quantity: 500,
        expectedDate: "2024-01-20",
        supplier: "Wool Suppliers Ltd",
        poNumber: "PO-2024-001",
      },
      {
        id: "D2",
        yarnName: "Cotton Yarn Premium 40s",
        quantity: 1000,
        expectedDate: "2024-01-18",
        supplier: "Textile Mills Ltd",
        poNumber: "PO-2024-002",
      },
      {
        id: "D3",
        yarnName: "Silk Yarn Luxury 60s",
        quantity: 200,
        expectedDate: "2024-01-22",
        supplier: "Silk Traders Co",
        poNumber: "PO-2024-003",
      },
    ];

    // Generate dummy alerts
    const dummyAlerts: InventoryAlert[] = [
      {
        id: "A1",
        yarnId: "3",
        yarnName: "Silk Yarn Luxury 60s",
        alertType: "Low Stock",
        message: "Stock is below minimum threshold",
        createdAt: "2024-01-13",
        severity: "medium",
      },
      {
        id: "A2",
        yarnId: "4",
        yarnName: "Wool Yarn Winter 20s",
        alertType: "Out of Stock",
        message: "Item is out of stock",
        createdAt: "2024-01-12",
        severity: "high",
      },
      {
        id: "A3",
        yarnId: "19",
        yarnName: "Cotton Yarn Premium 40s",
        alertType: "Overblocked",
        message: "Blocked quantity exceeds available stock. Urgent PO required.",
        createdAt: "2024-01-15",
        severity: "high",
      },
    ];

    setInventory(dummyInventory);
    setPendingDeliveries(dummyDeliveries);
    setAlerts(dummyAlerts);

    // Calculate summary
    const totalStock = dummyInventory.reduce((sum, item) => sum + item.weight, 0);
    const purchaseYarn = dummyInventory.reduce(
      (sum, item) => sum + item.weight,
      0
    );
    const inventoryValue = dummyInventory.reduce(
      (sum, item) => sum + item.totalValue,
      0
    );

    setSummary({
      totalStock,
      purchaseYarn,
      pendingDeliveries: dummyDeliveries.length,
      inventoryAlerts: dummyAlerts.length,
      inventoryValue,
    });
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

          {/* Pending Deliveries Section */}
          {pendingDeliveries.length > 0 && (
            <div className="box mb-6">
              <div className="box-header">
                <h3 className="box-title">
                  <i className="ri-truck-line me-2"></i>
                  Pending Deliveries ({pendingDeliveries.length})
                </h3>
              </div>
              <div className="box-body">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Yarn Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Quantity (kg)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Expected Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          PO Number
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {pendingDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                            {delivery.yarnName}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b border-gray-300">
                            {delivery.poNumber}
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
          <LiveInventoryTable
            inventory={inventory}
            onViewFull={() => setShowFullInventory(true)}
          />
        </div>
      </div>

      {/* Full Inventory Modal */}
      <FullInventoryView
        inventory={inventory}
        isOpen={showFullInventory}
        onClose={() => setShowFullInventory(false)}
      />

      {/* Inventory Alerts Modal */}
      <InventoryAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={alerts}
      />
    </div>
  );
};

export default DashboardPage;
