"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import { getCheckingQueue } from "../checking/data";
import type { CheckingQueueEntry } from "../checking/types";

const GRNPage = () => {
  const [entries, setEntries] = useState<CheckingQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [vendorFilter, setVendorFilter] = useState("");

  const loadEntries = useCallback(() => {
    setLoading(true);
    setEntries(getCheckingQueue());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const grnEntries = useMemo(
    () => entries.filter((e) => e.status === "Completed" && e.grnNumber),
    [entries]
  );

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
    const vSet = new Set(grnEntries.map((e) => e.vendorName));
    return Array.from(vSet).sort();
  }, [grnEntries]);

  const freshQty = (e: CheckingQueueEntry) => e.totals?.totalM1 ?? 0;
  const nonFreshQty = (e: CheckingQueueEntry) =>
    (e.totals?.totalM2 ?? 0) + (e.totals?.totalM3 ?? 0) + (e.totals?.totalM4 ?? 0);

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
      <Seo title="GRN Register" />
      
      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Goods Received Note (GRN)</h1>
          <HelpIcon 
            title="GRN"
            content="Historical register of all items received from vendors, post-checking. Includes fresh (M1) and variance (M2/M4) counts."
          />
        </div>
        <div className="flex items-center gap-2">
           <button onClick={loadEntries} className={CRM.btnSecondary}>
             <i className="ri-refresh-line" />
             Refresh
           </button>
        </div>
      </div>

      <div className={CRM.card}>
        <div className={CRM.cardBody}>
          <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
             <div className="relative flex-1 md:max-w-md">
                <input
                  type="text"
                  className={CRM.inputSearch}
                  placeholder="Search GRN, PO, Vendor or Article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
             </div>
             
             <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                   <label className={CRM.label + " mb-0"}>From:</label>
                   <input 
                     type="date" 
                     className={CRM.input + " !w-auto !p-1.5 h-9"} 
                     value={startDate} 
                     onChange={(e) => setStartDate(e.target.value)} 
                   />
                </div>
                <div className="flex items-center gap-2">
                   <label className={CRM.label + " mb-0"}>To:</label>
                   <input 
                     type="date" 
                     className={CRM.input + " !w-auto !p-1.5 h-9"} 
                     value={endDate} 
                     onChange={(e) => setEndDate(e.target.value)} 
                   />
                </div>
                <select 
                  className={CRM.select + " h-9 !py-1"}
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                >
                   <option value="">All Vendors</option>
                   {uniqueVendors.map(v => (
                     <option key={v} value={v}>{v}</option>
                   ))}
                </select>
             </div>
          </div>

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
               <thead>
                  <tr className={CRM.theadTr}>
                     <th className={CRM.th}>GRN Number</th>
                     <th className={CRM.th}>Order Date</th>
                     <th className={CRM.th}>Vendor & PO</th>
                     <th className={`${CRM.th} !text-right`}>Fresh (M1)</th>
                     <th className={`${CRM.th} !text-right`}>Non-Fresh</th>
                     <th className={CRM.th}>Action</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                       <td colSpan={6} className={CRM.emptyWrap + " py-24 text-center"}>No Goods Received Notes found</td>
                    </tr>
                  ) : (
                    filtered.map(e => (
                      <tr key={e.id} className={CRM.tbodyTr}>
                        <td className={CRM.td}>
                           <div className="font-bold text-gray-900 border-l-2 border-emerald-500 pl-2">{e.grnNumber}</div>
                        </td>
                        <td className={CRM.td}>
                           <div className="text-[11px] font-medium text-gray-600">
                             {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}
                           </div>
                        </td>
                        <td className={CRM.td}>
                           <div className="font-bold text-gray-800">{e.vendorName}</div>
                           <div className="text-[10px] text-purple-600 font-bold">{e.poNo}</div>
                        </td>
                        <td className={`${CRM.td} text-right font-bold text-emerald-600`}>{freshQty(e).toLocaleString()}</td>
                        <td className={`${CRM.td} text-right font-medium text-amber-600`}>{nonFreshQty(e).toLocaleString()}</td>
                        <td className={CRM.td}>
                           <div className={CRM.rowActions}>
                              <Link 
                                href={`/vendor-po/grn/view/${encodeURIComponent(e.grnNumber ?? "")}`}
                                className={CRM.btnSecondarySm}
                              >
                                <i className="ri-eye-line mr-1" /> View
                              </Link>
                              <Link 
                                href={`/vendor-po/grn/view/${encodeURIComponent(e.grnNumber ?? "")}?print=1`}
                                className={CRM.btnPrimarySm}
                              >
                                <i className="ri-printer-line" />
                              </Link>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
