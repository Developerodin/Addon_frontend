"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import yarnVendorJobService, { type VendorJobPreviewBox } from "@/shared/services/yarnVendorJobService";
import { exportAtVendorExcel } from "../utils/yarnVendorExcel";

interface AtVendorTabProps {
  refreshKey?: number;
}

/**
 * Boxes currently off-site, with days-out and Excel export.
 */
const AtVendorTab: React.FC<AtVendorTabProps> = ({ refreshKey = 0 }) => {
  const [rows, setRows] = useState<VendorJobPreviewBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState("");

  /**
   * Reloads the at-vendor list.
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await yarnVendorJobService.listAtVendor();
      setRows(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load at-vendor boxes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filtered = vendorFilter.trim()
    ? rows.filter((r) => (r.vendorName || "").toLowerCase().includes(vendorFilter.trim().toLowerCase()))
    : rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="search"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          placeholder="Filter by vendor…"
          aria-label="Filter by vendor"
          className="w-full max-w-xs rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-purple-300 focus:ring-0"
        />
        <button
          type="button"
          onClick={() => exportAtVendorExcel(filtered)}
          className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <i className="ri-file-excel-2-line me-1" />
          Excel
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-gray-500">No boxes at vendor.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="py-1.5 pr-3 font-semibold">Box</th>
                <th className="py-1.5 pr-3 font-semibold">Yarn</th>
                <th className="py-1.5 pr-3 font-semibold">Vendor</th>
                <th className="py-1.5 pr-3 font-semibold">Shipment</th>
                <th className="py-1.5 pr-3 font-semibold">Days out</th>
                <th className="py-1.5 font-semibold">Net kg</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.barcode || row.boxId} className="border-b border-gray-50 text-gray-800">
                  <td className="py-1.5 pr-3 font-medium">{row.boxId}</td>
                  <td className="py-1.5 pr-3">
                    {row.yarnName}
                    {row.shadeCode ? ` · ${row.shadeCode}` : ""}
                  </td>
                  <td className="py-1.5 pr-3">{row.vendorName || "—"}</td>
                  <td className="py-1.5 pr-3">{row.shipmentNumber || "—"}</td>
                  <td className="py-1.5 pr-3">{row.daysOut ?? "—"}</td>
                  <td className="py-1.5">{row.netWeight || row.boxWeight || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AtVendorTab;
