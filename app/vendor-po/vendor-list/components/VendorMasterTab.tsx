"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Vendor } from "../types";
import VendorViewDrawer from "./VendorViewDrawer";
import VendorMasterToolbar from "./VendorMasterToolbar";
import { toast } from "react-hot-toast";
import { bulkImportVendors, deleteVendor, listVendors, patchVendor } from "@/shared/services/vendorManagementService";
import { mapVendorDocToVendor } from "../vendorMappers";
import { parseVendorBulkExcelToBody } from "../vendorBulkImportExcel";

const PAGE_SIZE = 10;

/**
 * Vendor Master list (search, filters, CRUD).
 */
const VendorMasterTab = () => {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [vendorCodeFilter, setVendorCodeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listVendors({
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt:desc",
        search: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
        city: cityFilter.trim() || undefined,
        state: stateFilter.trim() || undefined,
        vendorCode: vendorCodeFilter.trim() || undefined,
      });
      setVendors(res.results.map(mapVendorDocToVendor));
      setTotalPages(Math.max(1, res.totalPages));
      setTotalResults(res.totalResults);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load vendors";
      toast.error(msg);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, cityFilter, stateFilter, vendorCodeFilter]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "" ||
    cityFilter !== "" ||
    stateFilter !== "" ||
    vendorCodeFilter !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setCityFilter("");
    setStateFilter("");
    setVendorCodeFilter("");
    setPage(1);
  };

  /**
   * Apply a filter change and reset to page 1.
   * @param fn State updater to run before resetting page.
   */
  const bumpPageReset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const handleView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedVendor(null);
  };

  const handleEditFromViewModal = (vendor: Vendor) => {
    setShowViewModal(false);
    setSelectedVendor(null);
    router.push(`/vendor-po/vendor-list/edit/${vendor.id}`);
  };

  const handleBulkImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBulkImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const body = parseVendorBulkExcelToBody(buf);
      await bulkImportVendors(body);
      toast.success("Vendors imported successfully.");
      await loadVendors();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBulkImporting(false);
    }
  };

  const handleDisableEnable = async (vendor: Vendor) => {
    const newStatus = vendor.status === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "Disable" : "Enable";
    const confirmed = window.confirm(
      `Are you sure you want to ${action.toLowerCase()} "${vendor.vendorName}"?`
    );
    if (!confirmed) return;
    try {
      await patchVendor(vendor.id, {
        header: { status: newStatus },
      });
      toast.success(`Vendor ${newStatus === "inactive" ? "disabled" : "enabled"} successfully`);
      await loadVendors();
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${vendor.vendorName}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteVendor(vendor.id);
      toast.success("Vendor deleted successfully");
      if (selectedVendor?.id === vendor.id) {
        closeViewModal();
      }
      if (vendors.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await loadVendors();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <>
      <VendorMasterToolbar
        totalResults={totalResults}
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        vendorCodeFilter={vendorCodeFilter}
        cityFilter={cityFilter}
        stateFilter={stateFilter}
        bulkImporting={bulkImporting}
        bulkFileRef={bulkFileRef}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
        onSearchChange={(value) => bumpPageReset(() => setSearchQuery(value))}
        onStatusChange={(value) => bumpPageReset(() => setStatusFilter(value))}
        onVendorCodeChange={(value) => bumpPageReset(() => setVendorCodeFilter(value))}
        onCityChange={(value) => bumpPageReset(() => setCityFilter(value))}
        onStateChange={(value) => bumpPageReset(() => setStateFilter(value))}
        onBulkFileChange={handleBulkImportFile}
      />

      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Vendor Code
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Vendor Name
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Contact Person
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Phone
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                City
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
            {loading ? (
              <tr>
                <td colSpan={7} className="px-1.5 py-10 border border-gray-200">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
                    <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                      Loading Data
                    </p>
                  </div>
                </td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-1.5 py-10 border border-gray-200">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <i className="ri-user-search-line text-xl text-gray-300" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 mb-1">NO VENDORS FOUND</h3>
                    <p className="text-[11px] text-gray-500 mb-3">
                      {hasActiveFilters
                        ? "Try adjusting your filters or search terms"
                        : "Get started by adding your first vendor"}
                    </p>
                    {!hasActiveFilters && (
                      <Link
                        href="/vendor-po/vendor-list/add"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                      >
                        <i className="ri-add-line text-xs" />
                        Add First Vendor
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                    {vendor.vendorCode}
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-700 border border-gray-200">
                    {vendor.vendorName}
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-500 border border-gray-200">
                    {vendor.contactPerson}
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-500 border border-gray-200">
                    {vendor.phone}
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-500 border border-gray-200">
                    {vendor.city || "—"}
                  </td>
                  <td className="px-1.5 py-2.5 text-left border border-gray-200">
                    <span
                      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                        vendor.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {vendor.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                        title="View"
                        aria-label={`View ${vendor.vendorName}`}
                        onClick={() => handleView(vendor)}
                      >
                        <i className="ri-eye-line text-xs" />
                      </button>
                      <Link
                        href={`/vendor-po/vendor-list/edit/${vendor.id}`}
                        className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                        title="Edit"
                        aria-label={`Edit ${vendor.vendorName}`}
                      >
                        <i className="ri-edit-line text-xs" />
                      </Link>
                      <button
                        type="button"
                        className={`w-7 h-7 flex items-center justify-center border rounded transition-colors ${
                          vendor.status === "active"
                            ? "bg-red-50 text-red-400 border-red-100 hover:bg-red-100"
                            : "bg-green-50 text-green-500 border-green-100 hover:bg-green-100"
                        }`}
                        title={vendor.status === "active" ? "Disable" : "Enable"}
                        aria-label={`${vendor.status === "active" ? "Disable" : "Enable"} ${vendor.vendorName}`}
                        onClick={() => handleDisableEnable(vendor)}
                      >
                        <i
                          className={`${vendor.status === "active" ? "ri-forbid-line" : "ri-check-line"} text-xs`}
                        />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors"
                        title="Delete"
                        aria-label={`Delete ${vendor.vendorName}`}
                        onClick={() => handleDelete(vendor)}
                      >
                        <i className="ri-delete-bin-line text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalResults > 0 && (
        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalResults)} of{" "}
            {totalResults} entries
          </p>
          <div className="flex items-center">
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-[11px] font-bold text-gray-500 px-2">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <VendorViewDrawer
        vendor={selectedVendor}
        open={showViewModal && !!selectedVendor}
        onClose={closeViewModal}
        onEdit={handleEditFromViewModal}
      />
    </>
  );
};

export default VendorMasterTab;
