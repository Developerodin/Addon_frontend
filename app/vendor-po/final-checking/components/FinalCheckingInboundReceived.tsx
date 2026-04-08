"use client";

import React, { useMemo } from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { ReceivedDataRow } from "@/shared/services/vendorProductionFlowService";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";
import { styleOptionId } from "../../utils/transferredStyleRows";

function labelReceivedRow(row: ReceivedDataRow, styleOptions: StyleCodeByVendorRow[]): string {
  const sid = (row.styleCode ?? "").trim();
  if (!sid) return row.brand?.trim() || "Unassigned";
  const opt = styleOptions.find((o) => styleOptionId(o) === sid);
  if (opt) return `${opt.styleCode} — ${opt.brand}`;
  const b = row.brand?.trim();
  return b ? `${b} (${sid.slice(0, 8)}…)` : `${sid.slice(0, 8)}…`;
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

    const rows = Array.from(byKey.values()).map((r) => {
      if (!r.styleCodeId) return { ...r, label: "Unassigned" as const };
      const opt = styleOptions.find((o) => styleOptionId(o) === r.styleCodeId);
      if (opt) return { ...r, label: `${opt.styleCode} — ${opt.brand}` };
      const fallbackBrand = r.brand ? ` — ${r.brand}` : "";
      return { ...r, label: `${r.styleCodeId.slice(0, 8)}…${fallbackBrand}` };
    });

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
            Style-wise inbound summary
          </div>
          <div className="p-2 space-y-1">
            {summary.map((s) => (
              <div
                key={s.key}
                className="text-[10px] text-gray-700 bg-white border border-gray-100 rounded px-2 py-1.5 flex flex-wrap justify-between gap-2"
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-gray-500">
                  lines {s.lines.toLocaleString()}
                  {s.transferredSum > 0 ? ` · line transferred ${s.transferredSum.toLocaleString()}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
        {receivedData.map((row, i) => (
          <div
            key={i}
            className="text-[10px] text-gray-700 bg-white border border-gray-100 rounded px-2 py-1.5 flex flex-wrap justify-between gap-2"
          >
            <span className="font-medium">{labelReceivedRow(row, styleOptions)}</span>
            <span className="text-gray-500">
              {(row.transferred ?? 0) > 0 ? `line ${(row.transferred ?? 0).toLocaleString()} · ` : ""}
              {row.receivedStatusFromPreviousFloor ? ` ${row.receivedStatusFromPreviousFloor}` : ""}
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
