"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { YarnInventory } from "../types";
import {
  yarnInventoryService,
  inventoryYarnId,
  YarnInventoryResponse,
} from "../services/yarnInventoryService";
import PaginationControls from "../components/PaginationControls";

type SortField = keyof YarnInventory;
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

const FullInventoryPage = () => {
  const { hasSubPermission } = useNavigation();
  const [inventory, setInventory] = useState<YarnInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("yarnName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  /**
   * Transform API inventory items into the UI shape.
   */
  const transformResults = useCallback(
    (results: YarnInventoryResponse[]): YarnInventory[] =>
      results.map((item) => {
        const totalWeight =
          item.longTermStorage.totalWeight + item.shortTermStorage.totalWeight;
        const totalNetWeight =
          item.longTermStorage.netWeight + item.shortTermStorage.netWeight;
        const blockedQty = item.overbooked ? totalNetWeight : 0;
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
      }),
    []
  );

  /**
   * Fetch a single page of inventory from the server.
   */
  const fetchPage = useCallback(
    async (page: number, limit: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await yarnInventoryService.getYarnInventories({
          page,
          limit,
        });

        setInventory(transformResults(response.results));
        setTotalResults(response.totalResults);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page);
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load inventory data"
        );
      } finally {
        setLoading(false);
      }
    },
    [transformResults]
  );

  useEffect(() => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    fetchPage(currentPage, pageSize);
  }, [hasPermission, currentPage, pageSize, fetchPage]);

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

    return [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      return sortDirection === "asc"
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
    });
  }, [inventory, searchTerm, sortField, sortDirection, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <i className="ri-arrow-up-down-line text-gray-400" />;
    return sortDirection === "asc"
      ? <i className="ri-arrow-up-line text-primary" />
      : <i className="ri-arrow-down-line text-primary" />;
  };

  const handleDownloadReport = () => {
    const headers = ["Yarn Name", "Weight (kg)", "Cones (Short-term)", "Blocked Qty (kg)", "Available Qty (kg)", "Status"];
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
    const csvContent = "\uFEFF" + [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `yarn-inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-green-100 text-green-800";
      case "Low Stock": return "bg-yellow-100 text-yellow-800";
      case "Out of Stock": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4"><i className="ri-lock-line text-6xl"></i></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don&apos;t have permission to access Yarn Management Full Inventory.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  if (error && inventory.length === 0) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4"><i className="ri-error-warning-line text-6xl"></i></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Inventory</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={() => fetchPage(1, pageSize)} className="ti-btn ti-btn-primary">
            <i className="ri-refresh-line me-2"></i>Retry
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
          <h1 className="text-2xl font-semibold text-gray-900">Full Yarn Inventory</h1>
          <p className="text-gray-600 mt-1">Detailed overview of all yarn inventory records with live filtering.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">Total Items: {totalResults}</div>
          <button type="button" onClick={handleDownloadReport} disabled={filteredAndSorted.length === 0} className="ti-btn ti-btn-outline flex items-center gap-2">
            <i className="ri-download-2-line"></i>Download Report
          </button>
          <Link href="/yarn-management/dashboard" className="ti-btn ti-btn-outline">
            <i className="ri-arrow-left-line me-2"></i>Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-2">
          <h3 className="box-title">Inventory Items ({totalResults})</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-xs text-gray-500 font-medium">Rows per page:</label>
            <select
              id="page-size"
              className="form-select !py-1 !px-2 !text-xs !w-auto !min-w-0"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label" htmlFor="inv-search">Search</label>
              <div className="relative">
                <input id="inv-search" type="text" className="form-control ps-10" placeholder="Search by yarn name, supplier, lot..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="inv-status">Status Filter</label>
              <select id="inv-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
              <p className="text-sm text-gray-500">Loading page {currentPage}...</p>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300" onClick={() => handleSort("yarnName")}>
                      <div className="flex items-center gap-2">Yarn Name <SortIcon field="yarnName" /></div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300" onClick={() => handleSort("weight")}>
                      <div className="flex items-center gap-2">Weight (kg) <SortIcon field="weight" /></div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">Cones (Short-term)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300" onClick={() => handleSort("blockedQty")}>
                      <div className="flex items-center gap-2">Blocked Qty (kg) <SortIcon field="blockedQty" /></div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300" onClick={() => handleSort("availableQty")}>
                      <div className="flex items-center gap-2">Available Qty (kg) <SortIcon field="availableQty" /></div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredAndSorted.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                        <div className="text-sm font-medium text-gray-900">{item.yarnName}</div>
                        {item.lotNo && <div className="text-xs text-gray-500">Lot: {item.lotNo}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">{item.weight.toLocaleString()} kg</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">{item.conesShortTerm}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        <span className="text-orange-600 font-medium">{item.blockedQty.toLocaleString()} kg</span>
                        {item.blockedQty > item.weight && <span className="ml-2 text-xs text-red-600 font-semibold">(Overblocked)</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        <span className="text-green-600 font-medium">{item.availableQty.toLocaleString()} kg</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="box-footer flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-3">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            pageSize={pageSize}
            loading={loading}
            onPageChange={handlePageChange}
          />
          <Link href="/yarn-management/dashboard" className="ti-btn ti-btn-primary ti-btn-outline">
            <i className="ri-dashboard-line me-2"></i>Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FullInventoryPage;
