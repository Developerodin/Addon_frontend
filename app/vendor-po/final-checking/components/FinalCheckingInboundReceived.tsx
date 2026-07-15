"use client";

import React, { useMemo } from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { ReceivedDataRow, VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";
import { brandLabelForStyleId } from "../../utils/transferredStyleRows";
import { enrichReceivedDataForDisplay } from "../finalCheckingInboundAggregates";

type InboundChannel = "Heat Transfer" | "Embroidery" | "Unspecified";

/**
 * Resolve inbound channel label for a received line.
 * @param row - Received data line from API
 */
function inboundChannel(row: ReceivedDataRow): InboundChannel {
  const bt = String(row.brandingType ?? "").trim();
  if (bt === "Heat Transfer" || bt === "Embroidery") return bt;
  return "Unspecified";
}

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
  /** Flow context for legacy HT inference on receivedData without brandingType. */
  flow?: VendorProductionFlow | null;
};

/** Read-only inbound summary grouped by branding channel (HT vs Embroidery). */
export function FinalCheckingInboundReceived({ receivedData, styleOptions, sectionIndex, flow }: Props) {
  if (!receivedData.length) return null;

  const { byChannel, totalQty } = useMemo(() => {
    const enriched = enrichReceivedDataForDisplay(receivedData, flow);
    type RowAgg = {
      key: string;
      styleCodeId: string;
      brand: string;
      channel: InboundChannel;
      lines: number;
      transferredSum: number;
      label: string;
    };

    const map = new Map<string, RowAgg>();

    for (const row of enriched) {
      const styleCodeId = String(row.styleCode ?? "").trim();
      const brand = String(row.brand ?? "").trim();
      const channel = inboundChannel(row);
      const key = `${styleCodeId}\u0000${brand}\u0000${channel}`;
      const transferred = Math.max(0, Number(row.transferred) || 0);
      const existing = map.get(key);

      if (existing) {
        existing.lines += 1;
        existing.transferredSum += transferred;
        continue;
      }

      map.set(key, {
        key,
        styleCodeId,
        brand,
        channel,
        lines: 1,
        transferredSum: transferred,
        label: labelReceivedRow(row, styleOptions),
      });
    }

    const rows = Array.from(map.values()).sort((a, b) => {
      const channelOrder = (c: InboundChannel) =>
        c === "Heat Transfer" ? 0 : c === "Embroidery" ? 1 : 2;
      const d = channelOrder(a.channel) - channelOrder(b.channel);
      if (d !== 0) return d;
      return b.transferredSum - a.transferredSum;
    });

    const channelTotals = {
      ht: rows
        .filter((r) => r.channel === "Heat Transfer")
        .reduce((s, r) => s + r.transferredSum, 0),
      emb: rows
        .filter((r) => r.channel === "Embroidery")
        .reduce((s, r) => s + r.transferredSum, 0),
      other: rows
        .filter((r) => r.channel === "Unspecified")
        .reduce((s, r) => s + r.transferredSum, 0),
    };

    return {
      byChannel: { rows, channelTotals },
      totalQty: rows.reduce((s, r) => s + r.transferredSum, 0),
    };
  }, [receivedData, styleOptions, flow]);

  return (
    <div className={CRM.drawerSection}>
      <div className={CRM.drawerSectionHead}>
        {sectionIndex}. Inbound received (by channel)
      </div>
      <div className="p-3 space-y-3">
        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
          <span className="px-2 py-1 rounded bg-sky-50 text-sky-800 border border-sky-100">
            Heat Transfer: {byChannel.channelTotals.ht.toLocaleString()}
          </span>
          <span className="px-2 py-1 rounded bg-violet-50 text-violet-800 border border-violet-100">
            Embroidery: {byChannel.channelTotals.emb.toLocaleString()}
          </span>
          {byChannel.channelTotals.other > 0 ? (
            <span className="px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
              Unspecified: {byChannel.channelTotals.other.toLocaleString()}
            </span>
          ) : null}
          <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
            Total: {totalQty.toLocaleString()}
          </span>
        </div>

        <div className="border border-gray-100 rounded bg-gray-50/60 overflow-hidden">
          <div className="px-2 py-1.5 text-[10px] font-bold text-gray-700 bg-white border-b border-gray-100">
            Brand-wise inbound summary
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[10px] uppercase text-gray-500 border-b border-gray-100">
                <th className="px-2 py-1.5">Brand</th>
                <th className="px-2 py-1.5">Channel</th>
                <th className="px-2 py-1.5 text-right">Qty</th>
                <th className="px-2 py-1.5 text-right">Lines</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.rows.map((r) => (
                <tr key={r.key} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{r.label}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.channel}</td>
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
