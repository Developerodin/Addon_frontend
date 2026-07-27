"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsScanning,
  ScanSession,
} from "@/shared/services/whmsFulfilmentService";
import {
  whmsPickListBatches,
  type OrderBatchInfo,
} from "@/shared/services/whmsPickListBatchService";

const itemRowClass = (status: string) => {
  switch (status) {
    case "matched":
      return "bg-green-50";
    case "short":
      return "bg-yellow-50";
    case "excess":
      return "bg-red-50";
    default:
      return "";
  }
};

const itemBadge = (status: string) => {
  switch (status) {
    case "matched":
      return <span className="badge bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded">Matched</span>;
    case "short":
      return <span className="badge bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-2 py-0.5 rounded">Short</span>;
    case "excess":
      return <span className="badge bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded">Excess</span>;
    default:
      return <span className="badge bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded">Pending</span>;
  }
};

export interface ScanningLiveSessionProps {
  session: ScanSession;
  busy: boolean;
  onBack: () => void;
  onSessionChange: (session: ScanSession | null) => void;
  onComplete: () => void;
}

/**
 * Live barcode scan UI for an open scan session.
 */
export default function ScanningLiveSession({
  session,
  busy,
  onBack,
  onSessionChange,
  onComplete,
}: ScanningLiveSessionProps) {
  const [barcode, setBarcode] = useState("");
  const [scanQty, setScanQty] = useState(1);
  const [batchInfo, setBatchInfo] = useState<OrderBatchInfo | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const orderId =
    typeof session.orderId === "string"
      ? session.orderId
      : String(session.orderId?.id || "");

  useEffect(() => {
    if (!orderId) return;
    void whmsPickListBatches.forOrder(orderId).then(setBatchInfo).catch(() => setBatchInfo(null));
  }, [orderId]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    const qty = Math.max(1, Math.floor(Number(scanQty) || 1));
    const matchedItem =
      session.items.find((i) => i.styleCode === code) ||
      session.items.find((i) => i.skuCode === code);

    if (matchedItem) {
      const expected = Number(matchedItem.expectedQty || 0);
      const current = Number(matchedItem.scannedQty || 0);
      const remaining = expected - current;
      if (remaining <= 0) {
        toast.error(`${matchedItem.styleCode} is already fully scanned (${expected}/${expected})`);
        setBarcode("");
        scanInputRef.current?.focus();
        return;
      }
      if (qty > remaining) {
        toast.error(
          `Cannot scan ${qty} for ${matchedItem.styleCode} — only ${remaining} remaining (max ${expected})`,
        );
        setScanQty(remaining);
        return;
      }
    }

    try {
      const res = await whmsScanning.scan(session.id, code, qty);
      onSessionChange(res.session);
      const item = res.scannedItem;
      if (item.status === "excess") {
        toast.error(`${item.styleCode}: scanned ${item.scannedQty}/${item.expectedQty} — EXCESS`);
      } else {
        toast.success(`${item.styleCode}: ${item.scannedQty}/${item.expectedQty}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBarcode("");
      setScanQty(1);
      scanInputRef.current?.focus();
    }
  };

  const handleScanQtyChange = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setScanQty(1);
      return;
    }
    setScanQty(Math.min(999, Math.floor(parsed)));
  };

  const handleComplete = async () => {
    const s = session.summary;
    const hasMismatch = s.pending + s.short + s.excess > 0;
    let force = false;
    let remarks = "";
    if (hasMismatch) {
      remarks =
        window.prompt(
          `Mismatches (${s.pending} pending, ${s.short} short, ${s.excess} excess).\nEnter remarks to complete anyway:`,
        ) || "";
      if (!remarks.trim()) return;
      force = true;
    }
    try {
      await whmsScanning.complete(session.id, { force, remarks });
      toast.success("Scanning completed — order is ready in Billing");
      onSessionChange(null);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Complete failed");
    }
  };

  const handleCloseWithShortQty = async () => {
    const s = session.summary;
    const shortOrPending = s.short + s.pending;
    if (shortOrPending <= 0) {
      toast.error("All items are matched — use Complete Scanning instead");
      return;
    }
    const remarks =
      window.prompt(
        `Close order with ${s.totalScanned}/${s.totalExpected} scanned (${s.short} short, ${s.pending} pending).\nOptional remarks:`,
      ) || "";
    if (!window.confirm(`Proceed with ${s.totalScanned}/${s.totalExpected} scanned for this order?`)) return;
    try {
      await whmsScanning.complete(session.id, { closeWithShortQty: true, remarks });
      toast.success("Order closed with short quantity — sent to billing");
      onSessionChange(null);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Close failed");
    }
  };

  const handleCancel = async () => {
    try {
      await whmsScanning.cancel(session.id, "Cancelled from scanning screen");
      onSessionChange(null);
      toast("Session cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  return (
    <>
      <div className="box mb-4">
        <div className="box-body flex flex-wrap items-center gap-4">
          <button type="button" onClick={onBack} className="ti-btn ti-btn-light text-[12px]">
            <i className="ri-arrow-left-line"></i> Back
          </button>
          <span className="text-[13px] font-bold text-gray-800">Order {session.orderNumber}</span>
          {batchInfo && batchInfo.type === "combined" && (
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 uppercase">
              Combined {batchInfo.batchNumber}
            </span>
          )}
          {session.startedByName ? (
            <span className="text-[12px] text-gray-600">Scanner: {session.startedByName}</span>
          ) : null}
          <span className="text-[12px] text-gray-600">
            Scanned <b>{session.summary.totalScanned}</b> / {session.summary.totalExpected}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void handleCancel()} className="ti-btn ti-btn-light text-[12px]">
              Cancel Session
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCloseWithShortQty()}
              className="ti-btn ti-btn-warning text-[12px] font-semibold"
            >
              Close with Short Qty
            </button>
            <button type="button" disabled={busy} onClick={() => void handleComplete()} className="ti-btn ti-btn-primary text-[12px] font-semibold">
              <i className="ri-check-double-line"></i> Complete Scanning
            </button>
          </div>
        </div>
      </div>

      {batchInfo && batchInfo.siblings.length > 1 && (
        <div className="box mb-4">
          <div className="box-body">
            <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">Batch orders</p>
            <div className="flex flex-wrap gap-2">
              {batchInfo.siblings.map((sib) => (
                <span
                  key={sib.id}
                  className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold border ${
                    sib.id === orderId
                      ? "bg-purple-100 text-purple-900 border-purple-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {sib.orderNumber || sib.id}
                  <span className="ml-1 opacity-70">({sib.flowStatus?.replace(/-/g, " ")})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="box mb-4">
        <div className="box-body">
          <form onSubmit={(e) => void handleScan(e)} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Scan Barcode</label>
              <input
                ref={scanInputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan EAN code"
                className="form-control w-full text-[13px]"
                autoFocus
                aria-label="Scan EAN code"
              />
            </div>
            <div className="w-24">
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Qty per scan</label>
              <input
                type="number"
                min={1}
                max={999}
                step={1}
                value={scanQty}
                onChange={(e) => handleScanQtyChange(e.target.value)}
                disabled
                className="form-control w-full text-[13px] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50"
                aria-label="Quantity to add per barcode scan"
              />
            </div>
            <button type="submit" className="ti-btn ti-btn-primary px-4 min-h-[38px] text-[12px] font-semibold">
              <i className="ri-barcode-line"></i> Scan
            </button>
          </form>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-2">
          <h3 className="box-title">Scan Progress</h3>
          <p className="text-[11px] text-gray-500">Scanned counts update via barcode scan only — not editable here.</p>
        </div>
        <div className="box-body overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Style</th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Expected</th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Scanned</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {session.items.map((item) => {
                const scanned = Number(item.scannedQty || 0);
                const expected = Number(item.expectedQty || 0);
                const isExcess = scanned > expected;
                return (
                <tr key={item.id || item._id || item.styleCode} className={itemRowClass(item.status)}>
                  <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{item.styleCode}</td>
                  <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{expected}</td>
                  <td className="px-1.5 py-2.5 text-right border border-gray-200">
                    <span
                      className={`inline-block min-w-[4rem] text-[12px] font-bold tabular-nums ${
                        isExcess ? "text-red-700" : scanned >= expected && expected > 0 ? "text-emerald-700" : "text-gray-900"
                      }`}
                      aria-label={`Scanned ${scanned} of ${expected} for ${item.styleCode}`}
                    >
                      {scanned}
                      <span className="text-gray-400 font-medium"> / {expected}</span>
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">{itemBadge(item.status)}</td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
