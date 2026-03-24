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
import { CRM } from "../../vendor-list/crmUiClasses";

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
  isFetchingWeight: boolean;
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
  isFetchingWeight,
}: Props) {
  const boxesByLot = groupVendorBoxesByLot(boxes, boxData);

  return (
    <div className={`${CRM.cardBody} border-t border-gray-100`}>
      <h3 className="text-xs font-bold text-gray-800 mb-2">Boxes ({boxes.length})</h3>
      <div className="mb-3">
        <label className={CRM.label}>Scan barcode</label>
        <input
          ref={barcodeRef}
          type="text"
          className={CRM.input}
          placeholder="Scan or type barcode, Enter to activate row"
          value={barcodeScanValue}
          onChange={(e) => setBarcodeScanValue(e.target.value)}
          onKeyDown={onBarcodeKey}
        />
      </div>
      {activeBoxId && (
        <p className="text-[10px] text-purple-700 mb-2 flex items-center gap-2">
          <i className="ri-scales-3-line" />
          {isFetchingWeight
            ? "Reading scale…"
            : "Gross weight can auto-fill from scale; enter net weight & units, then Save."}
        </p>
      )}

      {boxesByLot.sortedLots.map((lot) => (
        <div key={lot} className="mb-4 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-800 border-b border-gray-100">Lot {lot}</div>
          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                  <th className={CRM.th}>Box ID</th>
                  <th className={CRM.th}>Barcode</th>
                  <th className={CRM.th}>Product</th>
                  <th className={CRM.th}>Code</th>
                  <th className={CRM.thRight}>Gross</th>
                  <th className={CRM.thRight}>Net kg</th>
                  <th className={CRM.thRight}>Units</th>
                  <th className={`${CRM.th} text-center w-[72px]`} />
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
                    grossWeight: "",
                    boxWeight: "",
                    numberOfUnits: "",
                  };
                  const opts = getVendorPoItemOptionsForLot(apiPo, d.lotNumber || lot);
                  return (
                    <tr key={bid} className={`${CRM.tbodyTr} ${isActive ? "!bg-sky-50 ring-1 ring-inset ring-purple-200" : ""}`}>
                      <td className={`${CRM.td} font-mono`}>{box.boxId || bid.slice(-8)}</td>
                      <td className={`${CRM.td} font-mono text-[10px]`}>{box.barcode || "—"}</td>
                      <td className={CRM.td}>
                        {opts.length > 1 ? (
                          <select
                            className={CRM.select}
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
                      <td className={CRM.td}>{d.articleCode || "—"}</td>
                      <td className={`${CRM.td} text-right`}>
                        {isActive ? (
                          <input
                            className={CRM.inputTableNum}
                            value={rawInput[`g-${bid}`] ?? d.grossWeight}
                            onChange={(e) => {
                              const v = validateVendorProcessNum(e.target.value);
                              setRawInput((r) => ({ ...r, [`g-${bid}`]: v }));
                              setBoxData((p) => ({ ...p, [bid]: { ...d, grossWeight: v } }));
                            }}
                            onBlur={() =>
                              setRawInput((r) => {
                                const x = { ...r };
                                delete x[`g-${bid}`];
                                return x;
                              })
                            }
                          />
                        ) : (
                          d.grossWeight || "—"
                        )}
                      </td>
                      <td className={`${CRM.td} text-right`}>
                        {isActive ? (
                          <input
                            data-vb-w={bid}
                            className={CRM.inputTableNum}
                            value={rawInput[`w-${bid}`] ?? d.boxWeight}
                            onChange={(e) => {
                              const v = validateVendorProcessNum(e.target.value);
                              setRawInput((r) => ({ ...r, [`w-${bid}`]: v }));
                              setBoxData((p) => ({ ...p, [bid]: { ...d, boxWeight: v } }));
                            }}
                            onBlur={() =>
                              setRawInput((r) => {
                                const x = { ...r };
                                delete x[`w-${bid}`];
                                return x;
                              })
                            }
                          />
                        ) : (
                          d.boxWeight || "—"
                        )}
                      </td>
                      <td className={`${CRM.td} text-right`}>
                        {isActive ? (
                          <input
                            className={CRM.inputTableNumSm}
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
                      <td className={`${CRM.td} text-center`}>
                        {isActive ? (
                          <button
                            type="button"
                            className={CRM.btnPrimarySm}
                            disabled={updatingId === bid}
                            onClick={() => void saveBox(box)}
                          >
                            {updatingId === bid ? "…" : "Save"}
                          </button>
                        ) : (
                          <button type="button" className={CRM.linkRowAction} onClick={() => setActiveBoxId(bid)}>
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
            Unassigned to lot ({boxesByLot.unassigned.length})
          </div>
          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                  <th className={CRM.th}>Box ID</th>
                  <th className={CRM.th}>Barcode</th>
                  <th className={CRM.th}>Lot *</th>
                  <th className={CRM.th}>Product</th>
                  <th className={CRM.thRight}>Gross</th>
                  <th className={CRM.thRight}>Net kg</th>
                  <th className={CRM.thRight}>Units</th>
                  <th className={`${CRM.th} text-center w-[72px]`} />
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
                    grossWeight: "",
                    boxWeight: "",
                    numberOfUnits: "",
                  };
                  return (
                    <tr key={bid} className={`${CRM.tbodyTr} ${isActive ? "!bg-amber-50 ring-1 ring-inset ring-amber-300" : ""}`}>
                      <td className={`${CRM.td} font-mono`}>{box.boxId || bid.slice(-8)}</td>
                      <td className={`${CRM.td} font-mono text-[10px]`}>{box.barcode || "—"}</td>
                      <td className={CRM.td}>
                        <input
                          className={CRM.inputTable}
                          placeholder="Lot #"
                          value={d.lotNumber}
                          onChange={(e) =>
                            setBoxData((p) => ({
                              ...p,
                              [bid]: { ...d, lotNumber: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className={CRM.td}>
                        <input
                          className={CRM.inputTable}
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
                      <td className={`${CRM.td} text-right`}>
                        {isActive ? (
                          <input
                            className={CRM.inputTableNum}
                            value={rawInput[`g-${bid}`] ?? d.grossWeight}
                            onChange={(e) => {
                              const v = validateVendorProcessNum(e.target.value);
                              setRawInput((r) => ({ ...r, [`g-${bid}`]: v }));
                              setBoxData((p) => ({ ...p, [bid]: { ...d, grossWeight: v } }));
                            }}
                            onBlur={() =>
                              setRawInput((r) => {
                                const x = { ...r };
                                delete x[`g-${bid}`];
                                return x;
                              })
                            }
                          />
                        ) : (
                          d.grossWeight || "—"
                        )}
                      </td>
                      <td className={`${CRM.td} text-right`}>
                        {isActive ? (
                          <input
                            data-vb-w={bid}
                            className={CRM.inputTableNum}
                            value={rawInput[`w-${bid}`] ?? d.boxWeight}
                            onChange={(e) => {
                              const v = validateVendorProcessNum(e.target.value);
                              setRawInput((r) => ({ ...r, [`w-${bid}`]: v }));
                              setBoxData((p) => ({ ...p, [bid]: { ...d, boxWeight: v } }));
                            }}
                            onBlur={() =>
                              setRawInput((r) => {
                                const x = { ...r };
                                delete x[`w-${bid}`];
                                return x;
                              })
                            }
                          />
                        ) : (
                          d.boxWeight || "—"
                        )}
                      </td>
                      <td className={`${CRM.td} text-right`}>
                        {isActive ? (
                          <input
                            className={CRM.inputTableNumSm}
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
                      <td className={`${CRM.td} text-center`}>
                        {isActive ? (
                          <button
                            type="button"
                            className={CRM.btnPrimarySm}
                            disabled={updatingId === bid}
                            onClick={() => void saveBox(box)}
                          >
                            {updatingId === bid ? "…" : "Save"}
                          </button>
                        ) : (
                          <button type="button" className={CRM.linkRowAction} onClick={() => setActiveBoxId(bid)}>
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
