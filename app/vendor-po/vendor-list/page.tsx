"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Vendor } from "./types";
import VendorViewDrawer from "./components/VendorViewDrawer";
import { toast } from "react-hot-toast";
import { listVendors, patchVendor } from "@/shared/services/vendorManagementService";
import { mapVendorDocToVendor } from "./vendorMappers";
import { CRM } from "./crmUiClasses";

const PAGE_SIZE = 10;

const VendorListPage = () => {
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

  return (
    <div className={CRM.mainContent}>
      <Seo title="Vendor Master" />

      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} aria-hidden />
          <h1 className={CRM.pageTitle}>Vendor Master</h1>
        </div>
        <Link href="/vendor-po/vendor-list/add" className={CRM.btnPrimary}>
          <i className="ri-add-line text-xs" />
          <span>Add Vendor</span>
        </Link>
      </div>

      <div className={CRM.card}>
        <div className={`${CRM.cardBody} space-y-4`}>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={showFilters ? CRM.btnFilterOn : CRM.btnFilterOff}
                onClick={() => setShowFilters(!showFilters)}
              >
                <i className="ri-filter-3-line text-xs" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="ml-0.5 rounded-full bg-white/20 px-1 text-[10px] font-bold">●</span>
                )}
              </button>
              {hasActiveFilters && (
                <button type="button" className={CRM.btnSecondary} onClick={clearFilters}>
                  <i className="ri-close-line text-xs" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="relative w-full sm:max-w-md min-w-0">
              <input
                type="text"
                className={CRM.inputSearch}
                placeholder="Search (name, code, GSTIN, address, notes)…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
            </div>
          </div>

          {showFilters && (
            <div className="rounded border border-gray-200 bg-gray-50/80 p-[10px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className={CRM.label}>Status</label>
                  <select
                    className={CRM.select}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter((e.target.value as "" | "active" | "inactive") || "");
                      setPage(1);
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className={CRM.label}>Vendor code (exact)</label>
                  <input
                    type="text"
                    className={CRM.input}
                    value={vendorCodeFilter}
                    onChange={(e) => {
                      setVendorCodeFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="VND001"
                  />
                </div>
                <div>
                  <label className={CRM.label}>City</label>
                  <input
                    type="text"
                    className={CRM.input}
                    value={cityFilter}
                    onChange={(e) => {
                      setCityFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Partial match"
                  />
                </div>
                <div>
                  <label className={CRM.label}>State</label>
                  <input
                    type="text"
                    className={CRM.input}
                    value={stateFilter}
                    onChange={(e) => {
                      setStateFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Partial match"
                  />
                </div>
              </div>
            </div>
          )}

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                  <th className={CRM.th}>Vendor Code</th>
                  <th className={CRM.th}>Vendor Name</th>
                  <th className={CRM.th}>Contact Person</th>
                  <th className={CRM.th}>Phone</th>
                  <th className={CRM.th}>City</th>
                  <th className={CRM.th}>Status</th>
                  <th className={CRM.thRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className={CRM.td}>
                      <div className={CRM.loadingWrap}>
                        <div className={CRM.spinner} />
                        <p className={CRM.loadingLabel}>Loading Data</p>
                      </div>
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={CRM.td}>
                      <div className={CRM.emptyWrap}>
                        <div className={CRM.emptyIconWrap}>
                          <i className={`ri-user-search-line ${CRM.emptyIcon}`} />
                        </div>
                        <h3 className={CRM.emptyTitle}>No vendors found</h3>
                        <p className={CRM.emptySub}>
                          {hasActiveFilters
                            ? "Try adjusting your filters or search terms"
                            : "Get started by adding your first vendor"}
                        </p>
                        {!hasActiveFilters && (
                          <Link href="/vendor-po/vendor-list/add" className={CRM.btnPrimary}>
                            <i className="ri-add-line text-xs" />
                            <span>Add First Vendor</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className={`${CRM.tbodyTr} group`}>
                      <td className={`${CRM.td} font-medium`}>{vendor.vendorCode}</td>
                      <td className={CRM.td}>{vendor.vendorName}</td>
                      <td className={`${CRM.td} ${CRM.tdMuted}`}>{vendor.contactPerson}</td>
                      <td className={`${CRM.td} ${CRM.tdMuted}`}>{vendor.phone}</td>
                      <td className={`${CRM.td} ${CRM.tdMuted}`}>{vendor.city || "—"}</td>
                      <td className={CRM.td}>
                        <span
                          className={
                            vendor.status === "active" ? CRM.badgeActive : CRM.badgeInactive
                          }
                        >
                          {vendor.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className={CRM.td}>
                        <div className={CRM.rowActions}>
                          <button
                            type="button"
                            className={CRM.iconView}
                            title="View"
                            onClick={() => handleView(vendor)}
                          >
                            <i className="ri-eye-line text-xs" />
                          </button>
                          <Link
                            href={`/vendor-po/vendor-list/edit/${vendor.id}`}
                            className={CRM.iconEdit}
                            title="Edit"
                          >
                            <i className="ri-edit-line text-xs" />
                          </Link>
                          <button
                            type="button"
                            className={
                              vendor.status === "active" ? CRM.iconToggleOff : CRM.iconToggleOn
                            }
                            title={vendor.status === "active" ? "Disable" : "Enable"}
                            onClick={() => handleDisableEnable(vendor)}
                          >
                            <i
                              className={`${vendor.status === "active" ? "ri-forbid-line" : "ri-check-line"} text-xs`}
                            />
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
            <div className={CRM.paginationBar}>
              <p className={CRM.paginationSummary}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalResults)} of{" "}
                {totalResults}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={CRM.pageNavBtn}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="text-[11px] font-bold text-gray-500">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className={CRM.pageNavBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <VendorViewDrawer
        vendor={selectedVendor}
        open={showViewModal && !!selectedVendor}
        onClose={closeViewModal}
        onEdit={handleEditFromViewModal}
      />
    </div>
  );
};

export default VendorListPage;
