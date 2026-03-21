"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { YarnInventory } from "../types";
import {
  yarnInventoryService,
  requisitionYarnId,
} from "../services/yarnInventoryService";

type SortField = keyof YarnInventory;
type SortDirection = "asc" | "desc";

const FullInventoryPage = () => {
  const { hasSubPermission } = useNavigation();
  const [inventory, setInventory] = useState<YarnInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("yarnName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  useEffect(() => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);

        const inventoryResults =
          await yarnInventoryService.getAllYarnInventories();

        // Fetch requisitions to get blocked quantities
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const requisitions = await yarnInventoryService.getYarnRequisitions({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        // Transform API response to UI format
        const transformedInventory: YarnInventory[] =
          inventoryResults.map((item) => {
            const totalWeight =
              item.longTermStorage.totalWeight +
              item.shortTermStorage.totalWeight;
            const totalNetWeight =
              item.longTermStorage.netWeight +
              item.shortTermStorage.netWeight;

            // Find blocked quantity from requisitions
            const relatedRequisitions = requisitions.filter(
              (req) => requisitionYarnId(req) === item.yarnId
            );
            const blockedQty = relatedRequisitions.reduce(
              (sum, req) => sum + req.blockedQty,
              0
            );
            const availableQty = Math.max(0, totalNetWeight - blockedQty);

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

        setInventory(transformedInventory);
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load inventory data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [hasPermission]);

  const filteredAndSorted = useMemo(() => {
    const filtered = inventory.filter((item) => {
      const matchesSearch =
        item.yarnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lotNo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      }

      return aValue < bValue ? 1 : -1;
    });

    return sorted;
  }, [inventory, searchTerm, sortField, sortDirection, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400" />;
    }

    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary" />
    ) : (
      <i className="ri-arrow-down-line text-primary" />
    );
  };

  const handleDownloadReport = () => {
    const headers = [
      "Yarn Name",
      "Weight (kg)",
      "Cones (Short-term)",
      "Blocked Qty (kg)",
      "Available Qty (kg)",
      "Status",
    ];
    const rows = filteredAndSorted.map((item) => [
      item.yarnName,
      item.weight.toLocaleString(),
      String(item.conesShortTerm ?? ""),
      item.blockedQty.toLocaleString(),
      item.availableQty.toLocaleString(),
      item.status,
    ]);
    const escapeCsv = (val: string) =>
      /[,"\n\r]/.test(val) ? `"${String(val).replace(/"/g, '""')}"` : val;
    const csvRows = [headers, ...rows].map((row) =>
      row.map(escapeCsv).join(",")
    );
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `yarn-inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
            You don't have permission to access Yarn Management Full Inventory.
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
          <p className="text-gray-600">Loading inventory data...</p>
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
            Error Loading Inventory
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
      <Seo title="Full Yarn Inventory" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Full Yarn Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            Detailed overview of all yarn inventory records with live filtering.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            Total Items: {inventory.length}
          </div>
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={filteredAndSorted.length === 0}
            className="ti-btn ti-btn-outline flex items-center gap-2"
          >
            <i className="ri-download-2-line"></i>
            Download Report
          </button>
          <Link
            href="/yarn-management/dashboard"
            className="ti-btn ti-btn-outline"
          >
            <i className="ri-arrow-left-line me-2"></i>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title">
            Inventory Items ({filteredAndSorted.length})
          </h3>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Search</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-control ps-10"
                  placeholder="Search by yarn name, supplier, lot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="form-label">Status Filter</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("yarnName")}
                    >
                      <div className="flex items-center gap-2">
                        Yarn Name
                        <SortIcon field="yarnName" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("weight")}
                    >
                      <div className="flex items-center gap-2">
                        Weight (kg)
                        <SortIcon field="weight" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                      Cones (Short-term)
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("blockedQty")}
                    >
                      <div className="flex items-center gap-2">
                        Blocked Qty (kg)
                        <SortIcon field="blockedQty" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("availableQty")}
                    >
                      <div className="flex items-center gap-2">
                        Available Qty (kg)
                        <SortIcon field="availableQty" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredAndSorted.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                        <div className="text-sm font-medium text-gray-900">
                          {item.yarnName}
                        </div>
                        {item.lotNo && (
                          <div className="text-xs text-gray-500">
                            Lot: {item.lotNo}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        {item.weight.toLocaleString()} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        {item.conesShortTerm}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        <span className="text-orange-600 font-medium">
                          {item.blockedQty.toLocaleString()} kg
                        </span>
                        {item.blockedQty > item.weight && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">
                            (Overblocked)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        <span className="text-green-600 font-medium">
                          {item.availableQty.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="box-footer flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSorted.length} of {inventory.length} items
          </div>
          <Link
            href="/yarn-management/dashboard"
            className="ti-btn ti-btn-primary ti-btn-outline"
          >
            <i className="ri-dashboard-line me-2"></i>
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FullInventoryPage;


