"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
    lineItems.forEach((row) => {
      if (!row.articleId) e[`article_${row.id}`] = "Article is required";
      if (row.orderedQty <= 0) e[`qty_${row.id}`] = "Qty must be greater than 0";
      if ((row.rate ?? 0) <= 0) e[`rate_${row.id}`] = "Rate must be greater than 0";
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
      ({ id, articleId, articleCode, articleName, orderedQty, rate, gstRate, estimatedDeliveryDate, lineRemarks }) => ({
        id,
        articleId,
        articleCode,
        articleName,
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
      delete next[`qty_${id}`];
      return next;
    });
  };

  const setLineItemArticle = (rowId: string, article: VendorPOArticle) => {
    if (lineItemsDisabled) return;
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
    return articles.filter(
      (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
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
        remarks={remarks}
        vendors={vendors}
        errors={errors}
        onVendorChange={onVendorChange}
        setVendorId={setVendorId}
        setCreditDays={setCreditDays}
        setEstimatedOrderDeliveryDate={setEstimatedOrderDeliveryDate}
        setRemarks={setRemarks}
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
        setArticleSearch={setArticleSearch}
        setArticleOpen={setArticleOpen}
        setLineItemQty={setLineItemQty}
        setLineItemRate={setLineItemRate}
        setLineItemGstRate={setLineItemGstRate}
        setLineItemRemarks={setLineItemRemarks}
        addRow={addRow}
        removeRow={removeRow}
      />

      <VendorPOOrderTotalsSection totals={totals} />

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
