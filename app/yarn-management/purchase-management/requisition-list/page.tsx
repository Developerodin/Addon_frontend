"use client";
import React, { useMemo, useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import { yarnInventoryService } from "@/app/yarn-management/dashboard/services/yarnInventoryService";

interface YarnInventory {
  id: string;
  yarnName: string;
  minimumQty: number;
  availableQty: number;
  blockedQty: number;
  lastUpdated: string;
}

const RequisitionListPage = () => {
  const { hasSubPermission } = useNavigation();

  const [yarns, setYarns] = useState<YarnInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "belowMin" | "overblocked">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof YarnInventory; direction: "asc" | "desc" } | null>(null);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const hasPermission = hasSubPermission("/yarn-management/purchase-management", "Requisition list");

  // Fetch requisitions from API
  useEffect(() => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    const fetchRequisitions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch requisitions for the last 90 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const requisitions = await yarnInventoryService.getYarnRequisitions({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          // Don't filter by poSent here - we'll filter in the UI
        });

        // Transform API response to UI format
        // Filter out requisitions where PO is already sent
        const transformedYarns: YarnInventory[] = requisitions
          .filter((req) => !req.poSent) // Only show pending requisitions
          .map((req) => ({
            id: req._id,
            yarnName: req.yarnName,
            minimumQty: req.minQty,
            availableQty: req.availableQty,
            blockedQty: req.blockedQty,
            lastUpdated: req.lastUpdated || req.created,
          }));

        setYarns(transformedYarns);
      } catch (err) {
        console.error('Error fetching requisitions:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load requisition data'
        );
        toast.error('Failed to load requisition data');
      } finally {
        setLoading(false);
      }
    };

    fetchRequisitions();
  }, [hasPermission]);

  const isBelowMinimum = (yarn: YarnInventory) => yarn.availableQty < yarn.minimumQty;
  const isOverblocked = (yarn: YarnInventory) => yarn.blockedQty > yarn.availableQty;

  const filteredYarns = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();

    return yarns.filter((yarn) => {
      const matchesSearch = yarn.yarnName.toLowerCase().includes(lowerSearch);
      const lastUpdatedDate = new Date(yarn.lastUpdated);
      const matchesFromDate = dateFilter.from ? lastUpdatedDate >= new Date(`${dateFilter.from}T00:00:00`) : true;
      const matchesToDate = dateFilter.to ? lastUpdatedDate <= new Date(`${dateFilter.to}T23:59:59.999`) : true;
      const matchesDateRange = matchesFromDate && matchesToDate;
      const belowMin = isBelowMinimum(yarn);
      const overBlocked = isOverblocked(yarn);
      const isAlert = belowMin || overBlocked;

      if (!isAlert) {
        return false;
      }

      if (statusFilter === "belowMin" && !belowMin) {
        return false;
      }

      if (statusFilter === "overblocked" && !overBlocked) {
        return false;
      }

      if (!matchesDateRange) {
        return false;
      }

      return matchesSearch;
    });
  }, [yarns, searchTerm, statusFilter, dateFilter]);

  const sortedYarns = useMemo(() => {
    if (!sortConfig) {
      return filteredYarns;
    }

    const sorted = [...filteredYarns].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === "asc" ? 1 : -1;
      const aValue = a[key];
      const bValue = b[key];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * multiplier;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * multiplier;
      }

      return 0;
    });

    return sorted;
  }, [filteredYarns, sortConfig]);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="py-12 text-center">
          <div className="mb-4 text-gray-400">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="mb-4 text-gray-500">You don't have permission to access this screen.</p>
          <Link href="/yarn-management/purchase-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-content">
        <div className="py-12 text-center">
          <div className="inline-block mb-4 animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading requisition data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="py-12 text-center">
          <div className="mb-4 text-red-400">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">Error Loading Data</h3>
          <p className="mb-4 text-gray-500">{error}</p>
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

  const buttonBaseClasses = "flex items-center gap-2 whitespace-nowrap !h-9 !px-3 text-xs font-semibold";

  const handleSort = (key: keyof YarnInventory) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        const nextDirection = prev.direction === "asc" ? "desc" : "asc";
        return { key, direction: nextDirection };
      }

      return { key, direction: "asc" };
    });
  };

  const SortIcon = ({ field }: { field: keyof YarnInventory }) => {
    if (sortConfig?.key !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400" />;
    }

    return sortConfig.direction === "asc" ? (
      <i className="ri-arrow-up-line text-primary" />
    ) : (
      <i className="ri-arrow-down-line text-primary" />
    );
  };

  const getStatusBadges = (yarn: YarnInventory) => {
    const badges: { label: string; className: string }[] = [];

    if (isBelowMinimum(yarn)) {
      badges.push({ label: "Below Minimum", className: "border border-red-200 bg-red-100 text-red-800" });
    }

    if (isOverblocked(yarn)) {
      badges.push({ label: "Overblocked", className: "border border-amber-200 bg-amber-100 text-amber-800" });
    }

    if (badges.length === 0) {
      badges.push({ label: "Healthy", className: "border border-emerald-200 bg-emerald-100 text-emerald-800" });
    }

    return badges;
  };

  const handleMarkPoSent = async (id: string) => {
    const yarn = yarns.find((item) => item.id === id);

    if (!yarn) return;

    const confirmed = window.confirm(
      `Are you sure you want to mark ${yarn.yarnName} as PO Sent? This will remove it from the list.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Update requisition status via API
      await yarnInventoryService.updateRequisitionStatus(id, {
        poSent: true,
      });

      // Remove from list (it will be filtered out since poSent is now true)
      setYarns((prev) => prev.filter((item) => item.id !== id));
      toast.success(`${yarn.yarnName} marked as PO sent and removed from the list.`);
    } catch (err) {
      console.error('Error updating requisition status:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to update requisition status'
      );
    }
  };

  const handleExport = () => {
    if (sortedYarns.length === 0) {
      toast.error("No data available to export.");
      return;
    }

    const headers = ["Yarn Name", "Minimum Qty", "Available Qty", "Blocked Qty", "Status"];
    const rows = sortedYarns.map((yarn) => {
      const badges = getStatusBadges(yarn).map((badge) => badge.label).join(" | ") || "Healthy";

      return [
        yarn.yarnName,
        yarn.minimumQty.toString(),
        yarn.availableQty.toString(),
        yarn.blockedQty.toString(),
        badges
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `critical-yarn-levels-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export started.");
  };

  return (
    <div className="main-content">
      <Seo title="Critical Yarn Levels" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex items-center justify-between">
              <div>
                <h1 className="box-title text-lg font-semibold">Critical Yarn Levels</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Monitor yarns that have fallen below their minimum levels or are overblocked in production.
                </p>
              </div>
              <div className="box-tools">
                <Link
                  href="/yarn-management/purchase-management"
                  className="ti-btn ti-btn-light !px-3 !py-1 text-sm"
                >
                  <i className="ri-arrow-left-line me-1"></i>
                  Back to Purchase Management
                </Link>
              </div>
            </div>
          </div> */}

          <div className="box mt-2">
            <div className="box-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="box-title text-base font-semibold">
                Tracked Yarns ({sortedYarns.length})
              </h3>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
                <input
                  type="text"
                  className="form-control md:h-10 md:w-56"
                  placeholder="Search by yarn name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                  <input
                    type="date"
                    className="form-control md:h-10 md:w-40"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter((prev) => ({ ...prev, from: e.target.value }))}
                    placeholder="From date"
                  />
                  <input
                    type="date"
                    className="form-control md:h-10 md:w-40"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="To date"
                  />
                  <button
                    type="button"
                  className={`ti-btn ti-btn-light ${buttonBaseClasses}`}
                    onClick={() => setDateFilter({ from: "", to: "" })}
                    disabled={!dateFilter.from && !dateFilter.to}
                  >
                    Clear dates
                  </button>
                </div>
                <select
                  className="form-select md:h-10 md:w-40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="all">All alerts</option>
                  <option value="belowMin">Below minimum</option>
                  <option value="overblocked">Overblocked</option>
                </select>
                <button className={`ti-btn ti-btn-primary ${buttonBaseClasses}`} onClick={handleExport}>
                  <i className="ri-download-line"></i>
                  Export
                </button>
              </div>
            </div>
            <div className="box-body">
              {sortedYarns.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-4 text-gray-400">
                    <i className="ri-check-double-line text-4xl"></i>
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">All yarns are healthy</h3>
                  <p className="mb-0 text-gray-500">
                    No yarn is currently below the minimum or overblocked threshold.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full border border-gray-300 bg-white text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-b border-gray-300 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("yarnName")}
                          >
                            <div className="flex items-center gap-2">
                              Yarn Name
                              <SortIcon field="yarnName" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-b border-gray-300 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("minimumQty")}
                          >
                            <div className="flex items-center gap-2">
                              Min Qty
                              <SortIcon field="minimumQty" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-b border-gray-300 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("availableQty")}
                          >
                            <div className="flex items-center gap-2">
                              Available Qty
                              <SortIcon field="availableQty" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-b border-gray-300 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("blockedQty")}
                          >
                            <div className="flex items-center gap-2">
                              Blocked Qty
                              <SortIcon field="blockedQty" />
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-b border-gray-300">
                            Alert Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-r border-b border-gray-300">
                            Last Updated
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-b border-gray-300">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {sortedYarns.map((yarn) => (
                          <tr key={yarn.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                              <span className="text-sm font-medium text-gray-900">{yarn.yarnName}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              {yarn.minimumQty.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              <span className="text-green-600 font-medium">{yarn.availableQty.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              <span className="text-orange-600 font-medium">{yarn.blockedQty.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadges(yarn).map((badge) => (
                                  <span
                                    key={badge.label}
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              {new Date(yarn.lastUpdated).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-b border-gray-300">
                              <button
                                type="button"
                                onClick={() => handleMarkPoSent(yarn.id)}
                                className={`ti-btn ti-btn-primary ti-btn-outline ${buttonBaseClasses}`}
                              >
                                <i className="ri-mail-send-line"></i>
                                Mark PO Sent
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionListPage;
