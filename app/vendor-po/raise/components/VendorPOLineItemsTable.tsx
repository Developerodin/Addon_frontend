"use client";
import React, { RefObject } from "react";
import { VendorPOLineItem } from "../types";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VPO_FORM } from "./vendorPoFormLayoutClasses";

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
    <div className={VPO_FORM.section}>
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h4 className={VPO_FORM.sectionTitle}>Catalog items</h4>
        {!locked && (
          <button type="button" onClick={addRow} disabled={lineItemsDisabled} className={CRM.btnPrimary}>
            <i className="ri-add-line text-xs" />
            Add Item
          </button>
        )}
      </div>
      <div className="p-0">
        {errors.lineItems && (
          <div className="px-4 pt-2">
            <p className="text-danger text-sm">{errors.lineItems}</p>
          </div>
        )}
        {!vendorId && (
          <div className="px-4 pt-2">
            <p className="text-xs text-amber-700">Select vendor first to enable line items.</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Article <span className="text-danger">*</span>
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Ordered Qty <span className="text-danger">*</span>
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Rate <span className="text-danger">*</span>
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  GST %
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Sub Total
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  GST Amt
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Line Total
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Line Remarks
                </th>
                {!locked && (
                  <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                    Remove
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
                    <td className="border border-gray-300 px-4 py-2 align-top overflow-visible">
                      <div className="relative">
                        {locked ? (
                          <span className="text-sm">
                            {row.articleName} {row.articleCode ? `(Factory: ${row.articleCode})` : ""}
                          </span>
                        ) : (
                          <>
                            <input
                              ref={articleOpen === row.id ? articleInputRef : undefined}
                              type="text"
                              className={`${CRM.input} text-[12px] py-1 ${errors[`article_${row.id}`] ? "border-danger" : ""}`}
                              placeholder="Search article..."
                              value={
                                row.articleId
                                  ? `${row.articleName}${row.articleCode ? ` (Factory: ${row.articleCode})` : ""}`
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
                              <p className="text-danger text-xs mt-1">{errors[`article_${row.id}`]}</p>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      {locked ? (
                        <span className="text-sm">{row.orderedQty}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            min={1}
                            className={`${CRM.input} text-right ${errors[`qty_${row.id}`] ? "border-danger" : ""}`}
                            value={row.orderedQty || ""}
                            onChange={(e) =>
                              setLineItemQty(row.id, e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            disabled={lineItemsDisabled}
                          />
                          {errors[`qty_${row.id}`] && (
                            <p className="text-danger text-xs mt-1">{errors[`qty_${row.id}`]}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      {locked ? (
                        <span className="text-sm">{Number(row.rate || 0).toFixed(2)}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`${CRM.input} text-right ${errors[`rate_${row.id}`] ? "border-danger" : ""}`}
                            value={row.rate || ""}
                            onChange={(e) =>
                              setLineItemRate(row.id, e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            disabled={lineItemsDisabled}
                          />
                          {errors[`rate_${row.id}`] && (
                            <p className="text-danger text-xs mt-1">{errors[`rate_${row.id}`]}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      {locked ? (
                        <span className="text-sm">{Number(row.gstRate || 0).toFixed(2)}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${CRM.input} text-right`}
                          value={row.gstRate || ""}
                          onChange={(e) =>
                            setLineItemGstRate(row.id, e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          disabled={lineItemsDisabled}
                        />
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      <span className="text-sm block text-right">{rowSubTotal.toFixed(2)}</span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      <span className="text-sm block text-right">{rowGstAmount.toFixed(2)}</span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      <span className="text-sm font-semibold block text-right">{rowTotal.toFixed(2)}</span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      {locked ? (
                        <span className="text-sm text-gray-600">{row.lineRemarks || "–"}</span>
                      ) : (
                        <input
                          type="text"
                          className={CRM.input}
                          placeholder="Optional"
                          value={row.lineRemarks ?? ""}
                          onChange={(e) => setLineItemRemarks(row.id, e.target.value)}
                          disabled={lineItemsDisabled}
                        />
                      )}
                    </td>
                    {!locked && (
                      <td className="border border-gray-300 px-4 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={lineItemsDisabled || lineItems.length <= 1}
                          className="ti-btn ti-btn-danger inline-flex items-center justify-center w-8 h-8 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove row"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
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
