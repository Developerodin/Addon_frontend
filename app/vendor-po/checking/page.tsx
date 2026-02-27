"use client";
import React, { useState, useMemo, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import HelpIcon from "@/shared/components/HelpIcon";
import { CheckingQueueEntry } from "./types";
import { getCheckingQueue } from "./data";

const getDefaultStartDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
};
const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "Urgent":
      return "bg-red-100 text-red-800";
    case "High":
      return "bg-orange-100 text-orange-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Completed: "bg-green-100 text-green-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

/** 4A) Checking Queue — UI matches Checking Floor Supervisor Dashboard */
const CheckingPage = () => {
  const router = useRouter();
  const [entries, setEntries] = useState<CheckingQueueEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "Pending" | "Completed">("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CheckingQueueEntry | null>(null);

  const loadQueue = () => setEntries(getCheckingQueue());

  const handleViewEntry = (entry: CheckingQueueEntry) => {
    setSelectedEntry(entry);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEntry(null);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    const onFocus = () => setEntries(getCheckingQueue());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.poNo.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q) ||
        e.receiveId.toLowerCase().includes(q) ||
        e.articles.some(
          (a) =>
            a.articleName.toLowerCase().includes(q) || a.articleCode.toLowerCase().includes(q)
        );
      const matchesStatus = !statusFilter || e.status === statusFilter;
      const matchesPriority = !priorityFilter || e.priority === priorityFilter;
      const matchesVendor = !vendorFilter || e.vendorName === vendorFilter;
      const receiveDate = new Date(e.receiveDate).getTime();
      const matchesDate =
        (!startDate || receiveDate >= new Date(startDate).setHours(0, 0, 0, 0)) &&
        (!endDate || receiveDate <= new Date(endDate).setHours(23, 59, 59, 999));
      return matchesSearch && matchesStatus && matchesPriority && matchesVendor && matchesDate;
    });
  }, [entries, searchQuery, statusFilter, priorityFilter, vendorFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const selectAll = paginatedEntries.length > 0 && paginatedEntries.every((e) => selectedIds.has(e.id));

  const uniqueVendors = useMemo(() => {
    const set = new Set(entries.map((e) => e.vendorName));
    return Array.from(set).sort();
  }, [entries]);

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "" ||
    priorityFilter !== "" ||
    vendorFilter !== "" ||
    startDate !== getDefaultStartDate() ||
    endDate !== getDefaultEndDate();

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setPriorityFilter("");
    setVendorFilter("");
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleItemsPerPageChange = (n: number) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedEntries.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedEntries.forEach((e) => next.add(e.id));
        return next;
      });
    }
  };

  const handleRowSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="main-content">
      <Seo title="Checking" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header — same as Checking Floor Supervisor Dashboard */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Checking</h1>
                <HelpIcon
                  title="Checking"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Checking dashboard where you can view and update vendor PO receipts that are in the Checking queue. QC classification and GRN are done here.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>View Orders:</strong> See all PO receipts (batches) in the checking queue</li>
                          <li><strong>Track Quantities:</strong> Monitor M1 (good quality), M2, M3, M4 from completed checkings in the cards above</li>
                          <li><strong>Update Progress:</strong> Click &quot;Update&quot; to open an entry and enter classification (Fresh, M4-Return, M4-Inhouse, M2, M3), then generate GRN</li>
                          <li><strong>Step 4B - Quality Check:</strong> Categorize received quantities into Fresh (M1), M4-Return, M4-Inhouse, M2, M3</li>
                          <li><strong>M2 Repair Review:</strong> M2 items can be tracked for repair; M3+M4 go to defects/return buckets</li>
                          <li><strong>Track Articles:</strong> Monitor individual article progress and classification per receipt</li>
                          <li><strong>Add Remarks:</strong> Add optional remarks per article in the classification modal</li>
                          <li><strong>Filter &amp; Search:</strong> Use filters and search by PO No, Vendor, or Article</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools flex items-center space-x-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                  onClick={loadQueue}
                  title="Refresh"
                >
                  <i className="ri-refresh-line me-2"></i> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards — M1 / M2 / M3+M4 like Production Checking Floor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="box bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Active Orders</p>
                    <p className="text-2xl font-bold text-white">
                      {entries.filter((e) => e.status === "Pending").length}
                    </p>
                  </div>
                  <div className="text-blue-200">
                    <i className="ri-cog-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">M1 - Good Quality</p>
                    <p className="text-2xl font-bold text-white">
                      {entries
                        .filter((e) => e.totals)
                        .reduce((s, e) => s + (e.totals?.totalM1 ?? 0), 0)}
                    </p>
                  </div>
                  <div className="text-green-200">
                    <i className="ri-check-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">M2 - Needs Repair</p>
                    <p className="text-2xl font-bold text-white">
                      {entries
                        .filter((e) => e.totals)
                        .reduce((s, e) => s + (e.totals?.totalM2 ?? 0), 0)}
                    </p>
                  </div>
                  <div className="text-yellow-200">
                    <i className="ri-tools-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="box bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">M3+M4 - Defects</p>
                    <p className="text-2xl font-bold text-white">
                      {entries
                        .filter((e) => e.totals)
                        .reduce((s, e) => s + (e.totals?.totalM3 ?? 0) + (e.totals?.totalM4 ?? 0), 0)}
                    </p>
                  </div>
                  <div className="text-red-200">
                    <i className="ri-error-warning-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Box — Filters, Search, Show per page, Table, Pagination */}
          <div className="box">
            <div className="box-body">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-3 flex-shrink-0 order-2 sm:order-1">
                    <button
                      type="button"
                      className={`ti-btn inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap ${showFilters ? "ti-btn-primary" : "ti-btn-secondary"}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <i className="ri-filter-3-line me-2"></i>
                      Filters {hasActiveFilters && <span className="badge bg-white text-primary ml-1">●</span>}
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                        onClick={clearFilters}
                      >
                        <i className="ri-close-line me-1"></i>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="w-full sm:w-80 lg:w-96 order-1 sm:order-2">
                    <div className="relative">
                      <input
                        type="text"
                        className="form-control py-3 pl-10 pr-4 w-full"
                        placeholder="Search by PO No, Vendor or Article..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <i className="ri-search-line text-lg absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 order-3">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Show:</label>
                    <select
                      className="form-select form-select-sm w-20"
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
                  </div>
                </div>

                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="form-label text-sm font-medium">Status</label>
                        <select
                          className="form-select"
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value as "" | "Pending" | "Completed");
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">All Status</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-sm font-medium">Priority</label>
                        <select
                          className="form-select"
                          value={priorityFilter}
                          onChange={(e) => {
                            setPriorityFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">All Priorities</option>
                          <option value="Urgent">Urgent</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-sm font-medium">Vendor</label>
                        <select
                          className="form-select"
                          value={vendorFilter}
                          onChange={(e) => {
                            setVendorFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">All Vendors</option>
                          {uniqueVendors.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="form-label text-sm font-medium">Start Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="form-label text-sm font-medium">End Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={endDate}
                            onChange={(e) => {
                              setEndDate(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-line text-6xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
                  <p className="text-gray-500 mb-4">
                    {hasActiveFilters
                      ? "Try adjusting your filters or search terms"
                      : "No items currently in checking queue. Confirm receipts from Vendor PO Receive."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap min-w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectAll}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Order Info</th>
                          <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Articles</th>
                          <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
                          <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedIds.has(entry.id)}
                                onChange={() => handleRowSelect(entry.id)}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="font-medium text-gray-900">
                                  {entry.poNo}
                                  <span className="text-sm text-gray-500 ml-2">({entry.receiveId})</span>
                                </div>
                                <div className="text-sm text-gray-500">{entry.vendorName}</div>
                                <div className="text-xs text-gray-400">
                                  Received: {new Date(entry.receiveDate).toLocaleString()}
                                </div>
                                <div>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(entry.priority)}`}
                                  >
                                    {entry.priority}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="font-medium text-gray-900">
                                  {entry.articles.length} Article{entry.articles.length !== 1 ? "s" : ""}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Total Received: {entry.totalReceivedQty.toLocaleString()}
                                </div>
                                <div className="text-xs text-blue-600">
                                  {entry.articles
                                    .slice(0, 3)
                                    .map((a) => `${a.articleCode}: ${a.receivedQty}`)
                                    .join(" · ")}
                                  {entry.articles.length > 3 && ` · +${entry.articles.length - 3} more`}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(entry.status)}`}
                                >
                                  {entry.status}
                                </span>
                                <div>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(entry.priority)}`}
                                  >
                                    {entry.priority}
                                  </span>
                                </div>
                                {entry.status === "Completed" && entry.grnNumber && (
                                  <div className="text-xs text-gray-500">GRN: {entry.grnNumber}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewEntry(entry)}
                                  className="ti-btn ti-btn-primary ti-btn-sm inline-flex items-center justify-center w-8 h-8"
                                  title="View"
                                >
                                  <i className="ri-eye-line"></i>
                                </button>
                                {entry.status === "Pending" && (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/vendor-po/checking/process/${entry.id}`)}
                                    className="ti-btn ti-btn-success ti-btn-sm inline-flex items-center justify-center w-8 h-8"
                                    title="Open / Start Checking"
                                  >
                                    <i className="ri-edit-line"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
                      <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                        <span className="font-medium">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                          {Math.min(currentPage * itemsPerPage, filteredEntries.length)}
                        </span>
                        <span className="text-gray-500"> of {filteredEntries.length} entries</span>
                      </div>
                      <nav aria-label="Page navigation" className="flex items-center space-x-1">
                        <button
                          type="button"
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage > 1
                              ? "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                              : "text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed"
                          }`}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                        >
                          <i className="ri-arrow-left-s-line"></i>
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 7) pageNum = i + 1;
                          else if (currentPage <= 4) pageNum = i + 1;
                          else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
                          else pageNum = currentPage - 3 + i;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === pageNum
                                  ? "bg-primary text-white border border-primary"
                                  : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                              }`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage < totalPages
                              ? "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                              : "text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed"
                          }`}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          <i className="ri-arrow-right-s-line"></i>
                        </button>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Entry Modal — same pattern as Production Checking Floor view modal */}
      {showViewModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">View Entry — {selectedEntry.poNo}</h3>
              <button
                type="button"
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Entry Summary — same layout as Production order summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-600">PO No</label>
                <div className="mt-1 font-medium text-gray-900">{selectedEntry.poNo}</div>
                <div className="text-sm text-gray-500 mt-0.5">{selectedEntry.vendorName}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Receive batch</label>
                <div className="mt-1 text-gray-900">{selectedEntry.receiveId}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(selectedEntry.receiveDate).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Priority</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(selectedEntry.priority)}`}>
                    {selectedEntry.priority}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedEntry.status)}`}>
                    {selectedEntry.status}
                  </span>
                </div>
                {selectedEntry.status === "Completed" && selectedEntry.grnNumber && (
                  <div className="mt-1 text-sm font-medium text-gray-900">GRN: {selectedEntry.grnNumber}</div>
                )}
              </div>
            </div>

            {/* Article Details — table like Production */}
            <div className="space-y-4 mb-6">
              <h4 className="text-lg font-medium text-gray-900">Article Details</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Received Qty</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedEntry.articles.map((a) => (
                      <tr key={a.articleId}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {a.articleCode} – {a.articleName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{a.receivedQty}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.notes || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality totals when completed — M1/M2/M3/M4 like Production */}
            {selectedEntry.status === "Completed" && selectedEntry.totals && (
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Classification Totals</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="form-label text-sm text-gray-600">M1 (Good Quality)</label>
                    <div className="text-lg font-semibold text-green-600">{selectedEntry.totals.totalM1}</div>
                  </div>
                  <div>
                    <label className="form-label text-sm text-gray-600">M2 (Needs Repair)</label>
                    <div className="text-lg font-semibold text-yellow-600">{selectedEntry.totals.totalM2}</div>
                  </div>
                  <div>
                    <label className="form-label text-sm text-gray-600">M3 (Minor Defects)</label>
                    <div className="text-lg font-semibold text-orange-600">{selectedEntry.totals.totalM3}</div>
                  </div>
                  <div>
                    <label className="form-label text-sm text-gray-600">M4 (Defects)</label>
                    <div className="text-lg font-semibold text-red-600">{selectedEntry.totals.totalM4}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                type="button"
                onClick={closeViewModal}
                className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckingPage;
