"use client";

import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsScanning,
  ScanSession,
  ScanSessionItem,
} from "@/shared/services/whmsFulfilmentService";

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
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    try {
      const res = await whmsScanning.scan(session.id, barcode.trim(), scanQty);
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

  const handleManualQty = async (item: ScanSessionItem, value: number) => {
    const itemId = item.id || item._id;
    if (!itemId || Number.isNaN(value) || value < 0) return;
    try {
      const updated = await whmsScanning.updateItem(session.id, itemId, value);
      onSessionChange(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleComplete = async () => {
    const s = session.summary;
    const hasMismatch = s.pending + s.short + s.excess > 0;
    let force = false;
    let remarks = "";
    if (hasMismatch) {
      remarks =
        window.prompt(
          `Mismatches (${s.pending} pending, ${s.short} short, ${s.excess} excess).\nEnter remarks to complete anyway:`
        ) || "";
      if (!remarks.trim()) return;
      force = true;
    }
    try {
      await whmsScanning.complete(session.id, { force, remarks });
      toast.success("Scanning completed");
      onSessionChange(null);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Complete failed");
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
          {session.startedByName ? (
            <span className="text-[12px] text-gray-600">Scanner: {session.startedByName}</span>
          ) : null}
          <span className="text-[12px] text-gray-600">
            Scanned <b>{session.summary.totalScanned}</b> / {session.summary.totalExpected}
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" disabled={busy} onClick={() => void handleCancel()} className="ti-btn ti-btn-light text-[12px]">
              Cancel Session
            </button>
            <button type="button" disabled={busy} onClick={() => void handleComplete()} className="ti-btn ti-btn-primary text-[12px] font-semibold">
              <i className="ri-check-double-line"></i> Complete Scanning
            </button>
          </div>
        </div>
      </div>

      <div className="box mb-4">
        <div className="box-body">
          <form onSubmit={(e) => void handleScan(e)} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Scan Barcode</label>
              <input
                ref={scanInputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type style code"
                className="form-control w-full text-[13px]"
                autoFocus
              />
            </div>
            <div className="w-24">
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Qty</label>
              <input type="number" min={1} value={scanQty} onChange={(e) => setScanQty(Math.max(1, Number(e.target.value)))} className="form-control w-full text-[13px]" />
            </div>
            <button type="submit" className="ti-btn ti-btn-primary px-4 min-h-[38px] text-[12px] font-semibold">
              <i className="ri-barcode-line"></i> Scan
            </button>
          </form>
        </div>
      </div>

      <div className="box">
        <div className="box-header"><h3 className="box-title">Scan Progress</h3></div>
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
              {session.items.map((item) => (
                <tr key={item.id || item._id || item.styleCode} className={itemRowClass(item.status)}>
                  <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{item.styleCode}</td>
                  <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{item.expectedQty}</td>
                  <td className="px-1.5 py-2.5 text-right border border-gray-200">
                    <input type="number" min={0} value={item.scannedQty} onChange={(e) => void handleManualQty(item, Number(e.target.value))} className="form-control w-20 inline-block text-right text-[12px] py-1" />
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">{itemBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
