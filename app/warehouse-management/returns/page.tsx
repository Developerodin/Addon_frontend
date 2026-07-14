"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsReturns,
  WarehouseReturn,
  ReturnReason,
  WarehouseReturnType,
  type WhmsInvoice,
} from "@/shared/services/whmsFulfilmentService";
import InvoiceSelectModal from "./components/InvoiceSelectModal";
import ReturnDetailView from "./components/ReturnDetailView";

const REASONS: Array<{ value: ReturnReason; label: string }> = [
  { value: "damage", label: "Damage" },
  { value: "wrong-item", label: "Wrong Item" },
  { value: "size-issue", label: "Size Issue" },
  { value: "delivery-issue", label: "Delivery Issue" },
  { value: "courier-rto", label: "Courier RTO (Undelivered)" },
  { value: "other", label: "Other" },
];

const STATUS_BADGES: Record<string, string> = {
  scanning: "bg-blue-100 text-blue-700",
  "pending-approval": "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<WarehouseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WarehouseReturn | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // create form state
  const [createType, setCreateType] = useState<WarehouseReturnType>("rtv");
  const [createInvoiceId, setCreateInvoiceId] = useState("");
  const [createInvoiceNumber, setCreateInvoiceNumber] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createReason, setCreateReason] = useState<ReturnReason>("damage");
  const [createRemarks, setCreateRemarks] = useState("");

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whmsReturns.list({ limit: 100 });
      setReturns(res.results || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const refreshSelected = async (id: string) => {
    const doc = await whmsReturns.get(id);
    setSelected(doc);
    setReturns((prev) => prev.map((r) => (r.id === doc.id ? doc : r)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createInvoiceId && !createInvoiceNumber.trim()) {
      toast.error("Select an invoice to match the return against");
      return;
    }
    setBusy(true);
    try {
      const doc = await whmsReturns.create({
        type: createType,
        invoiceId: createInvoiceId || undefined,
        invoiceNumber: createInvoiceNumber.trim() || undefined,
        reason: createReason,
        remarks: createRemarks,
      });
      toast.success(`Return ${doc.returnNumber} created — start scanning`);
      setShowCreate(false);
      setCreateInvoiceId("");
      setCreateInvoiceNumber("");
      setCreateRemarks("");
      setSelected(doc);
      fetchReturns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create return");
    } finally {
      setBusy(false);
    }
  };

  const handleInvoiceSelect = (invoice: WhmsInvoice) => {
    setCreateInvoiceId(invoice.id);
    setCreateInvoiceNumber(invoice.invoiceNumber);
  };

  const clearSelectedInvoice = () => {
    setCreateInvoiceId("");
    setCreateInvoiceNumber("");
  };

  return (
    <>
      <Seo title="Warehouse Returns" />
      <Toaster position="top-right" />

      {!selected && (
        <div className="box">
          <div className="box-header flex items-center justify-between">
            <h3 className="box-title">Warehouse Returns (RTO / Customer Returns)</h3>
            <div className="flex gap-2">
              <button type="button" onClick={fetchReturns} className="ti-btn ti-btn-light text-[12px]">
                <i className="ri-refresh-line"></i> Refresh
              </button>
              <button type="button" onClick={() => setShowCreate((v) => !v)} className="ti-btn ti-btn-primary text-[12px] font-semibold">
                <i className="ri-add-line"></i> New Return
              </button>
            </div>
          </div>
          <div className="box-body">
            {showCreate && (
              <form onSubmit={handleCreate} className="border border-gray-200 rounded p-4 mb-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Type</label>
                  <select value={createType} onChange={(e) => setCreateType(e.target.value as WarehouseReturnType)} className="form-control text-[13px]">
                    <option value="rtv">Customer Return (RTV)</option>
                    <option value="rto">RTO / Undelivered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Invoice</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={createInvoiceNumber}
                      placeholder="Select invoice..."
                      className="form-control text-[13px] w-56 bg-gray-50 cursor-pointer"
                      onClick={() => setShowInvoiceModal(true)}
                      aria-label="Selected invoice number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvoiceModal(true)}
                      className="ti-btn ti-btn-light px-3 min-h-[38px] text-[12px] font-semibold whitespace-nowrap"
                      aria-label="Browse invoices"
                    >
                      <i className="ri-search-line" /> Browse
                    </button>
                    {createInvoiceNumber ? (
                      <button
                        type="button"
                        onClick={clearSelectedInvoice}
                        className="ti-btn ti-btn-light px-2 min-h-[38px] text-[12px]"
                        aria-label="Clear selected invoice"
                      >
                        <i className="ri-close-line" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Reason</label>
                  <select value={createReason} onChange={(e) => setCreateReason(e.target.value as ReturnReason)} className="form-control text-[13px]">
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Remarks</label>
                  <input value={createRemarks} onChange={(e) => setCreateRemarks(e.target.value)} className="form-control text-[13px] w-full" />
                </div>
                <button type="submit" disabled={busy} className="ti-btn ti-btn-primary min-h-[38px] text-[12px] font-semibold">
                  Create
                </button>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              </div>
            ) : returns.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No returns yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Return #</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Invoice #</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Client</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Reason</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                      <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{r.returnNumber}</td>
                        <td className="px-1.5 py-2.5 text-[12px] uppercase font-semibold text-gray-700 border border-gray-200">{r.type}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{r.invoiceNumber || "—"}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{r.clientName || "—"}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{r.reason}</td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-right border border-gray-200">
                          <button type="button" onClick={() => setSelected(r)} className="ti-btn ti-btn-light px-3 py-1.5 text-[11px] font-semibold">
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <ReturnDetailView
          selected={selected}
          busy={busy}
          onBack={() => setSelected(null)}
          onRefresh={refreshSelected}
          onSelectedChange={setSelected}
          onListRefresh={fetchReturns}
          setBusy={setBusy}
        />
      )}

      <InvoiceSelectModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSelect={handleInvoiceSelect}
      />
    </>
  );
}
