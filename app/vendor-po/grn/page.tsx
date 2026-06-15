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
        <div className={`${CRM.cardBody} flex flex-wrap gap-2`}>
        <input
          type="search"
          placeholder="Search GRN / VPO / vendor…"
          className={CRM.input}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search GRNs"
        />
        <select
          className={CRM.input}
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
        <input
          type="date"
          className={CRM.input}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className={CRM.input}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          aria-label="To date"
        />
        <button type="button" className={CRM.btnSecondary} onClick={() => void loadGrns()}>
          Refresh
        </button>
        </div>
      </div>

      <div className={CRM.card}>
        <div className={CRM.tableWrap}>
        <table className={CRM.table}>
          <thead>
            <tr>
              <th>GRN No</th>
              <th>Date</th>
              <th>VPO</th>
              <th>Vendor</th>
              <th className="text-right">Expected</th>
              <th className="text-right">Verified</th>
              <th className="text-right">Variance</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  No GRNs found. Complete secondary checking and issue GRN from the process drawer.
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/60">
                  <td className="font-bold text-purple-700">{g.grnNumber}</td>
                  <td>
                    {g.grnDate
                      ? new Date(g.grnDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>{g.vpoNumber}</td>
                  <td>{g.vendor?.vendorName ?? "—"}</td>
                  <td className="text-right">{(g.totals?.expected ?? 0).toLocaleString()}</td>
                  <td className="text-right font-semibold">
                    {(g.totals?.verified ?? 0).toLocaleString()}
                  </td>
                  <td
                    className={`text-right font-semibold ${
                      (g.totals?.variance ?? 0) > 0
                        ? "text-emerald-700"
                        : (g.totals?.variance ?? 0) < 0
                          ? "text-red-700"
                          : ""
                    }`}
                  >
                    {(g.totals?.variance ?? 0).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.incompleteClassification
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {g.incompleteClassification ? "Partial SC" : "Complete"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/vendor-po/grn/view/${encodeURIComponent(g.grnNumber)}`}
                      className="text-[11px] font-bold text-purple-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
