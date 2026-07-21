"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorGrnService, { type VendorGrn } from "@/shared/services/vendorGrnService";

const GRNPage = () => {
  const [grns, setGrns] = useState<VendorGrn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [vendorFilter, setVendorFilter] = useState("");

  const loadGrns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorGrnService.list({
        limit: 200,
        from: startDate,
        to: endDate,
        grnNumber: searchTerm.trim() || undefined,
      });
      setGrns(data.results || []);
    } catch (err: unknown) {
      console.error(err);
      setGrns([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchTerm]);

  useEffect(() => {
    void loadGrns();
  }, [loadGrns]);

  const filtered = useMemo(() => {
    return grns.filter((g) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        g.grnNumber.toLowerCase().includes(q) ||
        (g.vpoNumber || "").toLowerCase().includes(q) ||
        (g.vendor?.vendorName || "").toLowerCase().includes(q);
      const matchesVendor =
        !vendorFilter || g.vendor?.vendorName === vendorFilter;
      const grnTime = g.grnDate ? new Date(g.grnDate).getTime() : 0;
      const matchesDate =
        (!startDate || grnTime >= new Date(startDate).setHours(0, 0, 0, 0)) &&
        (!endDate || grnTime <= new Date(endDate).setHours(23, 59, 59, 999));
      return matchesSearch && matchesVendor && matchesDate;
    });
  }, [grns, searchTerm, vendorFilter, startDate, endDate]);

  const uniqueVendors = useMemo(() => {
    const vSet = new Set(grns.map((g) => g.vendor?.vendorName).filter(Boolean) as string[]);
    return Array.from(vSet).sort();
  }, [grns]);

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading GRN Register...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title="Vendor PO GRN Register" />
      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <span className={CRM.titleAccent} aria-hidden />
          <div>
            <h1 className={CRM.pageTitle}>GRN Register</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Goods received notes from secondary checking (verified = M1+M2+M3+M4)
            </p>
          </div>
        </div>
        <HelpIcon helpKey="vendor-po-grn" />
      </div>

      <div className={`${CRM.card} mb-4`}>
        <div className={`${CRM.cardBody} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#495057] uppercase tracking-wide">Filters</span>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filtered.length}
              </span>
            </div>
            <button
              type="button"
              className={CRM.btnSecondary}
              onClick={() => void loadGrns()}
              aria-label="Refresh GRN list"
            >
              <i className="ri-refresh-line text-xs" aria-hidden="true" />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="grn-search" className={CRM.label}>
                Search
              </label>
              <div className="relative">
                <i
                  className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="grn-search"
                  type="search"
                  placeholder="GRN / VPO / vendor…"
                  className={CRM.inputSearch}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search GRNs"
                />
              </div>
            </div>
            <div>
              <label htmlFor="grn-vendor-filter" className={CRM.label}>
                Vendor
              </label>
              <select
                id="grn-vendor-filter"
                className={CRM.select}
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                aria-label="Filter by vendor"
              >
                <option value="">All vendors</option>
                {uniqueVendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="grn-start-date" className={CRM.label}>
                From
              </label>
              <input
                id="grn-start-date"
                type="date"
                className={CRM.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="From date"
              />
            </div>
            <div>
              <label htmlFor="grn-end-date" className={CRM.label}>
                To
              </label>
              <input
                id="grn-end-date"
                type="date"
                className={CRM.input}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="To date"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={CRM.card}>
        <div className={`${CRM.cardBody} pb-0 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100`}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#495057] uppercase tracking-wide">GRN Register</span>
            <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-100">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className={CRM.tableWrap}>
          <table className={CRM.table}>
            <thead>
              <tr className={CRM.theadTr}>
                <th scope="col" className={CRM.th}>
                  GRN No
                </th>
                <th scope="col" className={CRM.th}>
                  Date
                </th>
                <th scope="col" className={CRM.th}>
                  VPO
                </th>
                <th scope="col" className={CRM.th}>
                  Vendor
                </th>
                <th scope="col" className={CRM.thRight}>
                  Expected
                </th>
                <th scope="col" className={CRM.thRight}>
                  Verified
                </th>
                <th scope="col" className={CRM.thRight}>
                  Variance
                </th>
                <th scope="col" className={`${CRM.th} text-center`}>
                  Status
                </th>
                <th scope="col" className={`${CRM.th} text-center w-[88px]`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border border-gray-200">
                    <div className={CRM.emptyWrap}>
                      <div className={CRM.emptyIconWrap}>
                        <i className={`ri-inbox-line ${CRM.emptyIcon}`} aria-hidden="true" />
                      </div>
                      <h3 className={CRM.emptyTitle}>NO GRNs FOUND</h3>
                      <p className={CRM.emptySub}>
                        Complete secondary checking and issue GRN from the process drawer.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((g) => {
                  const variance = g.totals?.variance ?? 0;
                  return (
                    <tr key={g.id} className={CRM.tbodyTr}>
                      <td className={`${CRM.td} font-bold text-purple-700 whitespace-nowrap`}>
                        {g.grnNumber}
                      </td>
                      <td className={`${CRM.td} whitespace-nowrap text-[#495057]`}>
                        {g.grnDate ? new Date(g.grnDate).toLocaleDateString() : "—"}
                      </td>
                      <td className={`${CRM.td} font-medium whitespace-nowrap`}>{g.vpoNumber}</td>
                      <td className={`${CRM.td} max-w-[180px]`}>
                        <span className="block truncate" title={g.vendor?.vendorName ?? undefined}>
                          {g.vendor?.vendorName ?? "—"}
                        </span>
                      </td>
                      <td className={`${CRM.td} text-right tabular-nums`}>
                        {(g.totals?.expected ?? 0).toLocaleString()}
                      </td>
                      <td className={`${CRM.td} text-right tabular-nums font-semibold`}>
                        {(g.totals?.verified ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={`${CRM.td} text-right tabular-nums font-semibold ${
                          variance > 0 ? "text-emerald-700" : variance < 0 ? "text-red-700" : "text-[#495057]"
                        }`}
                      >
                        {variance.toLocaleString()}
                      </td>
                      <td className={`${CRM.td} text-center`}>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            g.incompleteClassification
                              ? "bg-amber-50 text-amber-800 border-amber-100"
                              : "bg-emerald-50 text-emerald-800 border-emerald-100"
                          }`}
                        >
                          {g.incompleteClassification ? "Partial SC" : "Complete"}
                        </span>
                      </td>
                      <td className={`${CRM.td} text-center`}>
                        <Link
                          href={`/vendor-po/grn/view/${encodeURIComponent(g.grnNumber)}`}
                          className={`${CRM.iconView} mx-auto`}
                          title={`View ${g.grnNumber}`}
                          aria-label={`View ${g.grnNumber}`}
                        >
                          <i className="ri-eye-line text-xs" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 ? (
          <div className={CRM.paginationBar}>
            <p className={CRM.paginationSummary}>
              Showing {filtered.length} GRN{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GRNPage;
