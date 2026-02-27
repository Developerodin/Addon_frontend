"use client";
import React, { useState, useMemo, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { getCheckingQueue } from "../checking/data";
import type { CheckingQueueEntry } from "../checking/types";

const getDefaultStartDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
};
const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

/** 5A) GRN List Screen */
const GRNPage = () => {
  const [entries, setEntries] = useState<CheckingQueueEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [vendorFilter, setVendorFilter] = useState("");

  const grnEntries = useMemo(
    () => entries.filter((e) => e.status === "Completed" && e.grnNumber),
    [entries]
  );

  useEffect(() => {
    setEntries(getCheckingQueue());
  }, []);

  useEffect(() => {
    const onFocus = () => setEntries(getCheckingQueue());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = useMemo(() => {
    return grnEntries.filter((e) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (e.grnNumber && e.grnNumber.toLowerCase().includes(q)) ||
        e.poNo.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q) ||
        e.articles.some(
          (a) =>
            a.articleName.toLowerCase().includes(q) || a.articleCode.toLowerCase().includes(q)
        );
      const matchesVendor = !vendorFilter || e.vendorName === vendorFilter;
      const completedAt = e.completedAt ? new Date(e.completedAt).getTime() : 0;
      const matchesDate =
        (!startDate || completedAt >= new Date(startDate).setHours(0, 0, 0, 0)) &&
        (!endDate || completedAt <= new Date(endDate).setHours(23, 59, 59, 999));
      return matchesSearch && matchesVendor && matchesDate;
    });
  }, [grnEntries, searchTerm, vendorFilter, startDate, endDate]);

  const uniqueVendors = useMemo(() => {
    const set = new Set(grnEntries.map((e) => e.vendorName));
    return Array.from(set).sort();
  }, [grnEntries]);

  const freshQty = (e: CheckingQueueEntry) => e.totals?.totalM1 ?? 0;
  const nonFreshQty = (e: CheckingQueueEntry) =>
    (e.totals?.totalM2 ?? 0) + (e.totals?.totalM3 ?? 0) + (e.totals?.totalM4 ?? 0);

  return (
    <div className="main-content">
      <Seo title="GRN" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* 5A Top bar: Title, Search, Filters (Date range, Vendor) */}
          <div className="box mb-6">
            <div className="box-header">
              <h1 className="box-title text-xl font-semibold">GRN</h1>
            </div>
            <div className="box-body">
              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center flex-wrap">
                <div className="relative flex-1 min-w-0 lg:max-w-sm">
                  <input
                    type="text"
                    className="form-control py-2.5 pl-9 pr-3 w-full"
                    placeholder="Search: GRN No / PO No / Vendor / Article"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="date"
                    className="form-control form-control-sm w-auto min-w-[130px]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Date from"
                  />
                  <input
                    type="date"
                    className="form-control form-control-sm w-auto min-w-[130px]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Date to"
                  />
                  <select
                    className="form-select form-select-sm w-auto min-w-[140px]"
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                  >
                    <option value="">All Vendors</option>
                    {uniqueVendors.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-body p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No GRN found</h3>
                  <p className="text-gray-500">
                    Complete checking for vendor PO receipts to generate GRNs.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">GRN No</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Date</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">PO No</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Vendor</th>
                        <th scope="col" className="px-4 py-3 text-end font-medium text-gray-700">Fresh Qty</th>
                        <th scope="col" className="px-4 py-3 text-end font-medium text-gray-700">Non-fresh Qty</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filtered.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{e.grnNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "–"}
                          </td>
                          <td className="px-4 py-3 text-gray-900">{e.poNo}</td>
                          <td className="px-4 py-3 text-gray-600">{e.vendorName}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{freshQty(e)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{nonFreshQty(e)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/vendor-po/grn/view/${encodeURIComponent(e.grnNumber ?? "")}`}
                                className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                              >
                                <i className="ri-eye-line me-1"></i>
                                View
                              </Link>
                              <Link
                                href={`/vendor-po/grn/view/${encodeURIComponent(e.grnNumber ?? "")}?print=1`}
                                className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                              >
                                <i className="ri-printer-line me-1"></i>
                                Print
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
