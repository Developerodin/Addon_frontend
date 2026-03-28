"use client";
import React, { RefObject } from "react";
import { VendorPOLineItem } from "../types";

/** Shown next to article name; only vendor code is stored — missing → label. */
function articleVendorCodeLabel(articleCode: string | undefined): string {
  const t = articleCode?.trim();
  return t || "no vendor code";
}

type Props = {
  lineItems: VendorPOLineItem[];
  locked: boolean;
  lineItemsDisabled: boolean;
  vendorId: string;
  errors: Record<string, string>;
  articleSearch: Record<string, string>;
  articleOpen: string | null;
  articleInputRef: RefObject<HTMLInputElement | null>;
  setArticleSearch: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setArticleOpen: (id: string | null) => void;
  setLineItemQty: (rowId: string, value: number) => void;
  setLineItemRate: (rowId: string, value: number) => void;
  setLineItemGstRate: (rowId: string, value: number) => void;
  setLineItemRemarks: (rowId: string, value: string) => void;
  addRow: () => void;
  removeRow: (id: string) => void;
};

/**
 * Catalog line items table: article search, qty/rate/GST, computed columns, remarks, remove.
 */
export default function VendorPOLineItemsTable({
  lineItems,
  locked,
  lineItemsDisabled,
  vendorId,
  errors,
  articleSearch,
  articleOpen,
  articleInputRef,
  setArticleSearch,
  setArticleOpen,
  setLineItemQty,
  setLineItemRate,
  setLineItemGstRate,
  setLineItemRemarks,
  addRow,
  removeRow,
}: Props) {
  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h4 className="text-xs font-bold text-gray-800">Items</h4>
        {!locked && (
          <button
            type="button"
            onClick={addRow}
            disabled={lineItemsDisabled}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <i className="ri-add-line text-xs" />
            Add Item
          </button>
        )}
      </div>
      <div>
        {errors.lineItems && (
          <div className="mb-2">
            <p className="text-red-600 text-xs">{errors.lineItems}</p>
          </div>
        )}
        {!vendorId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
            <p className="text-xs text-yellow-800">
              <i className="ri-information-line me-1.5" />
              Please select a vendor first to add items
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 bg-white">
            <thead className="bg-gray-50/30">
              <tr>
                <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                  Article <span className="text-red-500">*</span>
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[7rem]">
                  Type
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[7rem]">
                  Color
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[7rem]">
                  Pattern
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-32">
                  Ordered Qty <span className="text-red-500">*</span>
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-32">
                  Rate <span className="text-red-500">*</span>
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-32">
                  GST % <span className="text-red-500">*</span>
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-32">
                  Sub Total
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-32">
                  GST Amt
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-32">
                  Line Total
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                  Line Remarks
                </th>
                {!locked && (
                  <th className="border border-gray-300 px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider w-20">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {lineItems.map((row) => {
                const rowSubTotal = Number(row.orderedQty || 0) * Number(row.rate || 0);
                const rowGstAmount = (rowSubTotal * Number(row.gstRate || 0)) / 100;
                const rowTotal = rowSubTotal + rowGstAmount;
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 align-top overflow-visible">
                      <div className="relative">
                        {locked ? (
                          <span className="text-sm">
                            {row.articleName}{" "}
                            <span className={row.articleCode?.trim() ? "text-gray-500" : "text-amber-600 italic"}>
                              ({articleVendorCodeLabel(row.articleCode)})
                            </span>
                          </span>
                        ) : (
                          <>
                            <input
                              ref={articleOpen === row.id ? articleInputRef : undefined}
                              type="text"
                              className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none focus:ring-0 focus:border-purple-300 ${
                                errors[`article_${row.id}`] || errors[`dup_article_${row.id}`]
                                  ? "border-red-400"
                                  : "border-gray-200"
                              }`}
                              placeholder="Search article..."
                              value={
                                row.articleId
                                  ? `${row.articleName} (${articleVendorCodeLabel(row.articleCode)})`
                                  : articleSearch[row.id] ?? ""
                              }
                              onFocus={() => setArticleOpen(row.id)}
                              onChange={(e) => {
                                setArticleSearch((p) => ({ ...p, [row.id]: e.target.value }));
                                if (!row.articleId) setArticleOpen(row.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setArticleOpen(null);
                              }}
                              disabled={lineItemsDisabled}
                            />
                            {errors[`article_${row.id}`] && (
                              <p className="text-red-600 text-xs mt-1">{errors[`article_${row.id}`]}</p>
                            )}
                            {errors[`dup_article_${row.id}`] && (
                              <p className="text-red-600 text-xs mt-1">{errors[`dup_article_${row.id}`]}</p>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-xs text-gray-700">{row.type || "–"}</span>
                      ) : (
                        <input
                          type="text"
                          readOnly
                          tabIndex={-1}
                          className="w-full px-1.5 py-1 text-xs border border-gray-100 rounded bg-gray-50 text-gray-700 cursor-default"
                          value={row.type ?? ""}
                          placeholder="—"
                          disabled={lineItemsDisabled}
                        />
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-xs text-gray-700">{row.color || "–"}</span>
                      ) : (
                        <input
                          type="text"
                          readOnly
                          tabIndex={-1}
                          className="w-full px-1.5 py-1 text-xs border border-gray-100 rounded bg-gray-50 text-gray-700 cursor-default"
                          value={row.color ?? ""}
                          placeholder="—"
                          disabled={lineItemsDisabled}
                        />
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-xs text-gray-700">{row.pattern || "–"}</span>
                      ) : (
                        <input
                          type="text"
                          readOnly
                          tabIndex={-1}
                          className="w-full px-1.5 py-1 text-xs border border-gray-100 rounded bg-gray-50 text-gray-700 cursor-default"
                          value={row.pattern ?? ""}
                          placeholder="—"
                          disabled={lineItemsDisabled}
                        />
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-sm">{row.orderedQty}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            min={1}
                            className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none focus:ring-0 focus:border-purple-300 text-right ${
                              errors[`qty_${row.id}`] ? "border-red-400" : "border-gray-200"
                            }`}
                            value={row.orderedQty || ""}
                            onChange={(e) =>
                              setLineItemQty(row.id, e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            disabled={lineItemsDisabled}
                          />
                          {errors[`qty_${row.id}`] && (
                            <p className="text-red-600 text-xs mt-1">{errors[`qty_${row.id}`]}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-sm">{Number(row.rate || 0).toFixed(2)}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none focus:ring-0 focus:border-purple-300 text-right ${
                              errors[`rate_${row.id}`] ? "border-red-400" : "border-gray-200"
                            }`}
                            value={row.rate || ""}
                            onChange={(e) =>
                              setLineItemRate(row.id, e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            disabled={lineItemsDisabled}
                          />
                          {errors[`rate_${row.id}`] && (
                            <p className="text-red-600 text-xs mt-1">{errors[`rate_${row.id}`]}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-sm">{Number(row.gstRate || 0).toFixed(2)}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`w-full px-1.5 py-1 text-xs border rounded focus:outline-none focus:ring-0 focus:border-purple-300 text-right ${
                              errors[`gst_${row.id}`] ? "border-red-400" : "border-gray-200"
                            }`}
                            value={row.gstRate || ""}
                            onChange={(e) =>
                              setLineItemGstRate(row.id, e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            disabled={lineItemsDisabled}
                          />
                          {errors[`gst_${row.id}`] && (
                            <p className="text-red-600 text-xs mt-1 text-right">{errors[`gst_${row.id}`]}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      <span className="text-xs block text-right">{rowSubTotal.toFixed(2)}</span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      <span className="text-xs block text-right">{rowGstAmount.toFixed(2)}</span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      <span className="text-xs font-semibold block text-right">{rowTotal.toFixed(2)}</span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">
                      {locked ? (
                        <span className="text-sm text-gray-600">{row.lineRemarks || "–"}</span>
                      ) : (
                        <input
                          type="text"
                          className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                          placeholder="Optional"
                          value={row.lineRemarks ?? ""}
                          onChange={(e) => setLineItemRemarks(row.id, e.target.value)}
                          disabled={lineItemsDisabled}
                        />
                      )}
                    </td>
                    {!locked && (
                      <td className="border border-gray-300 px-2 py-1.5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={lineItemsDisabled || lineItems.length <= 1}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove row"
                        >
                          <i className="ri-delete-bin-line text-xs" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
