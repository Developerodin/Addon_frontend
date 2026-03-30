"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { VendorPOFormData, VendorPOLineItem, VendorPOArticle } from "../types";
import { newVendorPOLineItem } from "./vendorPoFormLineDefaults";
import VendorPOFormHeaderSection from "./VendorPOFormHeaderSection";
import VendorPOLineItemsTable from "./VendorPOLineItemsTable";
import VendorPOOrderTotalsSection from "./VendorPOOrderTotalsSection";
import VendorPOArticlePickerPortal from "./VendorPOArticlePickerPortal";
import VendorPOFormActions from "./VendorPOFormActions";

interface VendorPOFormProps {
  initialData: VendorPOFormData | null;
  vendors: { id: string; vendorCode: string; vendorName: string }[];
  articles: VendorPOArticle[];
  onVendorChange?: (vendorId: string) => void;
  isApproved?: boolean;
  onSubmit: (data: VendorPOFormData) => void;
  submitButtonText?: string;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function VendorPOForm({
  initialData,
  vendors,
  articles,
  onVendorChange,
  isApproved = false,
  onSubmit,
  submitButtonText = "Create PO",
  onCancel,
  isSubmitting = false,
}: VendorPOFormProps) {
  const [vendorId, setVendorId] = useState(initialData?.vendorId ?? "");
  const [creditDays, setCreditDays] = useState<number>(initialData?.creditDays ?? 0);
  const [estimatedOrderDeliveryDate, setEstimatedOrderDeliveryDate] = useState<string>(
    initialData?.estimatedOrderDeliveryDate ?? ""
  );
  const [remarks, setRemarks] = useState(initialData?.remarks ?? "");
  const [lineItems, setLineItems] = useState<VendorPOLineItem[]>(
    initialData?.lineItems?.length
      ? initialData.lineItems.map((li) => ({
          ...li,
          id: li.id || `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }))
      : [newVendorPOLineItem()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [articleSearch, setArticleSearch] = useState<Record<string, string>>({});
  const [articleOpen, setArticleOpen] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const articleInputRef = useRef<HTMLInputElement | null>(null);
  const articleDropdownRef = useRef<HTMLDivElement>(null);

  const locked = isApproved;
  const lineItemsDisabled = locked || !vendorId;

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
        articleDropdownRef.current &&
        !articleDropdownRef.current.contains(target) &&
        articleInputRef.current &&
        !articleInputRef.current.contains(target)
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
    if (creditDays < 0) e.creditDays = "Credit days must be 0 or greater";
    if (!estimatedOrderDeliveryDate?.trim()) {
      e.estimatedOrderDeliveryDate = "Estimated order delivery date is required";
    }
    if (!lineItems.length) e.lineItems = "At least one line item is required";
    const articleIdCounts = new Map<string, number>();
    lineItems.forEach((row) => {
      if (!row.articleId) return;
      articleIdCounts.set(row.articleId, (articleIdCounts.get(row.articleId) || 0) + 1);
    });
    lineItems.forEach((row) => {
      if (!row.articleId) e[`article_${row.id}`] = "Article is required";
      if (row.articleId && (articleIdCounts.get(row.articleId) || 0) > 1) {
        e[`dup_article_${row.id}`] = "This article is already on another line";
      }
      if (row.orderedQty <= 0) e[`qty_${row.id}`] = "Qty must be greater than 0";
      if ((row.rate ?? 0) <= 0) e[`rate_${row.id}`] = "Rate must be greater than 0";
      if ((row.gstRate ?? 0) <= 0) e[`gst_${row.id}`] = "GST % is required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getFormData = (): VendorPOFormData => ({
    vendorId,
    creditDays: Number(creditDays || 0),
    estimatedOrderDeliveryDate: estimatedOrderDeliveryDate || undefined,
    remarks,
    lineItems: lineItems.map(
      ({
        id,
        articleId,
        articleCode,
        articleName,
        type,
        color,
        pattern,
        orderedQty,
        rate,
        gstRate,
        estimatedDeliveryDate,
        lineRemarks,
      }) => ({
        id,
        articleId,
        articleCode,
        articleName,
        type: type?.trim() || undefined,
        color: color?.trim() || undefined,
        pattern: pattern?.trim() || undefined,
        orderedQty,
        rate: Number(rate || 0),
        gstRate: Number(gstRate || 0),
        estimatedDeliveryDate: estimatedDeliveryDate || undefined,
        lineRemarks: lineRemarks || undefined,
      })
    ),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(getFormData());
  };

  const clearError = (key: string) => setErrors((p) => ({ ...p, [key]: "" }));

  const addRow = () => {
    if (lineItemsDisabled) return;
    setLineItems((prev) => [...prev, newVendorPOLineItem()]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.lineItems;
      return next;
    });
  };

  const removeRow = (id: string) => {
    if (lineItemsDisabled) return;
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`article_${id}`];
      delete next[`dup_article_${id}`];
      delete next[`qty_${id}`];
      delete next[`gst_${id}`];
      return next;
    });
  };

  /** When user types after a selection, clear the line article so `value` follows search text (avoids a "stuck" input). */
  const onArticleInputChange = useCallback(
    (rowId: string, value: string) => {
      if (lineItemsDisabled) return;
      setLineItems((prev) =>
        prev.map((r) =>
          r.id === rowId && r.articleId
            ? {
                ...r,
                articleId: "",
                articleCode: "",
                articleName: "",
                type: "",
                color: "",
                pattern: "",
              }
            : r
        )
      );
      setArticleSearch((prev) => ({ ...prev, [rowId]: value }));
      setArticleOpen(rowId);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`article_${rowId}`];
        delete next[`dup_article_${rowId}`];
        return next;
      });
    },
    [lineItemsDisabled]
  );

  const setLineItemArticle = (rowId: string, article: VendorPOArticle) => {
    if (lineItemsDisabled) return;
    if (lineItems.some((r) => r.id !== rowId && r.articleId === article.id)) {
      toast.error("This article is already added on another line.");
      setArticleOpen(null);
      return;
    }
    setLineItems((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              articleId: article.id,
              articleCode: article.vendorCode?.trim() || "",
              articleName: article.name,
              type: article.type ?? "",
              color: article.color ?? "",
              pattern: article.pattern ?? "",
            }
          : r
      )
    );
    setArticleSearch((prev) => ({ ...prev, [rowId]: "" }));
    setArticleOpen(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`article_${rowId}`];
      delete next[`dup_article_${rowId}`];
      return next;
    });
  };

  const setLineItemQty = (rowId: string, value: number) => {
    if (lineItemsDisabled) return;
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

  const setLineItemRate = (rowId: string, value: number) => {
    if (lineItemsDisabled) return;
    const n = Number(value);
    setLineItems((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, rate: isNaN(n) ? 0 : n } : r))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`rate_${rowId}`];
      return next;
    });
  };

  const setLineItemGstRate = (rowId: string, value: number) => {
    if (lineItemsDisabled) return;
    const n = Number(value);
    setLineItems((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, gstRate: isNaN(n) ? 0 : n } : r))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`gst_${rowId}`];
      return next;
    });
  };

  const setLineItemRemarks = (rowId: string, value: string) => {
    if (lineItemsDisabled) return;
    setLineItems((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, lineRemarks: value } : r))
    );
  };

  const filteredArticles = (rowId: string) => {
    const q = (articleSearch[rowId] ?? "").trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => {
      const vc = (a.vendorCode ?? "").toLowerCase();
      return vc.includes(q) || a.name.toLowerCase().includes(q);
    });
  };

  const portalFiltered = articleOpen ? filteredArticles(articleOpen) : [];

  const totals = useMemo(() => {
    const subTotal = lineItems.reduce(
      (sum, item) => sum + Number(item.orderedQty || 0) * Number(item.rate || 0),
      0
    );
    const gst = lineItems.reduce(
      (sum, item) =>
        sum +
        (Number(item.orderedQty || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100,
      0
    );
    const total = subTotal + gst;
    return { subTotal, gst, total };
  }, [lineItems]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <VendorPOFormHeaderSection
        locked={locked}
        vendorId={vendorId}
        creditDays={creditDays}
        estimatedOrderDeliveryDate={estimatedOrderDeliveryDate}
        vendors={vendors}
        errors={errors}
        onVendorChange={onVendorChange}
        setVendorId={setVendorId}
        setCreditDays={setCreditDays}
        setEstimatedOrderDeliveryDate={setEstimatedOrderDeliveryDate}
        clearError={clearError}
      />

      <VendorPOLineItemsTable
        lineItems={lineItems}
        locked={locked}
        lineItemsDisabled={lineItemsDisabled}
        vendorId={vendorId}
        errors={errors}
        articleSearch={articleSearch}
        articleOpen={articleOpen}
        articleInputRef={articleInputRef}
        onArticleInputChange={onArticleInputChange}
        setArticleOpen={setArticleOpen}
        setLineItemQty={setLineItemQty}
        setLineItemRate={setLineItemRate}
        setLineItemGstRate={setLineItemGstRate}
        setLineItemRemarks={setLineItemRemarks}
        addRow={addRow}
        removeRow={removeRow}
      />

      <VendorPOOrderTotalsSection totals={totals} />

      <div className="border-t pt-4">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
          rows={2}
          disabled={locked}
          placeholder="Additional notes about the purchase order..."
        />
      </div>

      <VendorPOArticlePickerPortal
        articleOpen={articleOpen}
        dropdownPosition={dropdownPosition}
        articleDropdownRef={articleDropdownRef}
        filteredArticles={portalFiltered}
        onSelect={(a) => articleOpen && setLineItemArticle(articleOpen, a)}
      />

      <VendorPOFormActions
        locked={locked}
        isSubmitting={!!isSubmitting}
        submitButtonText={submitButtonText}
        onCancel={onCancel}
      />
    </form>
  );
}
