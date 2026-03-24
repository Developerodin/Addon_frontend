"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { CRM } from "../vendor-list/crmUiClasses";
import {
  getCountingQueue,
  updateCountingItem,
  dispatchToWarehouse,
} from "./data";
import type { CountingItem } from "./types";

const CountingPage = () => {
  const [items, setItems] = useState<CountingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Local state for inline edits
  const [countedQty, setCountedQty] = useState<Record<string, number>>({});
  const [boxes, setBoxes] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  
  const [discrepancyModal, setDiscrepancyModal] = useState<{ item: CountingItem; reason: string } | null>(null);
  const [dispatchConfirm, setDispatchConfirm] = useState<CountingItem | null>(null);

  const loadQueue = useCallback(() => {
    setLoading(true);
    setItems(getCountingQueue());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        row.grnNo.toLowerCase().includes(q) ||
        row.poNo.toLowerCase().includes(q) ||
        row.articleCode.toLowerCase().includes(q) ||
        row.articleName.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [items, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const getCounted = (row: CountingItem) => countedQty[row.id] ?? row.countedQty;
  const getBoxesCount = (row: CountingItem) => boxes[row.id] ?? row.boxes ?? 0;
  const getRemarksText = (row: CountingItem) => remarks[row.id] ?? row.remarks ?? "";

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
      boxes: getBoxesCount(item),
      remarks: getRemarksText(item) || undefined,
      discrepancyReason: discrepancyModal.reason.trim(),
    });
    setDiscrepancyModal(null);
    setDispatchConfirm(item);
  };

  const handleFinalDispatch = () => {
    if (!dispatchConfirm) return;
    const item = dispatchConfirm;
    updateCountingItem(item.id, {
      countedQty: getCounted(item),
      boxes: getBoxesCount(item) || undefined,
      remarks: getRemarksText(item) || undefined,
    });
    dispatchToWarehouse(item.id);
    toast.success("Dispatched to warehouse successfully");
    loadQueue();
    setDispatchConfirm(null);
  };

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading Counting Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title="Counting & Dispatch" />
      
      <div className={CRM.titleRow}>
        <div className={CRM.titleWithAccent}>
          <div className={CRM.titleAccent} />
          <h1 className={CRM.pageTitle}>Counting & Dispatch Stage</h1>
          <HelpIcon 
            title="Counting Process"
            content="Final counting and box packaging before warehouse dispatch. Ensure quantities match original PO/GRN expectations."
          />
        </div>
        <div className="flex items-center gap-2">
           <button onClick={loadQueue} className={CRM.btnSecondary}>
             <i className="ri-refresh-line" />
             Refresh
           </button>
        </div>
      </div>

      <div className={CRM.card}>
        <div className={CRM.cardBody}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
             <div className="relative w-full sm:w-80">
              <input
                type="text"
                className={CRM.inputSearch}
                placeholder="Search Dispatch Batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            </div>
          </div>

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                   <th className={CRM.th}>Order Reference</th>
                   <th className={CRM.th}>Article Details</th>
                   <th className={`${CRM.th} !text-right`}>Expected</th>
                   <th className={`${CRM.th} !text-center`}>Actual Count</th>
                   <th className={`${CRM.th} !text-center`}>Boxes</th>
                   <th className={CRM.th}>Status</th>
                   <th className={CRM.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                 {paginated.length === 0 ? (
                   <tr>
                     <td colSpan={7} className={CRM.emptyWrap + " py-20 text-center"}>No pending dispatches found</td>
                   </tr>
                 ) : (
                   paginated.map(row => (
                     <tr key={row.id} className={CRM.tbodyTr}>
                       <td className={CRM.td}>
                         <div className="font-bold text-[12px]">{row.grnNo}</div>
                         <div className="text-[10px] text-gray-500">PO: {row.poNo}</div>
                       </td>
                       <td className={CRM.td}>
                         <div className="font-bold text-gray-800">{row.articleCode}</div>
                         <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{row.articleName}</div>
                       </td>
                       <td className={`${CRM.td} text-right font-medium`}>{row.expectedQty.toLocaleString()}</td>
                       <td className={CRM.td + " text-center"}>
                          <input 
                            type="number"
                            className={CRM.input + " !w-24 mx-auto text-center font-bold text-emerald-600 border-emerald-100"}
                            value={getCounted(row)}
                            onChange={(e) => setCountedQty(p => ({ ...p, [row.id]: Number(e.target.value) }))}
                          />
                       </td>
                       <td className={CRM.td + " text-center"}>
                          <input 
                             type="number"
                             className={CRM.input + " !w-16 mx-auto text-center border-blue-100"}
                             placeholder="0"
                             value={getBoxesCount(row) || ""}
                             onChange={(e) => setBoxes(p => ({ ...p, [row.id]: Number(e.target.value) }))}
                          />
                       </td>
                       <td className={CRM.td}>
                          <span className={row.status === "Dispatched" ? CRM.badgeActive : CRM.badgeInactive}>
                             {row.status}
                          </span>
                       </td>
                       <td className={CRM.td}>
                          <div className={CRM.rowActions}>
                             <button 
                               onClick={() => handleDispatchClick(row)}
                               className={CRM.btnPrimarySm}
                             >
                               Dispatch
                             </button>
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

      {/* Discrepancy Modal */}
      {discrepancyModal && (
        <div className={CRM.modalOverlay}>
           <div className={CRM.modalPanel + " !max-w-md"}>
              <div className={CRM.modalHeader}>
                 <h2 className={CRM.modalTitle}>Discrepancy in Count</h2>
                 <button onClick={() => setDiscrepancyModal(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="ri-close-line text-lg" />
                 </button>
              </div>
              <div className={CRM.modalBody}>
                 <p className="text-[12px] text-gray-600 mb-4 bg-amber-50 p-3 rounded border border-amber-100">
                    Counted qty ({getCounted(discrepancyModal.item)}) does not match expected ({discrepancyModal.item.expectedQty}). 
                    Please provide a justification reason to continue.
                 </p>
                 <label className={CRM.label}>Reason for Variance</label>
                 <textarea 
                   className={CRM.input + " min-h-[100px]"}
                   placeholder="Enter reason..."
                   value={discrepancyModal.reason}
                   onChange={(e) => setDiscrepancyModal(m => m ? ({ ...m, reason: e.target.value }) : null)}
                 />
              </div>
              <div className={CRM.modalFooter}>
                 <button onClick={() => setDiscrepancyModal(null)} className={CRM.btnSecondary}>Back</button>
                 <button 
                   onClick={handleDiscrepancySubmit} 
                   className={CRM.btnPrimary}
                   disabled={!discrepancyModal.reason.trim()}
                 >
                   Confirm Variance
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Dispatch Confirm */}
      {dispatchConfirm && (
        <div className={CRM.modalOverlay}>
           <div className={CRM.modalPanel + " !max-w-sm"}>
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-truck-line text-3xl" />
                 </div>
                 <h2 className="text-lg font-bold text-gray-800 mb-2">Confirm Dispatch?</h2>
                 <p className="text-[12px] text-gray-500 mb-6">
                    This will mark the batch as dispatched to warehouse and finalize the production flow.
                 </p>
                 <div className="flex gap-2">
                    <button onClick={() => setDispatchConfirm(null)} className={CRM.btnSecondary + " flex-1"}>Cancel</button>
                    <button onClick={handleFinalDispatch} className={CRM.btnPrimary + " flex-1"}>Confirm Dispatch</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CountingPage;
