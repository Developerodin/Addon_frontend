"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import type { GapReportRow } from "../types";
import { whmsGapReport } from "@/shared/services/whmsService";

function mapRow(r: { styleCode: string; itemName: string; currentStock: number; ordersQty: number; requiredQty: number; shortage: number; factoryDispatchDate: string | null }): GapReportRow {
  return {
    styleCode: r.styleCode,
    itemName: r.itemName,
    currentStock: r.currentStock,
    ordersQty: r.ordersQty,
    requiredQty: r.requiredQty,
    shortage: r.shortage,
    factoryDispatchDate: r.factoryDispatchDate ?? "-",
  };
}

export default function GapReportPage() {
  const [rows, setRows] = useState<GapReportRow[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await whmsGapReport.get();
      setRows(Array.isArray(data) ? data.map(mapRow) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gap report");
      toast.error("Failed to load gap report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const totalShortage = useMemo(() => rows.reduce((s, r) => s + r.shortage, 0), [rows]);
  const rowsWithShortage = useMemo(() => rows.filter((r) => r.shortage > 0), [rows]);

  const handleSendRequirement = async (row: GapReportRow) => {
    setSending(row.styleCode);
    try {
      await whmsGapReport.sendRequirement({
        styleCode: row.styleCode,
        itemName: row.itemName,
        shortage: row.shortage,
        requestedQty: row.shortage,
      });
      toast.success(`Requirement request sent to factory for ${row.styleCode}`);
    } catch {
      toast.error("Failed to send request");
    } finally {
      setSending(null);
    }
  };

  const handleSendAll = async () => {
    if (rowsWithShortage.length === 0) {
      toast("No shortage items to send");
      return;
    }
    setSending("all");
    try {
      await whmsGapReport.sendRequirement(
        rowsWithShortage.map((r) => ({
          styleCode: r.styleCode,
          itemName: r.itemName,
          shortage: r.shortage,
          requestedQty: r.shortage,
        }))
      );
      toast.success(`Requirement request sent for ${rowsWithShortage.length} item(s)`);
    } catch {
      toast.error("Failed to send requests");
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      <Seo title="Gap Report" />
      <div className="box mb-4">
        <div className="box-body">
          <p className="text-sm text-gray-600 mb-2">
            Stock vs orders shortage. Send requirement requests to factory for items with shortage.
          </p>
          {loading ? (
            <p className="text-sm text-gray-500">Loading gap report...</p>
          ) : error ? (
            <div>
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button type="button" onClick={fetchReport} className="ti-btn ti-btn-primary">Retry</button>
            </div>
          ) : (
          <>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[12px] font-bold text-gray-700">
              Items with shortage: <span className="text-purple-600">{rowsWithShortage.length}</span>
            </span>
            <span className="text-[12px] font-bold text-gray-700">
              Total shortage units: <span className="text-red-600">{totalShortage}</span>
            </span>
            {rowsWithShortage.length > 0 && (
              <button
                type="button"
                onClick={handleSendAll}
                disabled={sending !== null}
                className="ti-btn ti-btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 min-h-[36px] text-[12px] font-semibold"
              >
                {sending === "all" ? (
                  <i className="ri-loader-4-line animate-spin text-base"></i>
                ) : (
                  <i className="ri-send-plane-line text-base"></i>
                )}
                <span>Send requirement to factory (all)</span>
              </button>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Gap Report</h3>
        </div>
        <div className="box-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : (
          <div className="overflow-x-auto min-h-[260px]">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Style Code
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Item Name
                  </th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Current Stock
                  </th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Orders Qty
                  </th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Required Qty
                  </th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Shortage
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Factory Dispatch Date
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 min-w-[140px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.styleCode} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      {row.styleCode}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">
                      {row.itemName}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-800 text-right border border-gray-200">
                      {row.currentStock}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-800 text-right border border-gray-200">
                      {row.ordersQty}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-800 text-right border border-gray-200">
                      {row.requiredQty}
                    </td>
                    <td className="px-1.5 py-2.5 text-right border border-gray-200">
                      <span
                        className={
                          row.shortage > 0
                            ? "text-red-600 font-bold text-[12px]"
                            : "text-green-600 font-medium text-[12px]"
                        }
                      >
                        {row.shortage}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {row.factoryDispatchDate}
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200 align-middle">
                      {row.shortage > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSendRequirement(row)}
                          disabled={sending !== null}
                          className="ti-btn ti-btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap px-3 py-2 min-h-[32px] min-w-[120px] text-[11px] font-semibold"
                        >
                          {sending === row.styleCode ? (
                            <i className="ri-loader-4-line animate-spin flex-shrink-0"></i>
                          ) : (
                            <i className="ri-send-plane-line flex-shrink-0"></i>
                          )}
                          <span>Send request</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
