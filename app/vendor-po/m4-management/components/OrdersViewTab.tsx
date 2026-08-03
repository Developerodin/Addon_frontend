"use client";

import React, { useMemo, useState } from "react";
import type { VendorM4FlowRow, VendorM4Snapshot } from "@/shared/services/vendorM2M3M4ManagementService";
import { getVendorFlowRowId } from "@/app/vendor-po/utils/getVendorFlowRowId";
import ArticleProductImageButton from "@/shared/components/production/ArticleProductImageButton";
import {
  collectFactoryCodesFromProductFactoryCodes,
  useArticleProductImages,
} from "@/shared/hooks/useArticleProductImages";
import { getVendorRowProductFactoryCode } from "@/app/vendor-po/utils/getVendorProductFactoryCode";

export interface OrdersViewTabProps {
  rows: VendorM4FlowRow[];
  isLoading?: boolean;
  onView: (row: VendorM4FlowRow) => void;
  onOutward: (row: VendorM4FlowRow) => void;
}

interface VpoGroup {
  vpoNumber: string;
  flows: VendorM4FlowRow[];
  totals: VendorM4Snapshot;
}

/**
 * Sum M4 snapshots across flows in a VPO group.
 * @param flows - Flows under one VPO
 */
function sumSnapshots(flows: VendorM4FlowRow[]): VendorM4Snapshot {
  const byFloor = { finalChecking: 0 };
  let onHand = 0;
  let outwardTotal = 0;
  let availableForOutward = 0;

  for (const flow of flows) {
    const s = flow.m4Snapshot;
    byFloor.finalChecking += s.byFloor.finalChecking;
    onHand += s.onHand;
    outwardTotal += s.outwardTotal;
    availableForOutward += s.availableForOutward;
  }

  return { byFloor, onHand, outwardTotal, availableForOutward };
}

/**
 * VPO tab — group flows by VPO with M4 totals.
 */
export default function OrdersViewTab({
  rows,
  isLoading = false,
  onView,
  onOutward,
}: OrdersViewTabProps) {
  const [search, setSearch] = useState("");
  const [expandedVpos, setExpandedVpos] = useState<Set<string>>(new Set());

  const vpoGroups = useMemo((): VpoGroup[] => {
    const map = new Map<string, VpoGroup>();

    for (const row of rows) {
      const vpo = row.vpoNumber || "—";
      if (!map.has(vpo)) {
        map.set(vpo, {
          vpoNumber: vpo,
          flows: [],
          totals: { byFloor: { finalChecking: 0 }, onHand: 0, outwardTotal: 0, availableForOutward: 0 },
        });
      }
      map.get(vpo)!.flows.push(row);
    }

    return Array.from(map.values())
      .map((g) => ({ ...g, totals: sumSnapshots(g.flows) }))
      .sort((a, b) => a.vpoNumber.localeCompare(b.vpoNumber));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vpoGroups;
    const q = search.trim().toLowerCase();
    return vpoGroups.filter(
      (g) =>
        g.vpoNumber.toLowerCase().includes(q) ||
        g.flows.some(
          (f) =>
            f.referenceCode.toLowerCase().includes(q) ||
            (f.productFactoryCode ?? "").toLowerCase().includes(q),
        )
    );
  }, [vpoGroups, search]);

  const toggleVpo = (vpoNumber: string) => {
    setExpandedVpos((prev) => {
      const next = new Set(prev);
      if (next.has(vpoNumber)) next.delete(vpoNumber);
      else next.add(vpoNumber);
      return next;
    });
  };

  const factoryCodes = useMemo(
    () => collectFactoryCodesFromProductFactoryCodes(rows),
    [rows],
  );
  const { openProductImage, productImageModal } = useArticleProductImages(factoryCodes);

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search VPO or reference…"
        className="w-full max-w-md py-1.5 px-2 text-[11px] border border-gray-300 rounded mb-3"
        aria-label="Search vendor M4 VPO groups"
      />

      <div className="border border-gray-300 rounded overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-[10px] min-w-[760px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 w-8" aria-label="Expand" />
              <th className="border border-gray-300 px-1 py-1 text-left">VPO</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Reference</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-red-50 text-red-800">FC M4</th>
              <th className="border border-gray-300 px-1 py-1 text-right">On hand</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Outward</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Available</th>
              <th className="border border-gray-300 px-1 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              <tr><td colSpan={8} className="border border-gray-300 px-2 py-6 text-center text-gray-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="border border-gray-300 px-2 py-6 text-center text-gray-500">No VPOs with M4 activity</td></tr>
            ) : (
              filtered.map((group) => {
                const expanded = expandedVpos.has(group.vpoNumber);
                const t = group.totals;

                return (
                  <React.Fragment key={group.vpoNumber}>
                    <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer font-semibold" onClick={() => toggleVpo(group.vpoNumber)}>
                      <td className="border border-gray-300 px-1 py-1 text-center"><span aria-hidden="true">{expanded ? "▼" : "▶"}</span></td>
                      <td className="border border-gray-300 px-1 py-1" colSpan={2}>
                        {group.vpoNumber}
                        <span className="text-[9px] text-gray-500 ml-1">({group.flows.length} flow{group.flows.length !== 1 ? "s" : ""})</span>
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/60">{t.byFloor.finalChecking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right">{t.onHand}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right text-red-700">{t.outwardTotal}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right text-red-800">{t.availableForOutward}</td>
                      <td className="border border-gray-300 px-1 py-1" />
                    </tr>

                    {expanded &&
                      group.flows.map((row) => {
                        const s = row.m4Snapshot;
                        const rowId = getVendorFlowRowId(row);
                        return (
                          <tr key={rowId} className="hover:bg-gray-50/50">
                            <td className="border border-gray-300 px-1 py-1" />
                            <td className="border border-gray-300 px-1 py-1 text-gray-400 text-[9px] pl-3">{group.vpoNumber}</td>
                            <td className="border border-gray-300 px-1 py-1 font-medium pl-2">
                              {row.referenceCode || "—"}
                              {getVendorRowProductFactoryCode(row) ? (
                                <span className="block text-[9px] font-normal text-purple-700">
                                  {getVendorRowProductFactoryCode(row)}
                                </span>
                              ) : null}
                              {row.productVendorCode ? (
                                <span className="block text-[9px] font-normal text-gray-500">VC: {row.productVendorCode}</span>
                              ) : null}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/30">{s.byFloor.finalChecking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right">{s.onHand}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right text-red-700">{s.outwardTotal}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right text-red-800 font-bold">{s.availableForOutward}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center">
                              <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <ArticleProductImageButton
                                  factoryCode={getVendorRowProductFactoryCode(row)}
                                  onClick={openProductImage}
                                />
                                <button type="button" onClick={() => onView(row)} className="px-1.5 py-0.5 text-[9px] font-bold border border-gray-300 rounded hover:bg-gray-100">View</button>
                                <button type="button" disabled={s.availableForOutward <= 0} onClick={() => onOutward(row)} className="px-1.5 py-0.5 text-[9px] font-bold border border-red-300 text-red-800 rounded hover:bg-red-50 disabled:opacity-40">Outward</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {productImageModal}
    </div>
  );
}
