"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import Link from "next/link";
import SummaryCards from "./components/SummaryCards";
import LiveInventoryTable from "./components/LiveInventoryTable";
import FullInventoryView from "./components/FullInventoryView";
import InventoryAlertsModal from "./components/InventoryAlertsModal";
import POYarnDetailsModal from "./components/POYarnDetailsModal";
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
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [showYarnDetailsModal, setShowYarnDetailsModal] = useState(false);

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
        lastUpdated: "2025-11-10",
        status: "In Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2025-001",
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
        lastUpdated: "2025-11-09",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "POL-2025-002",
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
        lastUpdated: "2025-11-08",
        status: "Low Stock",
        supplier: "Silk Traders Co",
        lotNo: "SLK-2025-003",
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
        lastUpdated: "2025-11-07",
        status: "Out of Stock",
        supplier: "Wool Suppliers Ltd",
        lotNo: "WOL-2025-004",
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
        lastUpdated: "2025-11-06",
        status: "In Stock",
        supplier: "Natural Fibers Co",
        lotNo: "LIN-2025-005",
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
        lastUpdated: "2025-11-11",
        status: "In Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2025-006",
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
        lastUpdated: "2025-11-05",
        status: "In Stock",
        supplier: "Eco Fibers Co",
        lotNo: "BAM-2025-007",
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
        lastUpdated: "2025-11-04",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "ACR-2025-008",
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
        lastUpdated: "2025-11-03",
        status: "Low Stock",
        supplier: "Luxury Yarns Ltd",
        lotNo: "CAS-2025-009",
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
        lastUpdated: "2025-11-02",
        status: "In Stock",
        supplier: "Natural Fibers Co",
        lotNo: "HEM-2025-010",
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
        lastUpdated: "2025-11-01",
        status: "In Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2025-011",
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
        lastUpdated: "2025-10-31",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "POL-2025-012",
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
        lastUpdated: "2025-10-30",
        status: "Low Stock",
        supplier: "Silk Traders Co",
        lotNo: "SLK-2025-013",
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
        lastUpdated: "2025-10-29",
        status: "In Stock",
        supplier: "Organic Textiles Ltd",
        lotNo: "ORG-2025-014",
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
        lastUpdated: "2025-10-28",
        status: "In Stock",
        supplier: "Wool Suppliers Ltd",
        lotNo: "WOL-2025-015",
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
        lastUpdated: "2025-10-27",
        status: "In Stock",
        supplier: "Natural Fibers Co",
        lotNo: "LIN-2025-016",
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
        lastUpdated: "2025-10-26",
        status: "In Stock",
        supplier: "Eco Fibers Co",
        lotNo: "BAM-2025-017",
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
        lastUpdated: "2025-10-25",
        status: "In Stock",
        supplier: "Synthetic Fibers Inc",
        lotNo: "ACR-2025-018",
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
        lastUpdated: "2025-10-24",
        status: "Low Stock",
        supplier: "Textile Mills Ltd",
        lotNo: "COT-2025-019",
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
        lastUpdated: "2025-10-23",
        status: "Low Stock",
        supplier: "Silk Traders Co",
        lotNo: "SLK-2025-020",
      },
    ];

    // Generate dummy pending deliveries
    const dummyDeliveriesData = [
      {
        id: "D1",
        expectedDate: "2025-11-25",
        supplier: "Wool Suppliers Ltd",
        poNumber: "PO-2025-001",
        yarns: [
          {
            yarnName: "Wool Yarn Winter 20s",
            quantity: 500,
            ratePerUnit: 400,
            totalValue: 200000,
          },
          {
            yarnName: "Cotton Yarn Premium 40s",
            quantity: 800,
            ratePerUnit: 250,
            totalValue: 200000,
          },
          {
            yarnName: "Polyester Blend 30s",
            quantity: 600,
            ratePerUnit: 180,
            totalValue: 108000,
          },
          {
            yarnName: "Linen Yarn Natural 35s",
            quantity: 400,
            ratePerUnit: 350,
            totalValue: 140000,
          },
          {
            yarnName: "Bamboo Yarn Eco 50s",
            quantity: 200,
            ratePerUnit: 450,
            totalValue: 90000,
          },
        ],
      },
      {
        id: "D2",
        expectedDate: "2025-11-20",
        supplier: "Textile Mills Ltd",
        poNumber: "PO-2025-002",
        yarns: [
          {
            yarnName: "Cotton Yarn Premium 40s",
            quantity: 1000,
            ratePerUnit: 250,
            totalValue: 250000,
          },
          {
            yarnName: "Cotton Yarn Standard 32s",
            quantity: 1200,
            ratePerUnit: 220,
            totalValue: 264000,
          },
          {
            yarnName: "Cotton Yarn Organic 38s",
            quantity: 1000,
            ratePerUnit: 280,
            totalValue: 280000,
          },
        ],
      },
      {
        id: "D3",
        expectedDate: "2025-11-28",
        supplier: "Silk Traders Co",
        poNumber: "PO-2025-003",
        yarns: [
          {
            yarnName: "Silk Yarn Luxury 60s",
            quantity: 200,
            ratePerUnit: 1200,
            totalValue: 240000,
          },
          {
            yarnName: "Silk Yarn Deluxe 70s",
            quantity: 300,
            ratePerUnit: 1500,
            totalValue: 450000,
          },
          {
            yarnName: "Cashmere Yarn Premium 80s",
            quantity: 100,
            ratePerUnit: 2500,
            totalValue: 250000,
          },
          {
            yarnName: "Linen Yarn Fine 40s",
            quantity: 400,
            ratePerUnit: 400,
            totalValue: 160000,
          },
          {
            yarnName: "Bamboo Yarn Soft 45s",
            quantity: 300,
            ratePerUnit: 480,
            totalValue: 144000,
          },
          {
            yarnName: "Hemp Yarn Natural 28s",
            quantity: 200,
            ratePerUnit: 380,
            totalValue: 76000,
          },
        ],
      },
    ];

    // Calculate total quantity from yarns and create PendingDelivery objects
    const dummyDeliveries: PendingDelivery[] = dummyDeliveriesData.map((delivery) => {
      const totalQuantity = delivery.yarns.reduce((sum, yarn) => sum + yarn.quantity, 0);
      return {
        id: delivery.id,
        yarnName: "Multiple Yarns",
        quantity: totalQuantity,
        expectedDate: delivery.expectedDate,
        supplier: delivery.supplier,
        poNumber: delivery.poNumber,
        yarns: delivery.yarns,
      };
    });

    // Generate dummy alerts
    const dummyAlerts: InventoryAlert[] = [
      {
        id: "A1",
        yarnId: "3",
        yarnName: "Silk Yarn Luxury 60s",
        alertType: "Low Stock",
        message: "Stock is below minimum threshold",
        createdAt: "2025-11-10",
        severity: "medium",
      },
      {
        id: "A2",
        yarnId: "4",
        yarnName: "Wool Yarn Winter 20s",
        alertType: "Out of Stock",
        message: "Item is out of stock",
        createdAt: "2025-11-09",
        severity: "high",
      },
      {
        id: "A3",
        yarnId: "19",
        yarnName: "Cotton Yarn Premium 40s",
        alertType: "Overblocked",
        message: "Blocked quantity exceeds available stock. Urgent PO required.",
        createdAt: "2025-11-12",
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
