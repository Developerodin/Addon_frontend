"use client";

import React, { useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import type { GapReportRow } from "../types";

// Mock gap report data (stock vs orders shortage)
const MOCK_GAP_ROWS: GapReportRow[] = [
  { styleCode: "STY-001", itemName: "Premium Cotton T-Shirt", currentStock: 45, ordersQty: 120, requiredQty: 120, shortage: 75, factoryDispatchDate: "2024-02-25" },
  { styleCode: "STY-002", itemName: "Denim Jeans Regular", currentStock: 30, ordersQty: 80, requiredQty: 80, shortage: 50, factoryDispatchDate: "2024-02-28" },
  { styleCode: "STY-003", itemName: "Leather Jacket Black", currentStock: 12, ordersQty: 25, requiredQty: 25, shortage: 13, factoryDispatchDate: "2024-03-01" },
  { styleCode: "STY-004", itemName: "Running Shoes White", currentStock: 0, ordersQty: 60, requiredQty: 60, shortage: 60, factoryDispatchDate: "-" },
  { styleCode: "STY-005", itemName: "Wool Sweater Gray", currentStock: 88, ordersQty: 40, requiredQty: 40, shortage: 0, factoryDispatchDate: "-" },
];

export default function GapReportPage() {
  const [rows, setRows] = useState<GapReportRow[]>(MOCK_GAP_ROWS);
  const [sending, setSending] = useState<string | null>(null);

  const totalShortage = useMemo(() => rows.reduce((s, r) => s + r.shortage, 0), [rows]);
  const rowsWithShortage = useMemo(() => rows.filter((r) => r.shortage > 0), [rows]);

  const handleSendRequirement = async (styleCode: string) => {
    setSending(styleCode);
    try {
      // Mock API: send requirement request to factory
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`Requirement request sent to factory for ${styleCode}`);
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
      await new Promise((r) => setTimeout(r, 800));
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
                className="ti-btn ti-btn-primary ti-btn-sm"
              >
                {sending === "all" ? (
                  <i className="ri-loader-4-line animate-spin me-1"></i>
                ) : (
                  <i className="ri-send-plane-line me-1"></i>
                )}
                Send requirement to factory (all)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Gap Report</h3>
        </div>
        <div className="box-body">
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
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
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
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      {row.shortage > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSendRequirement(row.styleCode)}
                          disabled={sending !== null}
                          className="ti-btn ti-btn-primary ti-btn-sm"
                        >
                          {sending === row.styleCode ? (
                            <i className="ri-loader-4-line animate-spin me-1"></i>
                          ) : (
                            <i className="ri-send-plane-line me-1"></i>
                          )}
                          Send request
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
        </div>
      </div>
    </>
  );
}
