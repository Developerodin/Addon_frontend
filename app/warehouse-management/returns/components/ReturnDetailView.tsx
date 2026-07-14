"use client";

import React, { useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsReturns,
  WarehouseReturn,
  WarehouseReturnItem,
} from "@/shared/services/whmsFulfilmentService";
import {
  clampVerifiedQty,
  decisionForCondition,
  validateReturnForApprove,
  validateReturnForSubmit,
  type ReturnRowErrors,
} from "../utils/returnValidation";

const STATUS_BADGES: Record<string, string> = {
  scanning: "bg-blue-100 text-blue-700",
  "pending-approval": "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

type Props = {
  selected: WarehouseReturn;
  busy: boolean;
  onBack: () => void;
  onRefresh: (id: string) => Promise<void>;
  onSelectedChange: (doc: WarehouseReturn) => void;
  onListRefresh: () => void;
  setBusy: (v: boolean) => void;
};

/**
 * Active return session: barcode scan, verification table, submit / approve actions.
 */
export default function ReturnDetailView({
  selected,
  busy,
  onBack,
  onRefresh,
  onSelectedChange,
  onListRefresh,
  setBusy,
}: Props) {
  const [barcode, setBarcode] = useState("");
  const [rowErrors, setRowErrors] = useState<ReturnRowErrors>({});
  const scanInputRef = useRef<HTMLInputElement>(null);

  const editable = ["scanning", "pending-approval"].includes(selected.status);
  const isScanning = selected.status === "scanning";

  const submitValidation = useMemo(
    () => (isScanning ? validateReturnForSubmit(selected.items) : { valid: true, rowErrors: {} }),
    [selected.items, isScanning],
  );

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    const matched =
      selected.items.find((i) => i.styleCode === code) ||
      selected.items.find((i) => i.skuCode === code);

    if (!matched) {
      toast.error(`Barcode "${code}" is not on invoice ${selected.invoiceNumber}`);
      setBarcode("");
      scanInputRef.current?.focus();
      return;
    }

    const invoiceQty = Number(matched.invoiceQty || 0);
    const currentScanned = Number(matched.scannedQty || 0);
    if (currentScanned >= invoiceQty && invoiceQty > 0) {
      toast.error(`${matched.styleCode} already matches invoice qty (${invoiceQty})`);
      setBarcode("");
      scanInputRef.current?.focus();
      return;
    }

    try {
      const doc = await whmsReturns.scan(selected.id, code);
      onSelectedChange(doc);
      const updated = doc.items.find(
        (i) => (i.id || i._id) === (matched.id || matched._id) || i.styleCode === matched.styleCode,
      );
      const newScanned = Number(updated?.scannedQty || 0);
      if (newScanned > invoiceQty) {
        toast.error(`${matched.styleCode}: scanned ${newScanned} exceeds invoice ${invoiceQty}`);
      } else {
        toast.success(`${matched.styleCode}: ${newScanned}/${invoiceQty} scanned`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBarcode("");
      scanInputRef.current?.focus();
    }
  };

  const handleItemUpdate = async (
    item: WarehouseReturnItem,
    patch: Partial<Pick<WarehouseReturnItem, "verifiedQty" | "condition" | "decision">>,
  ) => {
    const itemId = item.id || item._id;
    if (!itemId) return;

    const key = itemId;

    if (patch.verifiedQty !== undefined) {
      const clamped = clampVerifiedQty(item.scannedQty, patch.verifiedQty);
      if (clamped !== patch.verifiedQty) {
        toast.error(`Verified qty capped at scanned qty (${item.scannedQty})`);
        patch.verifiedQty = clamped;
      }
    }

    if (patch.condition !== undefined && patch.decision === undefined && !item.decision) {
      patch.decision = decisionForCondition(patch.condition);
    }

    const merged = { ...item, ...patch };
    const scanned = Number(merged.scannedQty || 0);
    const verified = Number(merged.verifiedQty || 0);
    if (scanned <= 0 && verified > 0) {
      toast.error("Cannot set verified qty without scanned items");
      return;
    }
    if (verified > scanned) {
      toast.error(`Verified qty cannot exceed scanned (${scanned})`);
      return;
    }

    const fieldErrs: string[] = [];
    if (scanned > 0 && verified > 0) {
      if (!merged.condition) fieldErrs.push("Condition is required");
      if (!merged.decision) fieldErrs.push("Decision is required");
    }

    try {
      const doc = await whmsReturns.updateItem(selected.id, itemId, patch);
      onSelectedChange(doc);
      setRowErrors((prev) => {
        const next = { ...prev };
        if (fieldErrs.length) next[key] = fieldErrs;
        else delete next[key];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleVerifiedQtyChange = (item: WarehouseReturnItem, raw: string) => {
    const clamped = clampVerifiedQty(item.scannedQty, Number(raw));
    void handleItemUpdate(item, { verifiedQty: clamped });
  };

  const handleSubmit = async () => {
    const validation = validateReturnForSubmit(selected.items);
    setRowErrors(validation.rowErrors);
    if (!validation.valid) {
      toast.error(validation.message || "Fix validation errors before submitting");
      return;
    }
    setBusy(true);
    try {
      await whmsReturns.submit(selected.id);
      await onRefresh(selected.id);
      toast.success("Submitted for supervisor approval");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    const validation = validateReturnForApprove(selected.items);
    setRowErrors(validation.rowErrors);
    if (!validation.valid) {
      toast.error(validation.message || "Fix validation errors before approving");
      return;
    }
    if (!window.confirm(`Approve return ${selected.returnNumber}? Stock will be updated per line decisions.`)) return;
    setBusy(true);
    try {
      await whmsReturns.approve(selected.id);
      await onRefresh(selected.id);
      toast.success("Return approved — inventory updated");
      onListRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Reject this return? Enter a reason:");
    if (reason === null) return;
    setBusy(true);
    try {
      await whmsReturns.reject(selected.id, reason);
      await onRefresh(selected.id);
      toast("Return rejected");
      onListRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const getItemErrors = (item: WarehouseReturnItem) => {
    const key = item.id || item._id || item.styleCode;
    return rowErrors[key] || [];
  };

  return (
    <>
      <div className="box mb-4">
        <div className="box-body flex flex-wrap items-center gap-3">
          <button type="button" onClick={onBack} className="ti-btn ti-btn-light text-[12px]">
            <i className="ri-arrow-left-line" /> Back
          </button>
          <span className="text-[13px] font-bold text-gray-800">
            {selected.returnNumber} <span className="uppercase text-gray-500">({selected.type})</span>
          </span>
          <span className="text-[12px] text-gray-600">Invoice {selected.invoiceNumber}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGES[selected.status] || ""}`}>
            {selected.status}
          </span>
          <div className="ml-auto flex gap-2">
            {isScanning && (
              <button
                type="button"
                disabled={busy || !submitValidation.valid}
                onClick={handleSubmit}
                className="ti-btn ti-btn-primary text-[12px] font-semibold disabled:opacity-50"
                title={submitValidation.valid ? undefined : "Complete verification on all scanned lines first"}
              >
                <i className="ri-send-plane-line" /> Submit for Approval
              </button>
            )}
            {selected.status === "pending-approval" && (
              <>
                <button type="button" disabled={busy} onClick={handleReject} className="ti-btn ti-btn-danger text-[12px] font-semibold">
                  Reject
                </button>
                <button type="button" disabled={busy} onClick={handleApprove} className="ti-btn ti-btn-primary text-[12px] font-semibold">
                  <i className="ri-check-double-line" /> Approve &amp; Update Stock
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="box mb-4">
          <div className="box-body">
            <form onSubmit={handleScan} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Scan Returned Product</label>
                <input
                  ref={scanInputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode and press Enter"
                  className="form-control w-full text-[13px]"
                  autoFocus
                  aria-label="Barcode scanner input"
                />
              </div>
              <button type="submit" className="ti-btn ti-btn-primary px-4 min-h-[38px] text-[12px] font-semibold">
                <i className="ri-barcode-line" /> Scan
              </button>
            </form>
            <p className="text-[11px] text-gray-500 mt-2">Scanned counts update via barcode only — not editable in the table.</p>
          </div>
        </div>
      )}

      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-2">
          <h3 className="box-title">Return Verification (invoice vs scanned vs verified)</h3>
          {isScanning && !submitValidation.valid ? (
            <p className="text-[11px] text-amber-700 font-medium">Complete verified qty, condition &amp; decision on scanned lines before submit.</p>
          ) : null}
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
                  const invoiceQty = Number(item.invoiceQty || 0);
                  const scannedQty = Number(item.scannedQty || 0);
                  const verifiedQty = Number(item.verifiedQty || 0);
                  const diff = scannedQty - invoiceQty;
                  const errs = getItemErrors(item);
                  const hasScanned = scannedQty > 0;
                  const verifiedInvalid = hasScanned && (verifiedQty <= 0 || verifiedQty > scannedQty);
                  const conditionInvalid = hasScanned && verifiedQty > 0 && !item.condition;
                  const decisionInvalid = hasScanned && verifiedQty > 0 && !item.decision;

                  return (
                    <tr key={item.id || item._id || item.styleCode} className={diff !== 0 && scannedQty > 0 ? "bg-yellow-50" : ""}>
                      <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                        {item.styleCode}
                        {errs.length > 0 ? (
                          <span className="block text-[10px] text-red-600 font-medium mt-0.5">{errs[0]}</span>
                        ) : null}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{item.size || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] font-semibold text-right text-gray-800 border border-gray-200">{invoiceQty}</td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200">
                        <span
                          className={`text-[12px] font-bold tabular-nums ${
                            scannedQty > invoiceQty ? "text-red-700" : scannedQty > 0 ? "text-emerald-700" : "text-gray-800"
                          }`}
                          aria-label={`Scanned ${scannedQty} of ${invoiceQty} for ${item.styleCode}`}
                        >
                          {scannedQty}
                          <span className="text-gray-400 font-medium"> / {invoiceQty}</span>
                        </span>
                      </td>
                      <td className={`px-1.5 py-2.5 text-[12px] font-bold text-right border border-gray-200 ${diff === 0 ? "text-green-600" : "text-red-600"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200">
                        {editable && hasScanned ? (
                          <div className="inline-flex flex-col items-end gap-0.5">
                            <input
                              type="number"
                              min={0}
                              max={scannedQty}
                              step={1}
                              value={verifiedQty}
                              onChange={(e) => handleVerifiedQtyChange(item, e.target.value)}
                              className={`form-control w-20 inline-block text-right text-[12px] py-1 ${
                                verifiedInvalid ? "border-red-400 ring-1 ring-red-200" : ""
                              }`}
                              aria-label={`Verified quantity for ${item.styleCode}`}
                              aria-invalid={verifiedInvalid}
                            />
                            <span className="text-[10px] text-gray-400">Max {scannedQty}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] font-semibold">{verifiedQty}</span>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        {editable && hasScanned ? (
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              const condition = e.target.value as WarehouseReturnItem["condition"];
                              const patch: Partial<Pick<WarehouseReturnItem, "condition" | "decision">> = { condition };
                              if (!item.decision) patch.decision = decisionForCondition(condition);
                              void handleItemUpdate(item, patch);
                            }}
                            className={`form-control text-[12px] py-1 ${conditionInvalid ? "border-red-400" : ""}`}
                            aria-label={`Condition for ${item.styleCode}`}
                            aria-invalid={conditionInvalid}
                            required={verifiedQty > 0}
                          >
                            <option value="">Select condition</option>
                            <option value="saleable">Saleable</option>
                            <option value="damaged">Damaged</option>
                            <option value="repair">Repair / Repack</option>
                          </select>
                        ) : (
                          <span className="text-[12px]">{item.condition || "—"}</span>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        {editable && hasScanned ? (
                          <select
                            value={item.decision}
                            onChange={(e) =>
                              void handleItemUpdate(item, { decision: e.target.value as WarehouseReturnItem["decision"] })
                            }
                            className={`form-control text-[12px] py-1 ${decisionInvalid ? "border-red-400" : ""}`}
                            aria-label={`Decision for ${item.styleCode}`}
                            aria-invalid={decisionInvalid}
                            required={verifiedQty > 0}
                          >
                            <option value="">Select decision</option>
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
  );
}
