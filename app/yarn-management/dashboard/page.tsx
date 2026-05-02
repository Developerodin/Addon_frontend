"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  type YarnInventorySummaryQueryParams,
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
    longTermKg: 0,
    shortTermKg: 0,
    unallocatedKg: 0,
    blockedKg: 0,
    ltPlusShortKg: 0,
  });
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [globalSummaryLoading, setGlobalSummaryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Filter state (server-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const globalSummaryDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const globalSummaryFirstLoadRef = useRef(true);

  // Export state
  const [exporting, setExporting] = useState(false);

  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  /**
   * Transforms API response item to YarnInventory format
   * 
   * Storage Logic:
   * - LT (Long-Term): Boxes in LT storage locations
   * - ST (Short-Term): Cones in ST storage locations only
   * - Unallocated: Boxes without storage location
   * - Blocked: Cones issued for production
   * - Available: LT net + ST net - Blocked
   * - Total Weight: LT + ST (unallocated is separate)
   */
  const transformInventoryItem = useCallback((item: any): YarnInventory => {
    const totalWeight =
      item.longTermStorage.totalWeight + item.shortTermStorage.totalWeight;
    const totalNetWeight =
      item.longTermStorage.netWeight + item.shortTermStorage.netWeight;
    const unallocatedWeight = item.unallocatedStorage?.totalWeight || 0;
    const blockedQty = item.blockedQty || 0;
    const availableQty = Math.max(0, totalNetWeight - blockedQty);

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
      unallocatedWeight,
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
  }, []);

  /**
   * Fetches global bucket totals (LTS / STS / unallocated / blocked) from GET /yarn-inventories/summary.
   * Respects the same yarn name and inventory status filters as the table (full dataset, not paginated).
   */
  const fetchGlobalSummary = useCallback(async () => {
    try {
      setGlobalSummaryLoading(true);
      const params: YarnInventorySummaryQueryParams = {};
      if (searchTerm.trim()) {
        params.yarn_name = searchTerm.trim();
      }
      if (statusFilter !== "all") {
        if (statusFilter === "Low Stock") {
          params.inventory_status = "low_stock";
        } else if (statusFilter === "In Stock") {
          params.inventory_status = "in_stock";
        }
      }
      const data = await yarnInventoryService.getYarnInventoriesSummary(params);
      const grand = data.totals.grandNetKgAllBuckets;
      setSummary((prev) => ({
        ...prev,
        totalStock: grand,
        purchaseYarn: grand,
        longTermKg: data.totals.longTermKg,
        shortTermKg: data.totals.shortTermKg,
        unallocatedKg: data.totals.unallocatedKg,
        blockedKg: data.totals.blockedKg,
        ltPlusShortKg: data.totals.ltPlusShortKg,
      }));
    } catch (err) {
      console.error("Error fetching yarn inventory summary:", err);
    } finally {
      setGlobalSummaryLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const fetchInventory = useCallback(async (
    page: number = currentPage,
    limit: number = rowsPerPage,
    yarnName: string = searchTerm,
    inventoryStatus: string = statusFilter
  ) => {
    try {
      setInventoryLoading(true);
      setInventoryError(null);

      // Build API params
      const params: Record<string, any> = {
        limit,
        page,
      };

      // Add yarn_name filter if search term exists
      if (yarnName.trim()) {
        params.yarn_name = yarnName.trim();
      }

      // Map status filter to API inventory_status
      if (inventoryStatus !== "all") {
        if (inventoryStatus === "Low Stock") {
          params.inventory_status = "low_stock";
        } else if (inventoryStatus === "In Stock") {
          params.inventory_status = "in_stock";
        }
      }

      const inventoryPage = await yarnInventoryService.getYarnInventories(params);

      const transformedInventory = inventoryPage.results.map(transformInventoryItem);

      setInventory(transformedInventory);
      setTotalPages(inventoryPage.totalPages || 1);
      setTotalResults(inventoryPage.totalResults || 0);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setInventoryError(
        err instanceof Error ? err.message : "Failed to load inventory"
      );
    } finally {
      setInventoryLoading(false);
    }
  }, [currentPage, rowsPerPage, searchTerm, statusFilter, transformInventoryItem]);

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
        alertStatus: 'has_alert',
        limit: 200,
        skipRecalculation: true,
      });

      const requisitions = reqResponse.results;
      const alertSummary = reqResponse.alertSummary;

      const transformedAlerts: InventoryAlert[] = requisitions
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
      setGlobalSummaryLoading(false);
      globalSummaryFirstLoadRef.current = true;
      return;
    }
    fetchInventory(currentPage, rowsPerPage, searchTerm, statusFilter);
    fetchAlerts();
  }, [hasPermission, currentPage, rowsPerPage, fetchAlerts]);

  useEffect(() => {
    if (!hasPermission) {
      return;
    }
    if (globalSummaryDebounceRef.current) {
      clearTimeout(globalSummaryDebounceRef.current);
    }
    const delay = globalSummaryFirstLoadRef.current ? 0 : 400;
    globalSummaryFirstLoadRef.current = false;
    globalSummaryDebounceRef.current = setTimeout(() => {
      void fetchGlobalSummary();
    }, delay);
    return () => {
      if (globalSummaryDebounceRef.current) {
        clearTimeout(globalSummaryDebounceRef.current);
      }
    };
  }, [hasPermission, searchTerm, statusFilter, fetchGlobalSummary]);

  // Debounced search effect
  useEffect(() => {
    if (!hasPermission) return;
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchInventory(1, rowsPerPage, searchTerm, statusFilter);
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm, statusFilter, hasPermission, rowsPerPage, fetchInventory]);

  /**
   * Handles page change from pagination controls
   */
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  /**
   * Handles rows per page change
   */
  const handleRowsPerPageChange = useCallback((newLimit: number) => {
    setRowsPerPage(newLimit);
    setCurrentPage(1);
  }, []);

  /**
   * Handles search term change (debounced)
   */
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  /**
   * Handles status filter change
   */
  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  /**
   * Exports all inventory data to Excel
   */
  const handleExportExcel = useCallback(async () => {
    try {
      setExporting(true);

      // Fetch all inventory data
      const allInventory = await yarnInventoryService.getAllYarnInventories();

      // Transform to export format matching table columns
      const exportData = allInventory.map((item) => {
        const totalWeight =
          item.longTermStorage.totalWeight + item.shortTermStorage.totalWeight;
        const totalNetWeight =
          item.longTermStorage.netWeight + item.shortTermStorage.netWeight;
        const unallocatedWeight = item.unallocatedStorage?.totalWeight || 0;
        const blockedQty = item.blockedQty || 0;
        const availableQty = Math.max(0, totalNetWeight - blockedQty);

        let status = "In Stock";
        if (
          item.inventoryStatus === "low_stock" ||
          item.inventoryStatus === "soon_to_be_low"
        ) {
          status = "Low Stock";
        } else if (totalWeight === 0) {
          status = "Out of Stock";
        }

        return {
          "Yarn Name": item.yarnName,
          "LTS (kg)": item.longTermStorage.totalWeight,
          "STS (kg)": item.shortTermStorage.totalWeight,
          "Unallocated (kg)": unallocatedWeight,
          "Cones": item.shortTermStorage.numberOfCones,
          "Blocked Qty (kg)": blockedQty,
          "Available Qty (kg)": availableQty,
          "Status": status,
        };
      });

      // Generate CSV content
      if (exportData.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              // Escape commas and quotes in values
              if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(",")
        ),
      ];
      const csvContent = csvRows.join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `yarn-inventory-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting inventory:", err);
      alert("Failed to export inventory. Please try again.");
    } finally {
      setExporting(false);
    }
  }, []);

  // Track if alerts modal has been shown once (only auto-open on initial load)
  const alertsShownRef = useRef(false);

  useEffect(() => {
    if (alerts.length > 0 && !alertsLoading && !alertsShownRef.current) {
      alertsShownRef.current = true;
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
          <SummaryCards
            summary={summary}
            loading={globalSummaryLoading || alertsLoading}
          />
        </div>

        {inventoryError ? (
          <div className="border-t border-gray-100 p-[10px]">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <i className="ri-error-warning-line text-3xl text-red-400 mb-2"></i>
              <p className="text-[11px] text-gray-500 mb-2">{inventoryError}</p>
              <button
                type="button"
                onClick={() => fetchInventory(currentPage, rowsPerPage, searchTerm, statusFilter)}
                className="text-[10px] text-purple-600 font-bold hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <LiveInventoryTable
            inventory={inventory}
            loading={inventoryLoading}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalPages={totalPages}
            totalResults={totalResults}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onExportExcel={handleExportExcel}
            exporting={exporting}
          />
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
