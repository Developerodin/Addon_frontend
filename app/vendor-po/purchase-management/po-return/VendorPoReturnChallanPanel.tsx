"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  useVendorPoReturnChallans,
} from "@/shared/hooks/useVendorPoReturnChallans";
import vendorPoReturnChallanService, {
  VendorPoReturnChallan,
  getDefaultVendorChallanListEndDate,
  getDefaultVendorChallanListStartDate,
} from "@/shared/services/vendorPoReturnChallanService";
import {
  downloadVendorPoReturnChallanHtml,
  printVendorPoReturnChallan,
} from "@/shared/utils/vendorPoReturnChallanPrint";
import { VendorPoReturnChallanDetailDrawer } from "./VendorPoReturnChallanDetailDrawer";

type VendorPoReturnChallanPanelProps = {
  vpoNumberFilter?: string;
};

const fmtDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

/**
 * Full challan history tab with filters, pagination, print, and detail drawer.
 */
export function VendorPoReturnChallanPanel({ vpoNumberFilter }: VendorPoReturnChallanPanelProps) {
  const challans = useVendorPoReturnChallans({
    from: getDefaultVendorChallanListStartDate(),
    to: getDefaultVendorChallanListEndDate(),
    vpoNumber: vpoNumberFilter,
  });
  const [active, setActive] = useState<VendorPoReturnChallan | null>(null);
  const [draftVpo, setDraftVpo] = useState(vpoNumberFilter || "");

  useEffect(() => {
    setDraftVpo(vpoNumberFilter || "");
    challans.setFilters({
      from: getDefaultVendorChallanListStartDate(),
      to: getDefaultVendorChallanListEndDate(),
      vpoNumber: vpoNumberFilter?.trim() || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync PO filter from return tab
  }, [vpoNumberFilter]);

  const handlePrint = async (row: VendorPoReturnChallan) => {
    try {
      const full = await vendorPoReturnChallanService.getChallanById(row.id);
      await printVendorPoReturnChallan(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to print challan");
    }
  };

  const handleDownload = async (row: VendorPoReturnChallan) => {
    try {
      const full = await vendorPoReturnChallanService.getChallanById(row.id);
      await downloadVendorPoReturnChallanHtml(full);
      toast.success(`${full.challanNumber} downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download challan");
    }
  };

  const handleView = async (row: VendorPoReturnChallan) => {
    try {
      const full = await vendorPoReturnChallanService.getChallanById(row.id);
      setActive(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load challan");
    }
  };

  const applyFilters = () => {
    challans.setFilters({
      ...challans.filters,
      vpoNumber: draftVpo.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header border-b border-gray-100 px-4 py-3 flex flex-wrap justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Return challan history</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">VPRC challans — view, print, update transport</p>
          </div>
          <button
            type="button"
            onClick={() => void challans.refresh()}
            className="text-xs font-semibold text-purple-700 hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="box-body px-4 py-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label htmlFor="challan-vpo-filter" className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                VPO number
              </label>
              <input
                id="challan-vpo-filter"
                type="search"
                value={draftVpo}
                onChange={(e) => setDraftVpo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Filter by VPO"
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs min-w-[180px]"
              />
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-semibold"
            >
              Apply
            </button>
          </div>

          {challans.isLoading ? (
            <p className="text-xs text-gray-500 py-8 text-center">Loading challans…</p>
          ) : challans.error ? (
            <p className="text-xs text-red-600 py-4" role="alert">
              {challans.error}
            </p>
          ) : challans.results.length === 0 ? (
            <p className="text-xs text-gray-500 py-8 text-center">No return challans match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]" aria-label="Vendor PO return challan history">
                <thead>
                  <tr className="bg-gray-50 border-b text-[10px] uppercase text-gray-600">
                    <th className="text-left px-2 py-2">Challan</th>
                    <th className="text-left px-2 py-2">Date</th>
                    <th className="text-left px-2 py-2">VPO</th>
                    <th className="text-left px-2 py-2">Vendor</th>
                    <th className="text-left px-2 py-2">Vendor Code</th>
                    <th className="text-right px-2 py-2">Boxes</th>
                    <th className="text-right px-2 py-2">Article Qty</th>
                    <th className="text-right px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.results.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="px-2 py-2 font-mono font-semibold">{row.challanNumber}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{fmtDate(row.challanDate)}</td>
                      <td className="px-2 py-2 font-mono">{row.vpoNumber}</td>
                      <td className="px-2 py-2">{row.vendor?.name || "—"}</td>
                      <td className="px-2 py-2 font-medium text-gray-800">
                        {(row.lines || []).map((l) => l.vendorCode).find(Boolean) ||
                          row.vendor?.vendorCode ||
                          "—"}
                      </td>
                      <td className="px-2 py-2 text-right">{row.totals?.boxCount ?? 0}</td>
                      <td className="px-2 py-2 text-right">{row.totals?.articleQtyCount ?? row.totals?.m4UnitCount ?? 0}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button type="button" onClick={() => void handleView(row)} className="text-purple-700 underline mr-2">
                          View
                        </button>
                        <button type="button" onClick={() => void handlePrint(row)} className="text-gray-700 underline mr-2">
                          Print
                        </button>
                        <button type="button" onClick={() => void handleDownload(row)} className="text-gray-700 underline">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {challans.totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <p className="text-[10px] text-gray-500">
                Page {challans.page} of {challans.totalPages} ({challans.totalResults} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={challans.page <= 1}
                  onClick={() => challans.setPage(challans.page - 1)}
                  className="text-xs px-2 py-1 border rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={challans.page >= challans.totalPages}
                  onClick={() => challans.setPage(challans.page + 1)}
                  className="text-xs px-2 py-1 border rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <VendorPoReturnChallanDetailDrawer
        challan={active}
        onClose={() => setActive(null)}
        onUpdated={(updated) => setActive(updated)}
      />
    </div>
  );
}
