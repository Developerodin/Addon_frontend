"use client";
import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import supplierService, { type Supplier } from "@/shared/services/supplierService";
import { PoDraftQueueDrawerTrigger } from "./components/PoDraftQueueDrawer";
import { RequisitionListPagination } from "./components/RequisitionListPagination";
import { RequisitionListTable } from "./components/RequisitionListTable";
import {
  CRITICAL_EXPORT_ROW_CAP,
  useCriticalRequisitionList,
  type CriticalRow,
} from "./hooks/useCriticalRequisitionList";
import { downloadRequisitionListExcel } from "./utils/requisitionListExcelExport";

const RequisitionListPage = () => {
  const { hasSubPermission } = useNavigation();
  const hasPermission = hasSubPermission("/yarn-management/purchase-management", "Requisition list");

  const rq = useCriticalRequisitionList(hasPermission);

  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [exporting, setExporting] = useState(false);

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
   * Fetches filter-matching rows and downloads an Excel workbook.
   */
  const handleExportExcel = async () => {
    setExporting(true);
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
      downloadRequisitionListExcel(merged);
      toast.success("Excel download started.");
    } catch (err) {
      console.error("Export critical list:", err);
      toast.error(err instanceof Error ? err.message : "Excel export failed.");
    } finally {
      setExporting(false);
    }
  };

  const onSendToDraft = useCallback(
    (yarn: CriticalRow) => {
      if (!yarn.preferredSupplierId) {
        toast.error("Select a vendor before sending to draft PO.");
        return;
      }

      const confirmed = window.confirm(
        `Create or merge ${yarn.yarnName} into the draft PO for this vendor (one draft per supplier until submitted)?`
      );
      if (!confirmed) return;
      void rq.handleMarkPoSent(yarn.id, yarn.yarnName);
    },
    [rq]
  );

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
                Snapshot columns = stored values; live columns = current inventory
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
                onClick={() => void handleExportExcel()}
                disabled={rq.loading || exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                aria-label="Download requisition list as Excel"
              >
                <i className="ri-file-excel-2-line" aria-hidden />
                {exporting ? "Preparing…" : "Download Excel"}
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
            <RequisitionListTable
              rows={rq.rows}
              loading={rq.loading}
              supplierOptions={supplierOptions}
              sortConfig={rq.sortConfig}
              onSort={rq.handleSort}
              onSendToDraft={onSendToDraft}
              onDismiss={rq.dismissRow}
              onVendorChange={rq.updateRowVendor}
              canStageRow={rq.canStageRow}
              canDismissRow={rq.canDismissRow}
            />
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
