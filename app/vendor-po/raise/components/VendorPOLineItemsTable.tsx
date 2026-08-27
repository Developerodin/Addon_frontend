"use client";
import React, { RefObject, useEffect, useState } from "react";
import { VendorPOLineItem } from "../types";
import type { VendorPoFormFieldAccess } from "./vendorPoRaiseAccess";

/** Shown next to article name; only vendor code is stored — missing → label. */
function articleVendorCodeLabel(articleCode: string | undefined): string {
  const t = articleCode?.trim();
  return t || "no vendor code";
}

type Props = {
  lineItems: VendorPOLineItem[];
  fieldAccess: VendorPoFormFieldAccess;
  lineItemsDisabled: boolean;
  vendorId: string;
  errors: Record<string, string>;
  articleSearch: Record<string, string>;
  articleOpen: string | null;
  articleInputRef: RefObject<HTMLInputElement | null>;
  onArticleInputChange: (rowId: string, value: string) => void;
  setArticleOpen: (id: string | null) => void;
  setLineItemQty: (rowId: string, value: number) => void;
  setLineItemRate: (rowId: string, value: number) => void;
  setLineItemGstRate: (rowId: string, value: number) => void;
  setLineItemRemarks: (rowId: string, value: string) => void;
  addRow: () => void;
  removeRow: (id: string) => void;
  excelToolbar?: React.ReactNode;
};

/**
 * Catalog line items table: article search, qty/rate/GST, computed columns, remarks, remove.
 */
export default function VendorPOLineItemsTable({
  lineItems,
  fieldAccess,
  lineItemsDisabled,
  vendorId,
  errors,
  articleSearch,
  articleOpen,
  articleInputRef,
  onArticleInputChange,
  setArticleOpen,
  setLineItemQty,
  setLineItemRate,
  setLineItemGstRate,
  setLineItemRemarks,
  addRow,
  removeRow,
  excelToolbar = null,
}: Props) {
  const { canEditUserLineFields, canEditPricingFields, canAddLines, canRemoveLines, showPricingColumns } =
    fieldAccess;
  const userLineReadOnly = !canEditUserLineFields;
  const pricingReadOnly = !canEditPricingFields;
  const PAGE_SIZE = 80;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(lineItems.length / PAGE_SIZE));
  const paginate = lineItems.length > PAGE_SIZE;
  const visibleRows = paginate
    ? lineItems.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : lineItems;

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);
  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h4 className="text-xs font-bold text-gray-800">Items</h4>
        <div className="flex items-center gap-2 flex-wrap">
          {excelToolbar}
          {!canAddLines ? null : (
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
                <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[13rem]">
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
                <th className="border border-gray-300 px-1.5 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-24 whitespace-normal leading-tight align-bottom">
                  <span className="block">Ordered</span>
                  <span className="block">
                    Qty <span className="text-red-500">*</span>
                  </span>
                </th>
                {showPricingColumns ? (
                  <>
                    <th className="border border-gray-300 px-1.5 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-24 whitespace-normal leading-tight align-bottom">
                      Rate <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-1.5 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-24 whitespace-normal leading-tight align-bottom">
                      <span className="block">GST</span>
                      <span className="block">
                        % <span className="text-red-500">*</span>
                      </span>
                    </th>
                    <th className="border border-gray-300 px-1.5 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-24 whitespace-normal leading-tight align-bottom">
                      <span className="block">Sub</span>
                      <span className="block">Total</span>
                    </th>
                    <th className="border border-gray-300 px-1.5 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-24 whitespace-normal leading-tight align-bottom">
                      <span className="block">GST</span>
                      <span className="block">Amt</span>
                    </th>
                    <th className="border border-gray-300 px-1.5 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider w-24 whitespace-normal leading-tight align-bottom">
                      <span className="block">Line</span>
                      <span className="block">Total</span>
                    </th>
                  </>
                ) : null}
                {fieldAccess.canEditRemarks ? (
                  <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[9rem] whitespace-normal leading-tight align-bottom">
                    <span className="block">Line</span>
                    <span className="block">Remarks</span>
                  </th>
                ) : null}
                {canRemoveLines ? (
                  <th className="border border-gray-300 px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider w-20">
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="bg-white">
              {visibleRows.map((row) => {
                const rowSubTotal = Number(row.orderedQty || 0) * Number(row.rate || 0);
                const rowGstAmount = (rowSubTotal * Number(row.gstRate || 0)) / 100;
                const rowTotal = rowSubTotal + rowGstAmount;
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 align-top overflow-visible">
                      <div className="relative">
                        {userLineReadOnly || row.imported ? (
                          <div>
                            <span
                              className={`text-sm ${row.articleCode?.trim() ? "text-gray-800 font-medium" : "text-amber-600 italic"}`}
                            >
                              {articleVendorCodeLabel(row.articleCode)}
                            </span>
                            {row.imported && row.articleName ? (
                              <span className="block text-[10px] text-gray-500 truncate max-w-[12rem]">
                                {row.articleName}
                              </span>
                            ) : null}
                          </div>
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
                                row.articleId ? articleVendorCodeLabel(row.articleCode) : articleSearch[row.id] ?? ""
                              }
                              onFocus={() => setArticleOpen(row.id)}
                              onChange={(e) => onArticleInputChange(row.id, e.target.value)}
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
                      {userLineReadOnly ? (
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
                      {userLineReadOnly ? (
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
                      {userLineReadOnly ? (
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
                    <td className="border border-gray-300 px-2 py-1.5 align-top text-right">
                      {userLineReadOnly ? (
                        <span className="text-sm tabular-nums">{row.orderedQty}</span>
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
                    {showPricingColumns ? (
                      <>
                        <td className="border border-gray-300 px-2 py-1.5 align-top text-right">
                          {pricingReadOnly ? (
                            <span className="text-sm tabular-nums">{Number(row.rate || 0).toFixed(2)}</span>
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
                        <td className="border border-gray-300 px-2 py-1.5 align-top text-right">
                          {pricingReadOnly ? (
                            <span className="text-sm tabular-nums">{Number(row.gstRate || 0).toFixed(2)}</span>
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
                        <td className="border border-gray-300 px-2 py-1.5 align-top text-right">
                          <span className="text-xs tabular-nums">{rowSubTotal.toFixed(2)}</span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 align-top text-right">
                          <span className="text-xs tabular-nums">{rowGstAmount.toFixed(2)}</span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 align-top text-right">
                          <span className="text-xs font-semibold tabular-nums">{rowTotal.toFixed(2)}</span>
                        </td>
                      </>
                    ) : null}
                    {fieldAccess.canEditRemarks ? (
                      <td className="border border-gray-300 px-2 py-1.5 align-top">
                        <input
                          type="text"
                          className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                          placeholder="Optional"
                          value={row.lineRemarks ?? ""}
                          onChange={(e) => setLineItemRemarks(row.id, e.target.value)}
                          disabled={lineItemsDisabled}
                        />
                      </td>
                    ) : null}
                    {canRemoveLines ? (
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
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {paginate ? (
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-gray-500 font-medium">
              {lineItems.length} items · page {page + 1} of {pageCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded disabled:opacity-40"
                aria-label="Previous item page"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded disabled:opacity-40"
                aria-label="Next item page"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
