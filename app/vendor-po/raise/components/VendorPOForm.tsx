"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  VendorPOFormData,
  VendorPOLineItem,
  VendorPOPriority,
  VendorPOArticle,
} from "../types";

const PRIORITIES: VendorPOPriority[] = ["Low", "Medium", "High", "Urgent"];

function newLineItem(): VendorPOLineItem {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    articleId: "",
    articleCode: "",
    articleName: "",
    orderedQty: 0,
    lineRemarks: "",
  };
}

interface VendorPOFormProps {
  initialData: VendorPOFormData | null;
  vendors: { id: string; vendorCode: string; vendorName: string }[];
  articles: VendorPOArticle[];
  isApproved?: boolean;
  onSaveDraft: (data: VendorPOFormData) => void;
  onApprove: (data: VendorPOFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function VendorPOForm({
  initialData,
  vendors,
  articles,
  isApproved = false,
  onSaveDraft,
  onApprove,
  onCancel,
  isSubmitting = false,
}: VendorPOFormProps) {
  const [vendorId, setVendorId] = useState(initialData?.vendorId ?? "");
  const [priority, setPriority] = useState<VendorPOPriority>(
    initialData?.priority ?? "Medium"
  );
  const [remarks, setRemarks] = useState(initialData?.remarks ?? "");
  const [lineItems, setLineItems] = useState<VendorPOLineItem[]>(
    initialData?.lineItems?.length
      ? initialData.lineItems.map((li) => ({ ...li, id: li.id || `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }))
      : [newLineItem()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [articleSearch, setArticleSearch] = useState<Record<string, string>>({});
  const [articleOpen, setArticleOpen] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const articleInputRef = useRef<HTMLInputElement | null>(null);
  const articleDropdownRef = useRef<HTMLDivElement>(null);

  const locked = isApproved;

  const updateDropdownPosition = useCallback(() => {
    const input = articleInputRef.current;
    if (!input) {
      setDropdownPosition(null);
      return;
    }
    const rect = input.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (articleOpen) {
      const tick = () => requestAnimationFrame(updateDropdownPosition);
      const t = setTimeout(tick, 0);
      const onScrollOrResize = () => updateDropdownPosition();
      window.addEventListener("scroll", onScrollOrResize, true);
      window.addEventListener("resize", onScrollOrResize);
      return () => {
        clearTimeout(t);
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [articleOpen, updateDropdownPosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        articleDropdownRef.current && !articleDropdownRef.current.contains(target) &&
        articleInputRef.current && !articleInputRef.current.contains(target)
      ) {
        setArticleOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!vendorId.trim()) e.vendor = "Vendor is required";
    if (!lineItems.length) e.lineItems = "At least one line item is required";
    lineItems.forEach((row, idx) => {
      if (!row.articleId) e[`article_${row.id}`] = "Article is required";
      if (row.orderedQty <= 0) e[`qty_${row.id}`] = "Qty must be greater than 0";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getFormData = (): VendorPOFormData => ({
    vendorId,
    priority,
    remarks,
    lineItems: lineItems.map(({ id, articleId, articleCode, articleName, orderedQty, lineRemarks }) => ({
      id,
      articleId,
      articleCode,
      articleName,
      orderedQty,
      lineRemarks: lineRemarks || undefined,
    })),
  });

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSaveDraft(getFormData());
  };

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onApprove(getFormData());
  };

  const addRow = () => {
    if (locked) return;
    setLineItems((prev) => [...prev, newLineItem()]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.lineItems;
      return next;
    });
  };

  const removeRow = (id: string) => {
    if (locked) return;
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith("article_") && next[k] && lineItems.find((r) => `article_${r.id}` === k)) {}
        if (k === `article_${id}` || k === `qty_${id}`) delete next[k];
      });
      delete next[`article_${id}`];
      delete next[`qty_${id}`];
      return next;
    });
  };

  const setLineItemArticle = (rowId: string, article: VendorPOArticle) => {
    if (locked) return;
    setLineItems((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              articleId: article.id,
              articleCode: article.code,
              articleName: article.name,
            }
          : r
      )
    );
    setArticleSearch((prev) => ({ ...prev, [rowId]: "" }));
    setArticleOpen(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`article_${rowId}`];
      return next;
    });
  };

  const setLineItemQty = (rowId: string, value: number) => {
    if (locked) return;
    const n = Number(value);
    setLineItems((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, orderedQty: isNaN(n) ? 0 : n } : r))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`qty_${rowId}`];
      return next;
    });
  };

  const setLineItemRemarks = (rowId: string, value: string) => {
    if (locked) return;
    setLineItems((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, lineRemarks: value } : r))
    );
  };

  const filteredArticles = (rowId: string) => {
    const q = (articleSearch[rowId] ?? "").trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {/* Header section */}
      <div className="box mb-4">
        <div className="box-header">
          <h3 className="box-title">Header</h3>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label text-sm font-medium">
                Vendor <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${errors.vendor ? "border-danger" : ""}`}
                value={vendorId}
                onChange={(e) => {
                  setVendorId(e.target.value);
                  if (errors.vendor) setErrors((p) => ({ ...p, vendor: "" }));
                }}
                disabled={locked}
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendorCode} – {v.vendorName}
                  </option>
                ))}
              </select>
              {errors.vendor && (
                <p className="text-danger text-xs mt-1">{errors.vendor}</p>
              )}
            </div>
            <div>
              <label className="form-label text-sm font-medium">
                Priority <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as VendorPOPriority)}
                disabled={locked}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="form-label text-sm font-medium">Remarks</label>
            <textarea
              className="form-control"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={locked}
              placeholder="Header remarks (optional)"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="box mb-4">
        <div className="box-header flex justify-between items-center">
          <h3 className="box-title">Line items</h3>
          {!locked && (
            <button
              type="button"
              onClick={addRow}
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-add-line"></i>
              <span>Add Article Row</span>
            </button>
          )}
        </div>
        <div className="box-body p-0">
          {errors.lineItems && (
            <div className="px-4 pt-2">
              <p className="text-danger text-sm">{errors.lineItems}</p>
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
                {lineItems.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 align-top overflow-visible">
                      <div className="relative">
                        {locked ? (
                          <span className="text-sm">
                            {row.articleCode} – {row.articleName}
                          </span>
                        ) : (
                          <>
                            <input
                              ref={articleOpen === row.id ? articleInputRef : undefined}
                              type="text"
                              className={`form-control form-control-sm ${errors[`article_${row.id}`] ? "border-danger" : ""}`}
                              placeholder="Search article..."
                              value={
                                row.articleId
                                  ? `${row.articleCode} – ${row.articleName}`
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
                            className={`form-control form-control-sm text-right ${errors[`qty_${row.id}`] ? "border-danger" : ""}`}
                            value={row.orderedQty || ""}
                            onChange={(e) => setLineItemQty(row.id, e.target.value === "" ? 0 : Number(e.target.value))}
                          />
                          {errors[`qty_${row.id}`] && (
                            <p className="text-danger text-xs mt-1">{errors[`qty_${row.id}`]}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 align-top">
                      {locked ? (
                        <span className="text-sm text-gray-600">{row.lineRemarks || "–"}</span>
                      ) : (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Optional"
                          value={row.lineRemarks ?? ""}
                          onChange={(e) => setLineItemRemarks(row.id, e.target.value)}
                        />
                      )}
                    </td>
                    {!locked && (
                      <td className="border border-gray-300 px-4 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={lineItems.length <= 1}
                          className="ti-btn ti-btn-danger inline-flex items-center justify-center w-8 h-8 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove row"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Article dropdown portal – renders above table so it is not clipped */}
      {articleOpen && dropdownPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={articleDropdownRef}
            className="mt-1 max-h-48 overflow-auto bg-white border border-gray-300 rounded shadow-lg z-[9999]"
            style={{
              position: "fixed",
              top: dropdownPosition.top + 4,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              minWidth: 200,
            }}
          >
            {filteredArticles(articleOpen).length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No articles found</div>
            ) : (
              filteredArticles(articleOpen).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => setLineItemArticle(articleOpen, a)}
                >
                  {a.code} – {a.name}
                </button>
              ))
            )}
          </div>,
          document.body
        )}

      {/* Buttons */}
      <div className="box">
        <div className="box-body flex flex-wrap gap-3">
          {!locked ? (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                {isSubmitting ? "Saving…" : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="ti-btn ti-btn-success inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                {isSubmitting ? "Releasing…" : "Approve / Release PO"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                Cancel
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Approved PO – vendor and line items are locked. Changes require a revision flow (coming later).
            </p>
          )}
          {locked && (
            <button
              type="button"
              onClick={onCancel}
              className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              Back to list
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
