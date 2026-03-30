"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseClients,
  type WarehouseClient,
} from "@/shared/services/whmsWarehouseClientService";

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
  const { hasSubPermission } = useNavigation();
  const [rows, setRows] = useState<WarehouseClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hasPermission = hasSubPermission("/warehouse-management", "Clients");

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
    filterType,
    filterStatus,
    filterCity,
    filterState,
    hasPermission,
  ]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await whmsWarehouseClients.list({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm.trim() || undefined,
        type: filterType || undefined,
        status: filterStatus || undefined,
        city: filterCity.trim() || undefined,
        state: filterState.trim() || undefined,
        sortBy: "createdAt:desc",
      });
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this warehouse client?")) return;
    setIsDeleting(true);
    setDeleteId(id);
    try {
      await whmsWarehouseClients.delete(id);
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
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer min-w-[100px]"
                >
                  <option value="">All types</option>
                  <option value="Store">Store</option>
                  <option value="Trade">Trade</option>
                  <option value="Departmental">Departmental</option>
                  <option value="Ecom">Ecom</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
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
              <Link
                href="/warehouse-management/clients/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" /> Add client
              </Link>
            </div>
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
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Retailer
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Parent key
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Type
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    City
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    State
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Contact
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Mobile
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Status
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      {c.retailerName?.trim() || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {c.parentKeyCode?.trim() || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {c.type}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {c.city?.trim() || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {c.state?.trim() || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {c.contactPerson?.trim() || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {c.mobilePhone?.trim() || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                          c.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.status || "—"}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/warehouse-management/clients/view/${c.id}`}
                          className="w-7 h-7 flex items-center justify-center bg-sky-50 text-sky-500 border border-sky-100 rounded hover:bg-sky-100 transition-colors"
                          title="View"
                        >
                          <i className="ri-eye-line text-xs" />
                        </Link>
                        <Link
                          href={`/warehouse-management/clients/edit/${c.id}`}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                          title="Edit"
                        >
                          <i className="ri-pencil-line text-xs" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors"
                          title="Delete"
                          disabled={isDeleting && deleteId === c.id}
                        >
                          {isDeleting && deleteId === c.id ? (
                            <i className="ri-loader-4-line text-xs animate-spin" />
                          ) : (
                            <i className="ri-delete-bin-line text-xs" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
