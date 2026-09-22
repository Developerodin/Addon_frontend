"use client";

import React, { RefObject, useEffect } from "react";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";
import {
  getVendorBoxId,
  groupVendorBoxesByLot,
  resolveVendorBoxArticleFromPo,
  resolveVendorBoxLineAttrsFromPo,
  validateVendorProcessNum,
} from "./vendorReceiveProcessHelpers";
import { emptyVendorBoxFormRow, type VendorBoxFormRow } from "./vendorReceiveProcessPrintExport";
import { ARTICLE_COLS, BoxArticleAttrCells, VendorReceiveUnassignedBoxes } from "./VendorReceiveUnassignedBoxes";

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
  onResyncLot: (lot: string) => void | Promise<void>;
  resyncingLot: string | null;
  onPrintLot: (lot: string, lotBoxes: VendorBox[]) => void | Promise<void>;
  printingLot: string | null;
  selectedBoxIds: Record<string, boolean>;
  onToggleBox: (id: string) => void;
  onToggleBoxes: (list: VendorBox[]) => void;
  qzReady: boolean;
  barcodeRef: RefObject<HTMLInputElement>;
  barcodeScanValue: string;
  setBarcodeScanValue: (v: string) => void;
  onBarcodeKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function VendorReceiveProcessBoxTables({
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
  onResyncLot,
  resyncingLot,
  onPrintLot,
  printingLot,
  selectedBoxIds,
  onToggleBox,
  onToggleBoxes,
  qzReady,
  barcodeRef,
  barcodeScanValue,
  setBarcodeScanValue,
  onBarcodeKey,
}: Props) {
  const boxesByLot = groupVendorBoxesByLot(boxes, boxData);
  const inputBase =
    "w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300";

  useEffect(() => {
    if (!activeBoxId) return;
    const focusUnitsInput = () => {
      const selector = `input[data-vb-w="${activeBoxId}"]`;
      const input = document.querySelector<HTMLInputElement>(selector);
      if (!input) return;
      input.focus();
      input.select();
    };
    const raf = window.requestAnimationFrame(focusUnitsInput);
    return () => window.cancelAnimationFrame(raf);
  }, [activeBoxId]);

  /**
   * Sync article attrs when product name changes on unassigned boxes.
   * @param bid - Box document id
   * @param row - Current row state
   * @param productName - Updated product name
   */
  const applyProductNameWithAttrs = (bid: string, row: VendorBoxFormRow, productName: string) => {
    const attrs = resolveVendorBoxLineAttrsFromPo(apiPo, productName, row.lotNumber);
    setBoxData((p) => ({
      ...p,
      [bid]: {
        ...row,
        productName,
        articleCode: attrs.code || row.articleCode,
        type: attrs.type || row.type,
        color: attrs.color || row.color,
        pattern: attrs.pattern || row.pattern,
      },
    }));
  };

  return (
    <div className="p-[10px] border-t border-gray-100">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-gray-800">Boxes ({boxes.length})</h3>
        <button
          type="button"
          onClick={() => onToggleBoxes(boxes)}
          className="text-[10px] font-bold text-purple-700 hover:text-purple-800"
        >
          {boxes.length > 0 && boxes.every((b) => selectedBoxIds[getVendorBoxId(b)]) ? "Clear selection" : "Select all"}
        </button>
      </div>
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Scan Barcode</label>
        <input
          ref={barcodeRef}
          type="text"
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
          placeholder="Scan or type barcode, Enter to activate row"
          value={barcodeScanValue}
          onChange={(e) => setBarcodeScanValue(e.target.value)}
          onKeyDown={onBarcodeKey}
        />
      </div>
      {activeBoxId && (
        <p className="text-[10px] text-purple-700 mb-2 flex items-center gap-2">
          <i className="ri-edit-line" />
          Enter units, then Save.
        </p>
      )}

      {boxesByLot.sortedLots.map((lot) => {
        const lotBoxes = boxesByLot.grouped[lot] || [];
        const lotLocked = lotBoxes.some(
          (b) => b.secondaryCheckingAccepted || b.storedStatus || b.returnedToVendor
        );
        const isResyncing = resyncingLot === lot;
        return (
        <div key={lot} className="mb-4 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-gray-800">
              Invoice {lot}
              <span className="ml-1.5 font-medium text-gray-500">({lotBoxes.length} box{lotBoxes.length === 1 ? "" : "es"})</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onPrintLot(lot, lotBoxes)}
                disabled={!qzReady || printingLot === lot}
                title={!qzReady ? "Start QZ Tray and select a printer" : `Print barcodes for invoice ${lot}`}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                  qzReady && printingLot !== lot
                    ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <i className={`text-xs ${printingLot === lot ? "ri-loader-4-line animate-spin" : "ri-printer-line"}`} />
                {printingLot === lot ? "Printing…" : "Print barcodes"}
              </button>
              <button
                type="button"
                onClick={() => void onResyncLot(lot)}
                disabled={lotLocked || isResyncing}
                title={
                  lotLocked
                    ? "Cannot re-create: a box in this invoice is already scanned/stored/returned"
                    : "Delete and recreate this invoice's boxes split by article"
                }
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                  lotLocked
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                <i className={`ri-refresh-line text-xs ${isResyncing ? "animate-spin" : ""}`} />
                {isResyncing ? "Re-creating…" : "Re-create boxes"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-2 text-center border border-gray-200 w-8">
                    <input
                      type="checkbox"
                      checked={lotBoxes.length > 0 && lotBoxes.every((b) => selectedBoxIds[getVendorBoxId(b)])}
                      onChange={() => onToggleBoxes(lotBoxes)}
                      aria-label={`Select all boxes for invoice ${lot}`}
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
                {boxesByLot.grouped[lot]?.map((box) => {
                  const bid = getVendorBoxId(box);
                  const isActive = activeBoxId === bid;
                  const d = boxData[bid] || emptyVendorBoxFormRow();
                  // Resolve each box's own article (from its vendorPoItemId/productName),
                  // not the lot's first article, so multi-article invoices show correctly.
                  const art = resolveVendorBoxArticleFromPo(apiPo, box);
                  const displayRow: VendorBoxFormRow = {
                    ...d,
                    productName: d.productName || art.productName || box.productName || "",
                    articleCode: d.articleCode || art.code || "",
                    type: d.type || art.type || "",
                    color: d.color || art.color || "",
                    pattern: d.pattern || art.pattern || "",
                  };
                  return (
                    <tr
                      key={bid}
                      className={`hover:bg-gray-50/50 ${isActive ? "!bg-sky-50 ring-1 ring-inset ring-purple-200" : ""}`}
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
                      <td className="px-1.5 py-2 text-[10px] text-gray-700 border border-gray-200 font-mono">
                        {box.barcode || "—"}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                        <span>{displayRow.productName || "—"}</span>
                      </td>
                      <BoxArticleAttrCells row={displayRow} />
                      <td className="px-1.5 py-2 text-right text-[11px] text-gray-700 border border-gray-200">
                        {isActive ? (
                          <input
                            data-vb-w={bid}
                            className={`${inputBase} text-right`}
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
      })}

      <VendorReceiveUnassignedBoxes
        apiPo={apiPo}
        boxes={boxesByLot.unassigned}
        boxData={boxData}
        setBoxData={setBoxData}
        rawInput={rawInput}
        setRawInput={setRawInput}
        activeBoxId={activeBoxId}
        setActiveBoxId={setActiveBoxId}
        updatingId={updatingId}
        saveBox={saveBox}
        onPrintLot={onPrintLot}
        printingLot={printingLot}
        qzReady={qzReady}
        selectedBoxIds={selectedBoxIds}
        onToggleBox={onToggleBox}
        onToggleBoxes={onToggleBoxes}
        inputBase={inputBase}
        applyProductNameWithAttrs={applyProductNameWithAttrs}
      />
    </div>
  );
}
