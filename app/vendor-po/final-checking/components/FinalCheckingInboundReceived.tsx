"use client";

import React, { useMemo } from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { ReceivedDataRow } from "@/shared/services/vendorProductionFlowService";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";
import { brandLabelForStyleId } from "../../utils/transferredStyleRows";

/**
 * Human label for inbound received row — brand only.
 * @param row - Received data line from API
 * @param styleOptions - Style catalog for lookup
 */
function labelReceivedRow(
  row: ReceivedDataRow,
  styleOptions: StyleCodeByVendorRow[],
): string {
  return brandLabelForStyleId(
    styleOptions,
    String(row.styleCode ?? "").trim(),
    row.brand,
  );
}

type Props = {
  receivedData: ReceivedDataRow[];
  styleOptions: StyleCodeByVendorRow[];
  sectionIndex: string;
};

/** Read-only list of `receivedData` lines from branding (API: group by style id for labels). */
export function FinalCheckingInboundReceived({ receivedData, styleOptions, sectionIndex }: Props) {
  if (!receivedData.length) return null;

  const summary = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; styleCodeId: string; brand: string; lines: number; transferredSum: number }
    >();

    for (const row of receivedData) {
      const styleCodeId = String(row.styleCode ?? "").trim();
      const key = styleCodeId || "__unassigned__";
      const existing = byKey.get(key);
      const transferred = Math.max(0, Number(row.transferred) || 0);

      if (existing) {
        existing.lines += 1;
        existing.transferredSum += transferred;
        continue;
      }

      byKey.set(key, {
        key,
        styleCodeId,
        brand: String(row.brand ?? "").trim(),
        lines: 1,
        transferredSum: transferred,
      });
    }

    const rows = Array.from(byKey.values()).map((r) => ({
      ...r,
      label: labelReceivedRow(
        { styleCode: r.styleCodeId, brand: r.brand },
        styleOptions,
      ),
    }));

    rows.sort((a, b) => {
      if (a.styleCodeId === "" && b.styleCodeId !== "") return 1;
      if (a.styleCodeId !== "" && b.styleCodeId === "") return -1;
      return b.transferredSum - a.transferredSum;
    });

    return rows;
  }, [receivedData, styleOptions]);

  return (
    <div className={CRM.drawerSection}>
      <div className={CRM.drawerSectionHead}>
        {sectionIndex}. Inbound from branding (receivedData)
      </div>
      <div className="p-3 space-y-3">
        <div className="border border-gray-100 rounded bg-gray-50/60 overflow-hidden">
          <div className="px-2 py-1.5 text-[10px] font-bold text-gray-700 bg-white border-b border-gray-100">
            Brand-wise inbound summary
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[10px] uppercase text-gray-500 border-b border-gray-100">
                <th className="px-2 py-1.5">Brand</th>
                <th className="px-2 py-1.5 text-right">Qty</th>
                <th className="px-2 py-1.5 text-right">Lines</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.key} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{r.label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-bold">
                    {r.transferredSum.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{r.lines}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
