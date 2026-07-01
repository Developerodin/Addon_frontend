"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseClients,
  type WarehouseClient,
  type WarehouseClientType,
} from "@/shared/services/whmsWarehouseClientService";
import WarehouseClientsTable from "./components/WarehouseClientsTable";
import WarehouseClientDetailDrawer from "./components/WarehouseClientDetailDrawer";
import {
  downloadWarehouseClientStoreTemplate,
  downloadWarehouseClientTradeTemplate,
  parseWarehouseClientStoreImportFile,
  parseWarehouseClientTradeImportFile,
} from "./components/warehouseClientBulkImport";
import { exportAllWarehouseClients } from "./components/warehouseClientExport";

const TYPE_TABS: { id: WarehouseClientType; label: string }[] = [
  { id: "Store", label: "Store" },
  { id: "Trade", label: "Trade" },
  { id: "Departmental", label: "Departmental" },
  { id: "Ecom", label: "Ecom" },
];

function getPagination(currentPage: number, totalPages: number) {
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 4) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 2);
      i <= Math.min(totalPages - 1, currentPage + 2);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 3) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

export default function WarehouseManagementClientsPage() {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [rows, setRows] = useState<WarehouseClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState<WarehouseClientType>("Store");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const storeBulkInputRef = useRef<HTMLInputElement>(null);
  const tradeBulkInputRef = useRef<HTMLInputElement>(null);

  const hasPermission = hasSubPermission("/warehouse-management", "Clients");

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v) setDetailClientId(v);
  }, []);

  const openClientDetail = useCallback(
    (id: string) => {
      setDetailClientId(id);
      router.replace(`/warehouse-management/clients?view=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router],
  );

  const closeClientDetail = useCallback(() => {
    setDetailClientId(null);
    router.replace("/warehouse-management/clients", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!hasPermission) return;
    const t = setTimeout(() => {
      void fetchClients();
    }, 400);
    return () => clearTimeout(t);
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    activeTypeTab,
    filterStatus,
    filterCity,
    filterState,
    hasPermission,
  ]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const common = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm.trim() || undefined,
        status: filterStatus || undefined,
        city: filterCity.trim() || undefined,
        state: filterState.trim() || undefined,
        sortBy: "createdAt:desc",
      };
      const res = await whmsWarehouseClients.listByType(activeTypeTab, common);
      setRows(res.results || []);
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults || 0);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load clients");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsBulkImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const { items, errors } = parseWarehouseClientStoreImportFile(buf);
      if (errors.length) {
        toast.error(errors.slice(0, 5).join(" · ") + (errors.length > 5 ? "…" : ""));
      }
      if (!items.length) {
        if (!errors.length) toast.error("No valid rows to import");
        return;
      }
      await whmsWarehouseClients.bulkImport({ items });
      toast.success(`Imported ${items.length} Store row(s)`);
      await fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleTradeBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsBulkImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const { items, errors } = parseWarehouseClientTradeImportFile(buf);
      if (errors.length) {
        toast.error(errors.slice(0, 5).join(" · ") + (errors.length > 5 ? "…" : ""));
      }
      if (!items.length) {
        if (!errors.length) toast.error("No valid rows to import");
        return;
      }
      await whmsWarehouseClients.bulkImport({ items });
      toast.success(`Imported ${items.length} row(s)`);
      await fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const count = await exportAllWarehouseClients(whmsWarehouseClients.listByType);
      toast.success(`Exported ${count} client(s) across all types`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this warehouse client?")) return;
    setIsDeleting(true);
    setDeleteId(id);
    try {
      await whmsWarehouseClients.delete(id);
      if (detailClientId === id) closeClientDetail();
      toast.success("Client deleted");
      await fetchClients();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 rounded p-6 text-center">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-4xl" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-2">Access Restricted</h3>
          <p className="text-[12px] text-gray-500 mb-4">
            You don&apos;t have permission to access Warehouse Clients.
          </p>
          <Link
            href="/warehouse-management"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
          >
            <i className="ri-arrow-left-line text-xs" /> Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Warehouse Clients" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Warehouse Clients</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-44 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              <div className="relative group">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer min-w-[100px]"
                >
                  <option value="">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              <input
                type="text"
                className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-28 placeholder:text-gray-400 font-medium"
                placeholder="City"
                value={filterCity}
                onChange={(e) => {
                  setFilterCity(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <input
                type="text"
                className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-28 placeholder:text-gray-400 font-medium"
                placeholder="State"
                value={filterState}
                onChange={(e) => {
                  setFilterState(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <div className="relative group">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={10}>Show 10</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              <input
                ref={storeBulkInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleStoreBulkFile}
              />
              <input
                ref={tradeBulkInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleTradeBulkFile}
              />
              <button
                type="button"
                disabled={isBulkImporting || isExporting}
                onClick={() => void handleExportAll()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50"
              >
                {isExporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-download-2-line text-xs" />
                )}
                Export all
              </button>
              <button
                type="button"
                disabled={isBulkImporting}
                onClick={() => downloadWarehouseClientStoreTemplate()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <i className="ri-file-excel-2-line text-xs" /> Store template
              </button>
              <button
                type="button"
                disabled={isBulkImporting}
                onClick={() => downloadWarehouseClientTradeTemplate()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <i className="ri-file-excel-2-line text-xs" /> Trade template
              </button>
              <button
                type="button"
                disabled={isBulkImporting}
                onClick={() => storeBulkInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors shadow-sm disabled:opacity-50"
              >
                {isBulkImporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-upload-2-line text-xs" />
                )}
                Import Store
              </button>
              <button
                type="button"
                disabled={isBulkImporting}
                onClick={() => tradeBulkInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors shadow-sm disabled:opacity-50"
              >
                {isBulkImporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-upload-2-line text-xs" />
                )}
                Import Trade / Dept / Ecom
              </button>
              <Link
                href="/warehouse-management/clients/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" /> Add client
              </Link>
            </div>
          </div>

          {/* Client type tabs (same pattern as knitting floor: border-b + purple active) */}
          <div className="flex flex-wrap border-b border-gray-300 mt-4 -mb-px">
            {TYPE_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTypeTab === id
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => {
                  setActiveTypeTab(id);
                  setCurrentPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-contacts-line text-xl text-gray-200" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <Link
                href="/warehouse-management/clients/add"
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" /> Add first client
              </Link>
            </div>
          ) : (
            <WarehouseClientsTable
              activeTypeTab={activeTypeTab}
              rows={rows}
              isDeleting={isDeleting}
              deleteId={deleteId}
              onDelete={handleDelete}
              onView={openClientDetail}
            />
          )}
        </div>

        {!isLoading && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing{" "}
              <span>
                {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalResults)}
              </span>{" "}
              of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(currentPage, totalPages).map((page, idx) =>
                  page === "..." ? (
                    <span key={`e-${idx}`} className="text-gray-300 text-[10px]">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(Number(page))}
                      className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${
                        currentPage === page
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <WarehouseClientDetailDrawer
        clientId={detailClientId}
        open={detailClientId !== null}
        onClose={closeClientDetail}
      />
    </div>
  );
}
