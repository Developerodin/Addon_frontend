"use client";

import React from "react";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";
import { dashOr } from "../../components/vendorPacklistHelpers";
import { getVendorBoxId, resolveVendorBoxLineAttrsFromPo, validateVendorProcessNum } from "./vendorReceiveProcessHelpers";
import { emptyVendorBoxFormRow, type VendorBoxFormRow } from "./vendorReceiveProcessPrintExport";

export const ARTICLE_COLS = (
  <>
    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
      Vendor code
    </th>
    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
      Type
    </th>
    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
      Color
    </th>
    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
      Pattern
    </th>
  </>
);

/** Read-only article attribute cells for a box row. */
export function BoxArticleAttrCells({ row }: { row: VendorBoxFormRow }) {
  return (
    <>
      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
        {row.articleCode?.trim() || "no vendor code"}
      </td>
      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(row.type)}</td>
      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(row.color)}</td>
      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(row.pattern)}</td>
    </>
  );
}

type Props = {
  apiPo: VendorPurchaseOrder;
  boxes: VendorBox[];
  boxData: Record<string, VendorBoxFormRow>;
  setBoxData: React.Dispatch<React.SetStateAction<Record<string, VendorBoxFormRow>>>;
  rawInput: Record<string, string>;
  setRawInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activeBoxId: string | null;
  setActiveBoxId: (id: string | null) => void;
  updatingId: string | null;
  saveBox: (box: VendorBox) => void | Promise<void>;
  onPrintLot: (lot: string, lotBoxes: VendorBox[]) => void | Promise<void>;
  printingLot: string | null;
  qzReady: boolean;
  selectedBoxIds: Record<string, boolean>;
  onToggleBox: (id: string) => void;
  onToggleBoxes: (list: VendorBox[]) => void;
  inputBase: string;
  applyProductNameWithAttrs: (bid: string, row: VendorBoxFormRow, productName: string) => void;
};

/** Boxes that are not tied to an invoice yet, with selection for partial barcode print. */
export function VendorReceiveUnassignedBoxes({
  apiPo,
  boxes,
  boxData,
  setBoxData,
  rawInput,
  setRawInput,
  activeBoxId,
  setActiveBoxId,
  updatingId,
  saveBox,
  onPrintLot,
  printingLot,
  qzReady,
  selectedBoxIds,
  onToggleBox,
  onToggleBoxes,
  inputBase,
  applyProductNameWithAttrs,
}: Props) {
  if (boxes.length === 0) return null;
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/30 shadow-sm">
      <div className="bg-amber-100 px-3 py-2 border-b border-amber-200 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-amber-900">Unassigned to invoice ({boxes.length})</span>
        <button
          type="button"
          onClick={() => void onPrintLot("__unassigned__", boxes)}
          disabled={!qzReady || printingLot === "__unassigned__"}
          title={!qzReady ? "Start QZ Tray and select a printer" : "Print barcodes for unassigned boxes"}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${
            qzReady && printingLot !== "__unassigned__"
              ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <i className={`text-xs ${printingLot === "__unassigned__" ? "ri-loader-4-line animate-spin" : "ri-printer-line"}`} />
          {printingLot === "__unassigned__" ? "Printing…" : "Print barcodes"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="px-1.5 py-2 text-center border border-gray-200 w-8">
                <input
                  type="checkbox"
                  checked={boxes.length > 0 && boxes.every((b) => selectedBoxIds[getVendorBoxId(b)])}
                  onChange={() => onToggleBoxes(boxes)}
                  aria-label="Select all unassigned boxes"
                  className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Box ID
              </th>
              <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Barcode
              </th>
              <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Invoice *
              </th>
              <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Product
              </th>
              {ARTICLE_COLS}
              <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Units
              </th>
              <th className="px-1.5 py-2 text-center text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-[72px]" />
            </tr>
          </thead>
          <tbody>
            {boxes.map((box) => {
              const bid = getVendorBoxId(box);
              const isActive = activeBoxId === bid;
              const d = boxData[bid] || {
                ...emptyVendorBoxFormRow(),
                productName: box.productName || "",
                lotNumber: box.lotNumber || "",
              };
              return (
                <tr
                  key={bid}
                  className={`hover:bg-gray-50/50 ${isActive ? "!bg-amber-50 ring-1 ring-inset ring-amber-300" : ""}`}
                >
                  <td className="px-1.5 py-2 text-center border border-gray-200">
                    <input
                      type="checkbox"
                      checked={!!selectedBoxIds[bid]}
                      onChange={() => onToggleBox(bid)}
                      aria-label={`Select box ${box.boxId || bid}`}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 font-mono">
                    {box.boxId || bid.slice(-8)}
                  </td>
                  <td className="px-1.5 py-2 text-[10px] text-gray-700 border border-gray-200 font-mono">{box.barcode || "—"}</td>
                  <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                    <input
                      className={inputBase}
                      placeholder="Invoice #"
                      aria-label={`Invoice for box ${box.boxId || bid}`}
                      value={d.lotNumber}
                      onChange={(e) => {
                        const lotNumber = e.target.value;
                        const attrs = resolveVendorBoxLineAttrsFromPo(apiPo, d.productName, lotNumber);
                        setBoxData((p) => ({
                          ...p,
                          [bid]: {
                            ...d,
                            lotNumber,
                            articleCode: attrs.code || d.articleCode,
                            type: attrs.type || d.type,
                            color: attrs.color || d.color,
                            pattern: attrs.pattern || d.pattern,
                          },
                        }));
                      }}
                    />
                  </td>
                  <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                    <input
                      className={inputBase}
                      placeholder="Product name"
                      aria-label={`Product for box ${box.boxId || bid}`}
                      value={d.productName}
                      onChange={(e) => applyProductNameWithAttrs(bid, d, e.target.value)}
                    />
                  </td>
                  <BoxArticleAttrCells row={d} />
                  <td className="px-1.5 py-2 text-right text-[11px] text-gray-700 border border-gray-200">
                    {isActive ? (
                      <input
                        data-vb-w={bid}
                        className={`${inputBase} text-right`}
                        aria-label={`Units for box ${box.boxId || bid}`}
                        value={rawInput[`u-${bid}`] ?? d.numberOfUnits}
                        onChange={(e) => {
                          const v = validateVendorProcessNum(e.target.value);
                          setRawInput((r) => ({ ...r, [`u-${bid}`]: v }));
                          setBoxData((p) => ({ ...p, [bid]: { ...d, numberOfUnits: v } }));
                        }}
                        onBlur={() =>
                          setRawInput((r) => {
                            const x = { ...r };
                            delete x[`u-${bid}`];
                            return x;
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          void saveBox(box);
                        }}
                      />
                    ) : (
                      d.numberOfUnits || "—"
                    )}
                  </td>
                  <td className="px-1.5 py-2 text-center border border-gray-200">
                    {isActive ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-6 px-2 text-[10px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                        disabled={updatingId === bid}
                        onClick={() => void saveBox(box)}
                      >
                        {updatingId === bid ? "…" : "Save"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-purple-600 hover:text-purple-700 text-[10px] font-bold"
                        onClick={() => setActiveBoxId(bid)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
