"use client";
import React, { useMemo, useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import { yarnInventoryService, requisitionMongoId } from "@/app/yarn-management/dashboard/services/yarnInventoryService";

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

        // Paginated API: unwrap `results` (and merge pages for the full 90-day window).
        const { results: requisitionRows } =
          await yarnInventoryService.getAllYarnRequisitions({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        const requisitions = Array.isArray(requisitionRows)
          ? requisitionRows
          : [];

        // Transform API response to UI format
        // Filter out requisitions where PO is already sent
        const transformedYarns: YarnInventory[] = requisitions
          .filter((req) => !req.poSent) // Only show pending requisitions
          .map((req) => ({
            id: requisitionMongoId(req) ?? "",
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
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-500 mb-4">You don't have permission to access this screen.</p>
            <Link href="/yarn-management/purchase-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
              <i className="ri-arrow-left-line"></i> Back to Purchase Management
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
            <h3 className="text-xs font-bold text-gray-400 mb-1">Error Loading Data</h3>
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
      `Mark ${yarn.yarnName} as PO sent and add it to the Draft PO queue? It will disappear from this list until you raise a yarn purchase order from Draft POs.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Update requisition: acknowledged off critical list + staged for drafting a PO
      await yarnInventoryService.updateRequisitionStatus(id, {
        poSent: true,
        draftForPo: true,
      });

      // Remove from list (it will be filtered out since poSent is now true)
      setYarns((prev) => prev.filter((item) => item.id !== id));
      toast.success(
        `${yarn.yarnName} added to Draft PO queue. Create a PO from Purchase Management → Draft POs.`
      );
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
      return <i className="ri-arrow-up-down-line text-gray-400 text-sm" />;
    }
    return sortConfig.direction === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-sm" />
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-sm" />
    );
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Critical Yarn Levels" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Requisition list</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {sortedYarns.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/yarn-management/purchase-management"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                <i className="ri-arrow-left-line"></i> Back
              </Link>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-download-line"></i> Export
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                placeholder="Search by yarn name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
            <input
              type="date"
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-36"
              value={dateFilter.from}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
            <input
              type="date"
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-36"
              value={dateFilter.to}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors disabled:opacity-50"
              onClick={() => setDateFilter({ from: "", to: "" })}
              disabled={!dateFilter.from && !dateFilter.to}
            >
              <i className="ri-close-line"></i> Clear dates
            </button>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-36"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All alerts</option>
              <option value="belowMin">Below minimum</option>
              <option value="overblocked">Overblocked</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {sortedYarns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-gray-400 mb-4">
                <i className="ri-check-double-line text-5xl"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">All yarns are healthy</h3>
              <p className="text-[11px] text-gray-500">No yarn is currently below the minimum or overblocked threshold.</p>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th
                    className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => handleSort("yarnName")}
                  >
                    <div className="flex items-center gap-1.5">
                      Yarn Name
                      <SortIcon field="yarnName" />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => handleSort("minimumQty")}
                  >
                    <div className="flex items-center gap-1.5">
                      Min Qty
                      <SortIcon field="minimumQty" />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => handleSort("availableQty")}
                  >
                    <div className="flex items-center gap-1.5">
                      Available Qty
                      <SortIcon field="availableQty" />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => handleSort("blockedQty")}
                  >
                    <div className="flex items-center gap-1.5">
                      Blocked Qty
                      <SortIcon field="blockedQty" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Alert Status
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Last Updated
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedYarns.map((yarn) => (
                  <tr key={yarn.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                      <span className="text-[12px] font-bold text-gray-900">{yarn.yarnName}</span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] text-gray-900 border border-gray-200">
                      {yarn.minimumQty.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                      <span className="text-green-600 font-semibold">{yarn.availableQty.toLocaleString()}</span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                      <span className="text-orange-600 font-semibold">{yarn.blockedQty.toLocaleString()}</span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="flex flex-wrap gap-1.5">
                        {getStatusBadges(yarn).map((badge) => (
                          <span
                            key={badge.label}
                            className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                      {new Date(yarn.lastUpdated).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleMarkPoSent(yarn.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors"
                      >
                        <i className="ri-mail-send-line text-sm"></i> Mark PO Sent
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequisitionListPage;
