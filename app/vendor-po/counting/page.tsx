"use client";
import React, { useState, useMemo, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import HelpIcon from "@/shared/components/HelpIcon";
import type { CountingItem } from "./types";
import {
  getCountingQueue,
  updateCountingItem,
  dispatchToWarehouse,
} from "./data";

const getDefaultStartDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
};
const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

const getStatusBadge = (status: string) => {
  if (status === "Pending Counting") return "bg-yellow-100 text-yellow-800";
  if (status === "Dispatched") return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800";
};

/** Counting & Dispatch — UI matches Branding/Final Checking Supervisor Dashboard. Inline Counted Qty, Boxes, Remarks; Dispatch with discrepancy validation. */
const CountingPage = () => {
  const [items, setItems] = useState<CountingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "Pending Counting" | "Dispatched">("");
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CountingItem | null>(null);
  const [countedQty, setCountedQty] = useState<Record<string, number>>({});
  const [boxes, setBoxes] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [discrepancyModal, setDiscrepancyModal] = useState<{ item: CountingItem; reason: string } | null>(null);
  const [dispatchConfirm, setDispatchConfirm] = useState<CountingItem | null>(null);

  const loadQueue = () => setItems(getCountingQueue());

  useEffect(() => { loadQueue(); }, []);
  useEffect(() => {
    const onFocus = () => setItems(getCountingQueue());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        row.grnNo.toLowerCase().includes(q) ||
        row.poNo.toLowerCase().includes(q) ||
        row.articleCode.toLowerCase().includes(q) ||
        row.articleName.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "" ||
    startDate !== getDefaultStartDate() ||
    endDate !== getDefaultEndDate();

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const selectAll = paginated.length > 0 && paginated.every((row) => selectedIds.includes(row.id));
  const handleSelectAll = () => {
    if (selectAll) setSelectedIds([]);
    else setSelectedIds(paginated.map((r) => r.id));
  };
  const handleRowSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((x) => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const getCounted = (row: CountingItem) => countedQty[row.id] ?? row.countedQty;
  const getBoxes = (row: CountingItem) => boxes[row.id] ?? row.boxes ?? 0;
  const getRemarks = (row: CountingItem) => remarks[row.id] ?? row.remarks ?? "";

  const setCountedFor = (id: string, value: number) => setCountedQty((prev) => ({ ...prev, [id]: value }));
  const setBoxesFor = (id: string, value: number) => setBoxes((prev) => ({ ...prev, [id]: value }));
  const setRemarksFor = (id: string, value: string) => setRemarks((prev) => ({ ...prev, [id]: value }));

  const handleViewItem = (row: CountingItem) => {
    setSelectedItem(row);
    setShowViewModal(true);
  };
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedItem(null);
  };

  const handleDispatchClick = (row: CountingItem) => {
    const cnt = getCounted(row);
    if (cnt !== row.expectedQty) {
      setDiscrepancyModal({ item: row, reason: "" });
      return;
    }
    setDispatchConfirm(row);
  };

  const handleDiscrepancySubmit = () => {
    if (!discrepancyModal || !discrepancyModal.reason.trim()) return;
    const { item } = discrepancyModal;
    updateCountingItem(item.id, {
      countedQty: getCounted(item),
      boxes: getBoxes(item),
      remarks: getRemarks(item) || undefined,
      discrepancyReason: discrepancyModal.reason.trim(),
    });
    setDiscrepancyModal(null);
    setDispatchConfirm(item);
  };

  const handleDispatchConfirm = () => {
    if (!dispatchConfirm) return;
    const item = dispatchConfirm;
    const cnt = getCounted(item);
    updateCountingItem(item.id, {
      countedQty: cnt,
      boxes: getBoxes(item) || undefined,
      remarks: getRemarks(item) || undefined,
    });
    dispatchToWarehouse(item.id);
    setItems(getCountingQueue());
    setDispatchConfirm(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
  };
  const handleItemsPerPageChange = (n: number) => {
    setItemsPerPage(n);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const pendingCount = items.filter((r) => r.status === "Pending Counting").length;
  const dispatchedCount = items.filter((r) => r.status === "Dispatched").length;
  const totalQty = items.reduce((s, r) => s + r.expectedQty, 0);

  return (
    <div className="main-content">
      <Seo title="Counting & Dispatch" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header — same pattern as Branding / Final Checking */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Counting & Dispatch Supervisor Dashboard</h1>
                <HelpIcon
                  title="Counting & Dispatch"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          Enter counted qty (defaults to expected). If counted differs from expected, provide a discrepancy reason before dispatch. Dispatch to Warehouse marks the item as dispatched.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Counted Qty:</strong> Edit in table; defaults to expected</li>
                          <li><strong>Boxes/Cartons &amp; Remarks:</strong> Optional, per row</li>
                          <li><strong>Discrepancy:</strong> If Counted ≠ Expected, reason required before dispatch</li>
                          <li><strong>Dispatch to Warehouse:</strong> Marks item dispatched (audit logged)</li>
                          <li><strong>Filter &amp; Search:</strong> By GRN, PO, Article, Status</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools flex items-center space-x-2">
                <button type="button" className="ti-btn ti-btn-light" onClick={loadQueue} title="Refresh">
                  <i className="ri-refresh-line me-2"></i> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards — same layout as Branding / Final Checking */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="box bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Pending Counting</p>
                    <p className="text-2xl font-bold text-white">{pendingCount}</p>
                  </div>
                  <div className="text-blue-200">
                    <i className="ri-time-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Dispatched</p>
                    <p className="text-2xl font-bold text-white">{dispatchedCount}</p>
                  </div>
                  <div className="text-green-200">
                    <i className="ri-truck-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Total Items</p>
                    <p className="text-2xl font-bold text-white">{items.length}</p>
                  </div>
                  <div className="text-yellow-200">
                    <i className="ri-file-list-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="box bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Qty</p>
                    <p className="text-2xl font-bold text-white">{totalQty.toLocaleString()}</p>
                  </div>
                  <div className="text-red-200">
                    <i className="ri-box-3-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Box — same structure as Branding / Final Checking */}
          <div className="box">
            <div className="box-body">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-3 flex-shrink-0 order-2 sm:order-1">
                    <button
                      type="button"
                      className={`ti-btn ${showFilters ? "ti-btn-primary" : "ti-btn-secondary"}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <i className="ri-filter-3-line me-2"></i>
                      Filters {hasActiveFilters && <span className="badge bg-white text-primary ml-1">●</span>}
                    </button>
                    {hasActiveFilters && (
                      <button type="button" className="ti-btn ti-btn-light" onClick={clearFilters}>
                        <i className="ri-close-line me-1"></i> Clear
                      </button>
                    )}
                  </div>
                  <div className="w-full sm:w-80 lg:w-96 order-1 sm:order-2">
                    <div className="relative">
                      <input
                        type="text"
                        className="form-control py-3 pl-10 pr-4 w-full"
                        placeholder="Search by GRN, PO or Article..."
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label text-sm font-medium">Status</label>
                        <select
                          className="form-select"
                          value={statusFilter}
                          onChange={(e) => { setStatusFilter(e.target.value as "" | "Pending Counting" | "Dispatched"); setCurrentPage(1); }}
                        >
                          <option value="">All Status</option>
                          <option value="Pending Counting">Pending Counting</option>
                          <option value="Dispatched">Dispatched</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-sm font-medium">Start Date</label>
                        <input type="date" className="form-control" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} />
                      </div>
                      <div>
                        <label className="form-label text-sm font-medium">End Date</label>
                        <input type="date" className="form-control" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-line text-6xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500 mb-4">
                    {hasActiveFilters
                      ? "Try adjusting your filters or search terms"
                      : "No orders currently in Counting queue. Complete Final Checking to see items here."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">
                          <input type="checkbox" className="form-check-input" checked={selectAll} onChange={handleSelectAll} />
                        </th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Order Info</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Articles</th>
                        <th scope="col" className="px-4 py-3 text-end font-medium text-gray-700">Counted Qty</th>
                        <th scope="col" className="px-4 py-3 text-end font-medium text-gray-700">Boxes</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Remarks</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginated.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedIds.includes(row.id)}
                              onChange={() => handleRowSelect(row.id)}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{row.grnNo}</div>
                              <div className="text-sm text-gray-500">{row.poNo}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">1 Article</div>
                              <div className="text-sm text-gray-600">{row.articleCode} — {row.articleName}</div>
                              <div className="text-xs text-blue-600">Expected: {row.expectedQty}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {row.status === "Dispatched" ? (
                              <span className="font-medium">{row.countedQty}</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm w-24 text-end"
                                value={getCounted(row)}
                                onChange={(e) => setCountedFor(row.id, parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {row.status === "Dispatched" ? (
                              <span>{row.boxes ?? "–"}</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm w-20 text-end"
                                placeholder="–"
                                value={getBoxes(row) || ""}
                                onChange={(e) => setBoxesFor(row.id, parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {row.status === "Dispatched" ? (
                              <span className="text-gray-600">{row.remarks || "–"}</span>
                            ) : (
                              <input
                                type="text"
                                className="form-control form-control-sm min-w-[100px]"
                                placeholder="Optional"
                                value={getRemarks(row)}
                                onChange={(e) => setRemarksFor(row.id, e.target.value)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                onClick={() => handleViewItem(row)}
                                title="View"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              {row.status === "Pending Counting" && (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-success ti-btn-sm"
                                  onClick={() => handleDispatchClick(row)}
                                  title="Dispatch to Warehouse"
                                >
                                  <i className="ri-truck-line"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                    <span className="font-medium">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)}
                    </span>
                    <span className="text-gray-500"> of {filtered.length} items</span>
                  </div>
                  <nav aria-label="Page navigation" className="flex items-center space-x-1">
                    <button
                      className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage > 1 ? "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700" : "text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed"}`}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <i className="ri-arrow-left-s-line"></i>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                      return (
                        <button
                          key={pageNum}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === pageNum ? "bg-primary text-white border border-primary" : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700"}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage < totalPages ? "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700" : "text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed"}`}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Modal — same pattern as Branding / Final Checking */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">View — {selectedItem.grnNo}</h3>
              <button type="button" onClick={closeViewModal} className="text-gray-400 hover:text-gray-600">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-600">GRN No</label>
                <div className="mt-1 font-medium text-gray-900">{selectedItem.grnNo}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">PO No</label>
                <div className="mt-1 text-gray-900">{selectedItem.poNo}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Expected / Counted</label>
                <div className="mt-1 text-gray-900">{selectedItem.expectedQty} / {selectedItem.status === "Dispatched" ? selectedItem.countedQty : (getCounted(selectedItem))}</div>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <h4 className="text-lg font-medium text-gray-900">Article</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Expected</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Counted</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">Boxes</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">{selectedItem.articleCode} — {selectedItem.articleName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{selectedItem.expectedQty}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{selectedItem.status === "Dispatched" ? selectedItem.countedQty : getCounted(selectedItem)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{selectedItem.status === "Dispatched" ? (selectedItem.boxes ?? "–") : (getBoxes(selectedItem) || "–")}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{selectedItem.status === "Dispatched" ? (selectedItem.remarks || "–") : getRemarks(selectedItem) || "–"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {selectedItem.discrepancyReason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Discrepancy Reason</label>
                  <div className="mt-1 text-gray-700 p-2 bg-amber-50 rounded border border-amber-200">{selectedItem.discrepancyReason}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              {selectedItem.status === "Pending Counting" && (
                <button
                  type="button"
                  className="ti-btn ti-btn-success inline-flex items-center gap-2 py-2 px-4"
                  onClick={() => { closeViewModal(); handleDispatchClick(selectedItem); }}
                >
                  <i className="ri-truck-line"></i> Dispatch to Warehouse
                </button>
              )}
              <button type="button" className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Reason modal */}
      {discrepancyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold mb-2">Discrepancy Reason Required</h4>
            <p className="text-gray-600 mb-4">
              Counted qty ({getCounted(discrepancyModal.item)}) does not match expected ({discrepancyModal.item.expectedQty}). Please provide a reason before dispatching.
            </p>
            <textarea
              className="form-control mb-4 min-h-[80px]"
              placeholder="Enter discrepancy reason..."
              value={discrepancyModal.reason}
              onChange={(e) => setDiscrepancyModal((m) => (m ? { ...m, reason: e.target.value } : null))}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4" onClick={() => setDiscrepancyModal(null)}>Cancel</button>
              <button
                type="button"
                className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4"
                disabled={!discrepancyModal.reason.trim()}
                onClick={handleDiscrepancySubmit}
              >
                Continue to Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch confirm */}
      {dispatchConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold mb-2">Dispatch to Warehouse</h4>
            <p className="text-gray-600 mb-4">Mark this item as dispatched and create warehouse inward entry?</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4" onClick={() => setDispatchConfirm(null)}>Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4" onClick={handleDispatchConfirm}>Confirm Dispatch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountingPage;
