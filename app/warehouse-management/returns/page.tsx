"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsReturns,
  WarehouseReturn,
  WarehouseReturnItem,
  ReturnReason,
  WarehouseReturnType,
} from "@/shared/services/whmsFulfilmentService";

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
  const [createInvoiceNumber, setCreateInvoiceNumber] = useState("");
  const [createReason, setCreateReason] = useState<ReturnReason>("damage");
  const [createRemarks, setCreateRemarks] = useState("");

  // scan state
  const [barcode, setBarcode] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

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
    if (!createInvoiceNumber.trim()) {
      toast.error("Enter the invoice number to match the return against");
      return;
    }
    setBusy(true);
    try {
      const doc = await whmsReturns.create({
        type: createType,
        invoiceNumber: createInvoiceNumber.trim(),
        reason: createReason,
        remarks: createRemarks,
      });
      toast.success(`Return ${doc.returnNumber} created — start scanning`);
      setShowCreate(false);
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

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !barcode.trim()) return;
    try {
      const doc = await whmsReturns.scan(selected.id, barcode.trim());
      setSelected(doc);
      toast.success(`Scanned ${barcode.trim()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBarcode("");
      scanInputRef.current?.focus();
    }
  };

  const handleItemUpdate = async (
    item: WarehouseReturnItem,
    patch: Partial<Pick<WarehouseReturnItem, "verifiedQty" | "condition" | "decision">>
  ) => {
    if (!selected) return;
    const itemId = item.id || item._id;
    if (!itemId) return;
    try {
      const doc = await whmsReturns.updateItem(selected.id, itemId, patch);
      setSelected(doc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await whmsReturns.submit(selected.id);
      await refreshSelected(selected.id);
      toast.success("Submitted for supervisor approval");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    if (!window.confirm(`Approve return ${selected.returnNumber}? Stock will be updated per line decisions.`)) return;
    setBusy(true);
    try {
      await whmsReturns.approve(selected.id);
      await refreshSelected(selected.id);
      toast.success("Return approved — inventory updated");
      fetchReturns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    const reason = window.prompt("Reject this return? Enter a reason:");
    if (reason === null) return;
    setBusy(true);
    try {
      await whmsReturns.reject(selected.id, reason);
      await refreshSelected(selected.id);
      toast("Return rejected");
      fetchReturns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const editable = selected && ["scanning", "pending-approval"].includes(selected.status);

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
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Invoice Number</label>
                  <input
                    value={createInvoiceNumber}
                    onChange={(e) => setCreateInvoiceNumber(e.target.value)}
                    placeholder="WH-INV-2026-00001"
                    className="form-control text-[13px] w-56"
                  />
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
        <>
          <div className="box mb-4">
            <div className="box-body flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setSelected(null)} className="ti-btn ti-btn-light text-[12px]">
                <i className="ri-arrow-left-line"></i> Back
              </button>
              <span className="text-[13px] font-bold text-gray-800">
                {selected.returnNumber} <span className="uppercase text-gray-500">({selected.type})</span>
              </span>
              <span className="text-[12px] text-gray-600">Invoice {selected.invoiceNumber}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGES[selected.status] || ""}`}>{selected.status}</span>
              <div className="ml-auto flex gap-2">
                {selected.status === "scanning" && (
                  <button type="button" disabled={busy} onClick={handleSubmit} className="ti-btn ti-btn-primary text-[12px] font-semibold">
                    <i className="ri-send-plane-line"></i> Submit for Approval
                  </button>
                )}
                {selected.status === "pending-approval" && (
                  <>
                    <button type="button" disabled={busy} onClick={handleReject} className="ti-btn ti-btn-danger text-[12px] font-semibold">
                      Reject
                    </button>
                    <button type="button" disabled={busy} onClick={handleApprove} className="ti-btn ti-btn-primary text-[12px] font-semibold">
                      <i className="ri-check-double-line"></i> Approve &amp; Update Stock
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {selected.status === "scanning" && (
            <div className="box mb-4">
              <div className="box-body">
                <form onSubmit={handleScan} className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Scan Returned Product</label>
                    <input
                      ref={scanInputRef}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan or type barcode and press Enter"
                      className="form-control w-full text-[13px]"
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="ti-btn ti-btn-primary px-4 min-h-[38px] text-[12px] font-semibold">
                    <i className="ri-barcode-line"></i> Scan
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Return Verification (invoice vs scanned vs verified)</h3>
            </div>
            <div className="box-body">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Style Code</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Size</th>
                      <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Invoice Qty</th>
                      <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Scanned</th>
                      <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Diff</th>
                      <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Verified Qty</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Condition</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item) => {
                      const diff = Number(item.scannedQty || 0) - Number(item.invoiceQty || 0);
                      return (
                        <tr key={item.id || item._id || item.styleCode} className={diff !== 0 && item.scannedQty > 0 ? "bg-yellow-50" : ""}>
                          <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{item.styleCode}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{item.size || "—"}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-semibold text-right text-gray-800 border border-gray-200">{item.invoiceQty}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-semibold text-right text-gray-800 border border-gray-200">{item.scannedQty}</td>
                          <td className={`px-1.5 py-2.5 text-[12px] font-bold text-right border border-gray-200 ${diff === 0 ? "text-green-600" : "text-red-600"}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="px-1.5 py-2.5 text-right border border-gray-200">
                            {editable ? (
                              <input
                                type="number"
                                min={0}
                                value={item.verifiedQty}
                                onChange={(e) => handleItemUpdate(item, { verifiedQty: Number(e.target.value) })}
                                className="form-control w-20 inline-block text-right text-[12px] py-1"
                              />
                            ) : (
                              <span className="text-[12px] font-semibold">{item.verifiedQty}</span>
                            )}
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            {editable ? (
                              <select
                                value={item.condition}
                                onChange={(e) => handleItemUpdate(item, { condition: e.target.value as WarehouseReturnItem["condition"] })}
                                className="form-control text-[12px] py-1"
                              >
                                <option value="">—</option>
                                <option value="saleable">Saleable</option>
                                <option value="damaged">Damaged</option>
                                <option value="repair">Repair / Repack</option>
                              </select>
                            ) : (
                              <span className="text-[12px]">{item.condition || "—"}</span>
                            )}
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            {editable ? (
                              <select
                                value={item.decision}
                                onChange={(e) => handleItemUpdate(item, { decision: e.target.value as WarehouseReturnItem["decision"] })}
                                className="form-control text-[12px] py-1"
                              >
                                <option value="">—</option>
                                <option value="restock">Add to Inventory</option>
                                <option value="damaged-stock">Damaged Stock</option>
                                <option value="repair">Repair / Repack</option>
                                <option value="reject">Reject</option>
                              </select>
                            ) : (
                              <span className="text-[12px]">{item.decision || "—"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
