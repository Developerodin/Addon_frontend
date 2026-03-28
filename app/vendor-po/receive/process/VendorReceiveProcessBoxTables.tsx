"use client";

import React, { RefObject } from "react";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";
import {
  getVendorBoxId,
  getVendorPoItemOptionsForLot,
  groupVendorBoxesByLot,
  validateVendorProcessNum,
} from "./vendorReceiveProcessHelpers";
import type { VendorBoxFormRow } from "./vendorReceiveProcessPrintExport";

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
  barcodeRef,
  barcodeScanValue,
  setBarcodeScanValue,
  onBarcodeKey,
}: Props) {
  const boxesByLot = groupVendorBoxesByLot(boxes, boxData);
  const inputBase = "w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300";

  return (
    <div className="p-[10px] border-t border-gray-100">
      <h3 className="text-xs font-bold text-gray-800 mb-2">Boxes ({boxes.length})</h3>
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

      {boxesByLot.sortedLots.map((lot) => (
        <div key={lot} className="mb-4 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-800 border-b border-gray-100">Invoice {lot}</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box ID</th>
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Product</th>
                  <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Units</th>
                  <th className="px-1.5 py-2 text-center text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-[72px]" />
                </tr>
              </thead>
              <tbody>
                {boxesByLot.grouped[lot]?.map((box) => {
                  const bid = getVendorBoxId(box);
                  const isActive = activeBoxId === bid;
                  const d = boxData[bid] || {
                    productName: "",
                    articleCode: "",
                    lotNumber: "",
                    numberOfUnits: "",
                  };
                  const opts = getVendorPoItemOptionsForLot(apiPo, d.lotNumber || lot);
                  return (
                    <tr key={bid} className={`hover:bg-gray-50/50 ${isActive ? "!bg-sky-50 ring-1 ring-inset ring-purple-200" : ""}`}>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 font-mono">{box.boxId || bid.slice(-8)}</td>
                      <td className="px-1.5 py-2 text-[10px] text-gray-700 border border-gray-200 font-mono">{box.barcode || "—"}</td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                        {opts.length > 1 ? (
                          <select
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            value={d.productName}
                            onChange={(e) => {
                              const sel = opts.find((o) => o.productName === e.target.value);
                              setBoxData((p) => ({
                                ...p,
                                [bid]: { ...d, productName: e.target.value, articleCode: sel?.code || "" },
                              }));
                            }}
                          >
                            <option value="">Select</option>
                            {opts.map((o) => (
                              <option key={o.productName + o.code} value={o.productName}>
                                {o.productName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{d.productName || box.productName || "—"}</span>
                        )}
                      </td>
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
                          <button type="button" className="text-purple-600 hover:text-purple-700 text-[10px] font-bold" onClick={() => setActiveBoxId(bid)}>
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
      ))}

      {boxesByLot.unassigned.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/30 shadow-sm">
          <div className="bg-amber-100 px-3 py-2 text-[11px] font-bold border-b border-amber-200 text-amber-900">
            Unassigned to invoice ({boxesByLot.unassigned.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box ID</th>
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Invoice *</th>
                  <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Product</th>
                  <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Units</th>
                  <th className="px-1.5 py-2 text-center text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-[72px]" />
                </tr>
              </thead>
              <tbody>
                {boxesByLot.unassigned.map((box) => {
                  const bid = getVendorBoxId(box);
                  const isActive = activeBoxId === bid;
                  const d = boxData[bid] || {
                    productName: box.productName || "",
                    articleCode: "",
                    lotNumber: box.lotNumber || "",
                    numberOfUnits: "",
                  };
                  return (
                    <tr key={bid} className={`hover:bg-gray-50/50 ${isActive ? "!bg-amber-50 ring-1 ring-inset ring-amber-300" : ""}`}>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 font-mono">{box.boxId || bid.slice(-8)}</td>
                      <td className="px-1.5 py-2 text-[10px] text-gray-700 border border-gray-200 font-mono">{box.barcode || "—"}</td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                        <input
                          className={inputBase}
                          placeholder="Invoice #"
                          value={d.lotNumber}
                          onChange={(e) =>
                            setBoxData((p) => ({
                              ...p,
                              [bid]: { ...d, lotNumber: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                        <input
                          className={inputBase}
                          placeholder="Product name"
                          value={d.productName}
                          onChange={(e) =>
                            setBoxData((p) => ({
                              ...p,
                              [bid]: { ...d, productName: e.target.value },
                            }))
                          }
                        />
                      </td>
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
                          <button type="button" className="text-purple-600 hover:text-purple-700 text-[10px] font-bold" onClick={() => setActiveBoxId(bid)}>
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
      )}
    </div>
  );
}
