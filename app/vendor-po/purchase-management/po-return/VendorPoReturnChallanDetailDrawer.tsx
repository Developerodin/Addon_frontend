"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import vendorPoReturnChallanService, { VendorPoReturnChallan } from "@/shared/services/vendorPoReturnChallanService";
import {
  downloadVendorPoReturnChallanHtml,
  printVendorPoReturnChallan,
} from "@/shared/utils/vendorPoReturnChallanPrint";

type Tab = "overview" | "lines" | "transport";

type VendorPoReturnChallanDetailDrawerProps = {
  challan: VendorPoReturnChallan | null;
  onClose: () => void;
  onUpdated?: (updated: VendorPoReturnChallan) => void;
};

const fmtDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Detail drawer for a single vendor PO return challan snapshot.
 */
export function VendorPoReturnChallanDetailDrawer({
  challan,
  onClose,
  onUpdated,
}: VendorPoReturnChallanDetailDrawerProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [current, setCurrent] = useState<VendorPoReturnChallan | null>(challan);
  const [transportDraft, setTransportDraft] = useState({
    vehicleNo: "",
    driverName: "",
    dispatchDate: "",
    transportNotes: "",
  });
  const [savingTransport, setSavingTransport] = useState(false);

  useEffect(() => {
    setTab("overview");
    setCurrent(challan);
    setTransportDraft({
      vehicleNo: challan?.transport?.vehicleNo || "",
      driverName: challan?.transport?.driverName || "",
      dispatchDate: challan?.transport?.dispatchDate
        ? String(challan.transport.dispatchDate).slice(0, 10)
        : "",
      transportNotes: challan?.transport?.transportNotes || "",
    });
  }, [challan?.id, challan]);

  if (!challan || !current) return null;

  const vendor = current.vendor || {};
  const consignor = current.consignor || {};

  const handleSaveTransport = async () => {
    setSavingTransport(true);
    try {
      const updated = await vendorPoReturnChallanService.patchChallanTransport(current.id, {
        vehicleNo: transportDraft.vehicleNo,
        driverName: transportDraft.driverName,
        dispatchDate: transportDraft.dispatchDate || undefined,
        transportNotes: transportDraft.transportNotes,
      });
      setCurrent(updated);
      onUpdated?.(updated);
      toast.success("Transport details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update transport");
    } finally {
      setSavingTransport(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label={`Challan ${current.challanNumber}`}
    >
      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold font-mono">{current.challanNumber}</h2>
            <p className="text-[10px] text-gray-500">VPO {current.vpoNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-2 border-b" role="tablist">
          {(["overview", "lines", "transport"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 capitalize ${
                tab === t ? "border-b-2 border-purple-600 text-purple-800 font-semibold" : "text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3">
          {tab === "overview" && (
            <>
              <p>
                <span className="text-gray-500">Date:</span> {fmtDate(current.challanDate)}
              </p>
              <p>
                <span className="text-gray-500">Consignor:</span> {consignor.name || "ADDON HOLDINGS PRIVATE LIMITED"}
              </p>
              <p>
                <span className="text-gray-500">Vendor:</span> {vendor.name || "—"}
              </p>
              <p>
                <span className="text-gray-500">Intent:</span> {current.cancellationIntent || "partial"}
              </p>
              <p>
                <span className="text-gray-500">Remark:</span> {current.remark || "—"}
              </p>
              <p>
                Boxes: {current.totals?.boxCount ?? 0} · Article qty:{" "}
                {current.totals?.articleQtyCount ?? 0} · M4 (legacy): {current.totals?.m4UnitCount ?? 0} · Total
                units: {current.totals?.totalUnits ?? 0}
              </p>
            </>
          )}

          {tab === "lines" && (
            <table className="min-w-full text-[11px]" aria-label="Challan lines">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase">
                  <th className="px-1 py-1 text-left">Type</th>
                  <th className="px-1 py-1 text-left">Ref</th>
                  <th className="px-1 py-1 text-left">Product</th>
                  <th className="px-1 py-1 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {(current.lines || []).map((line, i) => (
                  <tr key={`${line.lineType}-${i}`} className="border-t">
                    <td className="px-1 py-1">{line.lineType?.toUpperCase()}</td>
                    <td className="px-1 py-1 font-mono">{line.barcode || line.boxId || "M4"}</td>
                    <td className="px-1 py-1">{line.productName || "—"}</td>
                    <td className="px-1 py-1 text-right">
                      {line.lineType === "article"
                        ? line.articleQuantity
                        : line.lineType === "m4"
                          ? line.m4Quantity
                          : line.numberOfUnits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "transport" && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Vehicle no</span>
                <input
                  type="text"
                  value={transportDraft.vehicleNo}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, vehicleNo: e.target.value }))}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Driver</span>
                <input
                  type="text"
                  value={transportDraft.driverName}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, driverName: e.target.value }))}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Dispatch date</span>
                <input
                  type="date"
                  value={transportDraft.dispatchDate}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, dispatchDate: e.target.value }))}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Notes</span>
                <textarea
                  value={transportDraft.transportNotes}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, transportNotes: e.target.value }))}
                  rows={2}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <button
                type="button"
                disabled={savingTransport}
                onClick={() => void handleSaveTransport()}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                Save transport
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <button
            type="button"
            onClick={() => void printVendorPoReturnChallan(current)}
            className="flex-1 py-2 bg-gray-900 text-white rounded text-xs font-semibold"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => void downloadVendorPoReturnChallanHtml(current)}
            className="flex-1 py-2 border rounded text-xs font-semibold"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
