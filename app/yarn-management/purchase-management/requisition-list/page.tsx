"use client";
import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import supplierService, { type Supplier } from "@/shared/services/supplierService";
import { PoDraftQueueDrawerTrigger } from "./components/PoDraftQueueDrawer";
import { RequisitionListPagination } from "./components/RequisitionListPagination";
import {
  CRITICAL_EXPORT_ROW_CAP,
  useCriticalRequisitionList,
  workflowStageLabel,
  type CriticalRow,
} from "./hooks/useCriticalRequisitionList";
import { vendorsForCriticalRow } from "./utils/vendorsForCriticalRow";

const RequisitionListPage = () => {
  const { hasSubPermission } = useNavigation();
  const hasPermission = hasSubPermission("/yarn-management/purchase-management", "Requisition list");

  const rq = useCriticalRequisitionList(hasPermission);

  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadSuppliers = async () => {
      if (!hasPermission) return;
      try {
        const res = await supplierService.getSuppliers({ limit: 250, page: 1 });
        if (cancelled) return;
        setSupplierOptions(res.results ?? []);
      } catch (error) {
        console.error("[RequisitionList] supplier load:", error);
        toast.error(
          error instanceof Error ? error.message : "Could not load suppliers for dropdowns"
        );
      }
    };
    void loadSuppliers();
    return () => {
      cancelled = true;
    };
  }, [hasPermission]);

  /**
   * Suppliers who list this requisition yarn in `yarnDetails` (plus legacy saved vendor if needed).
   */
  const vendorsForRow = useCallback(
    (row: CriticalRow) => vendorsForCriticalRow(row, supplierOptions),
    [supplierOptions]
  );

  const isBelowMinimum = (yarn: CriticalRow) => yarn.availableQty < yarn.minimumQty;
  const isOverblocked = (yarn: CriticalRow) => yarn.blockedQty > yarn.availableQty;

  const getStatusBadges = (yarn: CriticalRow) => {
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

  const handleExport = async () => {
    try {
      const merged = await rq.exportMatchingCsv();
      if (merged.length === 0) {
        toast.error("No data available to export.");
        return;
      }
      if (merged.length >= CRITICAL_EXPORT_ROW_CAP) {
        toast(`Export capped at ${CRITICAL_EXPORT_ROW_CAP} rows. Narrow filters for the rest.`, {
          icon: "⚠️",
        });
      }

      const headers = [
        "Yarn Name",
        "Minimum Qty",
        "Available net qty",
        "Blocked Qty",
        "Alert inventory",
        "Procurement workflow",
        "Vendor snapshot",
      ];
      const rows = merged.map((yarn) => {
        const badges =
          getStatusBadges(yarn).map((badge) => badge.label).join(" | ") || "Healthy";
        return [
          yarn.yarnName,
          yarn.minimumQty.toString(),
          yarn.availableQty.toString(),
          yarn.blockedQty.toString(),
          badges,
          workflowStageLabel(yarn.workflowStage),
          yarn.preferredSupplierDisplayName || "",
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
    } catch (err) {
      console.error("Export critical list:", err);
      toast.error(err instanceof Error ? err.message : "Export failed.");
    }
  };

  const onSendToDraft = (yarn: CriticalRow) => {
    if (!yarn.preferredSupplierId) {
      toast.error("Select a vendor before sending to draft PO.");
      return;
    }

    const confirmed = window.confirm(
      `Create or merge ${yarn.yarnName} into the draft PO for this vendor (one draft per supplier until submitted)?`
    );
    if (!confirmed) return;
    void rq.handleMarkPoSent(yarn.id, yarn.yarnName);
  };

  const workflowTone = (workflow: CriticalRow["workflowStage"]) => {
    switch (workflow) {
      case "in_requisition":
        return "border border-slate-200 bg-slate-50 text-slate-800";
      case "sent_to_draft":
        return "border border-amber-200 bg-amber-50 text-amber-950";
      case "order_placed":
        return "border border-emerald-200 bg-emerald-50 text-emerald-900";
      case "dismissed":
      default:
        return "border border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const SortIcon = ({ field }: { field: keyof CriticalRow }) => {
    if (rq.sortConfig?.key !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400 text-sm" />;
    }
    return rq.sortConfig.direction === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-sm" />
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-sm" />
    );
  };

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

  const showFullLoader = rq.loading && rq.rows.length === 0 && !rq.error;

  if (showFullLoader) {
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

  if (rq.error && rq.rows.length === 0) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-red-400 mb-4">
              <i className="ri-error-warning-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Error Loading Data</h3>
            <p className="text-[11px] text-gray-500 mb-4">{rq.error}</p>
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
      <Seo title="Critical Yarn Levels" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Requisition list</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {rq.totalResults}
              </span>
              <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                (live totals use cached requisition fields — fast load)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/yarn-management/purchase-management"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                <i className="ri-arrow-left-line"></i> Back
              </Link>
              <PoDraftQueueDrawerTrigger />
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={rq.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
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
                value={rq.searchTerm}
                onChange={(e) => rq.setSearchTerm(e.target.value)}
                aria-label="Search yarn name"
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
            <input
              type="date"
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-36"
              value={rq.dateFilter.from}
              onChange={(e) => rq.setDateFilter((prev) => ({ ...prev, from: e.target.value }))}
              aria-label="Last updated from"
            />
            <input
              type="date"
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-36"
              value={rq.dateFilter.to}
              onChange={(e) => rq.setDateFilter((prev) => ({ ...prev, to: e.target.value }))}
              aria-label="Last updated to"
            />
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors disabled:opacity-50"
              onClick={() => rq.setDateFilter({ from: "", to: "" })}
              disabled={!rq.dateFilter.from && !rq.dateFilter.to}
            >
              <i className="ri-close-line"></i> Clear dates
            </button>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-36"
              value={rq.statusFilter}
              onChange={(e) => rq.setStatusFilter(e.target.value as typeof rq.statusFilter)}
              aria-label="Alert type filter"
            >
              <option value="all">All alerts</option>
              <option value="belowMin">Below minimum</option>
              <option value="overblocked">Overblocked</option>
            </select>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 min-w-[148px]"
              value={rq.workflowFilter}
              onChange={(e) =>
                rq.setWorkflowFilter(e.target.value as typeof rq.workflowFilter)
              }
              aria-label="Workflow status filter"
            >
              <option value="all">All statuses</option>
              <option value="in_requisition">In requisition</option>
              <option value="sent_to_draft">Sent to draft</option>
            </select>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 max-w-[200px]"
              value={rq.vendorSupplierIdFilter}
              onChange={(e) => rq.setVendorSupplierIdFilter(e.target.value)}
              aria-label="Filter rows by staged vendor ID"
              title="Filter by vendor explicitly chosen on rows"
            >
              <option value="">All staged vendors</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brandName || s.id}
                </option>
              ))}
            </select>
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-44 min-w-[120px] placeholder:text-gray-400 font-medium"
                placeholder="Vendor name contains…"
                value={rq.vendorNameQuery}
                onChange={(e) => rq.setVendorNameQuery(e.target.value)}
                aria-label="Filter staged vendor snapshot by substring"
              />
              <i className="ri-user-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto min-h-[300px]">
          {rq.loading ? (
            <div className="absolute inset-0 z-[1] bg-white/60 flex items-center justify-center pointer-events-none">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-70" aria-hidden />
            </div>
          ) : null}
          {rq.totalResults === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-[10px]">
              <div className="text-gray-400 mb-4">
                <i className="ri-check-double-line text-5xl"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">All yarns are healthy</h3>
              <p className="text-[11px] text-gray-500">
                No matching critical requisitions in this date window or filters.
              </p>
            </div>
          ) : (
            <table
              className="w-full border-collapse border border-gray-200"
              aria-busy={rq.loading}
              aria-label="Critical yarn requisitions"
            >
              <thead>
                <tr className="bg-gray-50/30">
                  <th
                    className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => rq.handleSort("yarnName")}
                  >
                    <div className="flex items-center gap-1.5">
                      Yarn Name
                      <SortIcon field="yarnName" />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => rq.handleSort("minimumQty")}
                  >
                    <div className="flex items-center gap-1.5">
                      Min Qty
                      <SortIcon field="minimumQty" />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => rq.handleSort("availableQty")}
                  >
                    <div className="flex items-center gap-1.5">
                      Available net qty
                      <SortIcon field="availableQty" />
                    </div>
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => rq.handleSort("blockedQty")}
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
                    Status
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Vendor
                  </th>
                  <th
                    className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                    onClick={() => rq.handleSort("lastUpdated")}
                  >
                    <div className="flex items-center gap-1.5">
                      Last Updated
                      <SortIcon field="lastUpdated" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rq.rows.map((yarn) => (
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
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded capitalize ${workflowTone(
                          yarn.workflowStage
                        )}`}
                      >
                        {workflowStageLabel(yarn.workflowStage)}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200 min-w-[170px]">
                      <select
                        className="w-full bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1 focus:ring-0 focus:border-purple-300 disabled:bg-gray-100"
                        value={yarn.preferredSupplierId ?? ""}
                        disabled={yarn.workflowStage !== "in_requisition" || rq.loading}
                        onChange={(e) =>
                          void rq.updateRowVendor(yarn.id, e.target.value)
                        }
                        aria-label={`Preferred vendor for ${yarn.yarnName}`}
                      >
                        <option value="">Select vendor…</option>
                        {vendorsForRow(yarn).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.brandName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                      {new Date(yarn.lastUpdated).toLocaleString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="inline-flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => onSendToDraft(yarn)}
                          disabled={
                            rq.loading ||
                            !rq.canStageRow(yarn) ||
                            !yarn.preferredSupplierId
                          }
                          title={
                            !yarn.preferredSupplierId
                              ? "Select a vendor for this row before sending to draft PO."
                              : undefined
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors disabled:opacity-50"
                          aria-label={`Send ${yarn.yarnName} to PO draft`}
                        >
                          <i className="ri-draft-line text-sm" aria-hidden />
                          Send to draft PO
                        </button>
                        {rq.canDismissRow(yarn) ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(`Dismiss requirement for "${yarn.yarnName}"?`)
                              ) {
                                void rq.dismissRow(yarn.id, yarn.yarnName);
                              }
                            }}
                            disabled={rq.loading}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-700 text-[11px] font-bold rounded hover:bg-red-50 disabled:opacity-50"
                            aria-label={`Dismiss ${yarn.yarnName}`}
                          >
                            <i className="ri-delete-bin-line text-sm" aria-hidden />
                            Dismiss
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rq.totalResults > 0 ? (
          <RequisitionListPagination
            page={rq.page}
            totalPages={rq.totalPages}
            totalResults={rq.totalResults}
            limit={rq.limit}
            onPageChange={rq.setPage}
            onLimitChange={(n) => rq.setLimit(n)}
            disabled={rq.loading}
          />
        ) : null}
      </div>
    </div>
  );
};

export default RequisitionListPage;
