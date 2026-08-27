"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { VendorPOFormData, VendorPOLineItem, VendorPOArticle } from "../types";
import { newVendorPOLineItem } from "./vendorPoFormLineDefaults";
import VendorPOFormHeaderSection, { type VendorOption } from "./VendorPOFormHeaderSection";
import VendorPOLineItemsTable from "./VendorPOLineItemsTable";
import VendorPOOrderTotalsSection from "./VendorPOOrderTotalsSection";
import VendorPOArticlePickerPortal from "./VendorPOArticlePickerPortal";
import VendorPOFormActions from "./VendorPOFormActions";
import VendorPOExcelToolbar from "./VendorPOExcelToolbar";
import VendorPOImportResultModal from "./VendorPOImportResultModal";
import {
  getVendorPoFormFieldAccess,
  type VendorPoFormFieldAccess,
  type VendorPoRaiseFormMode,
} from "./vendorPoRaiseAccess";
import { validateVendorPoForm, type VendorPoFormSubmitAction } from "./vendorPoFormValidate";
import { useVendorPoExcelImport } from "../hooks/useVendorPoExcelImport";
import type { VendorPoApiStatus } from "@/shared/services/vendorPurchaseOrderService";

export type { VendorPoFormSubmitAction };

interface VendorPOFormProps {
  initialData: VendorPOFormData | null;
  initialSelectedVendor?: VendorOption | null;
  articles: VendorPOArticle[];
  onVendorChange?: (vendorId: string) => void;
  formMode?: VendorPoRaiseFormMode;
  apiStatus?: VendorPoApiStatus | null;
  workflowLocked?: boolean;
  onSubmit: (data: VendorPOFormData, action: VendorPoFormSubmitAction, selectedVendor: VendorOption | null) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** Show Download Template / Import Excel on the items toolbar (add page). */
  showExcelImport?: boolean;
}

/**
 * Vendor PO raise form with role-based field access (user / accounts / admin).
 */
export default function VendorPOForm({
  initialData,
  initialSelectedVendor = null,
  articles,
  onVendorChange,
  formMode = "full",
  apiStatus = null,
  workflowLocked = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  showExcelImport = false,
}: VendorPOFormProps) {
  const fieldAccess: VendorPoFormFieldAccess = useMemo(
    () => getVendorPoFormFieldAccess(formMode, apiStatus, workflowLocked),
    [formMode, apiStatus, workflowLocked]
  );

  const [vendorId, setVendorId] = useState(initialData?.vendorId ?? "");
  const [selectedVendor, setSelectedVendor] = useState<VendorOption | null>(initialSelectedVendor);
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

  const lineItemsDisabled = workflowLocked || !vendorId;

  /**
   * Merge Excel-imported lines into the form; abort if file vendor code conflicts.
   */
  const applyImportedLines = useCallback(
    (
      incoming: VendorPOLineItem[],
      header: { vendorCode: string; creditDays: number; estimatedOrderDeliveryDate: string; notes: string }
    ): boolean => {
      if (selectedVendor?.vendorCode && header.vendorCode) {
        const fileCode = header.vendorCode.trim().toUpperCase();
        const selectedCode = selectedVendor.vendorCode.trim().toUpperCase();
        if (fileCode && selectedCode && fileCode !== selectedCode) {
          toast.error(
            `File vendor ${header.vendorCode} does not match selected vendor ${selectedVendor.vendorCode}.`
          );
          return false;
        }
      }
      setLineItems((prev) => {
        const existingReal = prev.filter((r) => r.articleId);
        const existingIds = new Set(existingReal.map((r) => r.articleId));
        const toAdd = incoming.filter((r) => r.articleId && !existingIds.has(r.articleId));
        if (!toAdd.length) return existingReal.length ? existingReal : prev;
        return existingReal.length ? [...existingReal, ...toAdd] : toAdd;
      });
      if (header.creditDays >= 0) setCreditDays(header.creditDays);
      if (header.estimatedOrderDeliveryDate) setEstimatedOrderDeliveryDate(header.estimatedOrderDeliveryDate);
      if (header.notes) setRemarks(header.notes);
      return true;
    },
    [selectedVendor]
  );

  const excelImport = useVendorPoExcelImport({
    mode: "fill",
    articles,
    vendorSelected: Boolean(vendorId),
    onFill: (result) => applyImportedLines(result.lineItems, result),
  });

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
    }
    setDropdownPosition(null);
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

  useEffect(() => {
    if (!articles.length) return;
    setLineItems((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (row.articleCode?.trim() || !row.articleId) return row;
        const matched = articles.find((a) => a.id === row.articleId);
        const resolvedCode = matched?.vendorCode?.trim() || matched?.code?.trim() || "";
        if (!resolvedCode) return row;
        changed = true;
        return { ...row, articleCode: resolvedCode };
      });
      return changed ? next : prev;
    });
  }, [articles]);

  /**
   * Validate form for draft save or vendor submit.
   * @param action - draft or submit
   */
  const validate = (action: VendorPoFormSubmitAction): boolean => {
    const e: Record<string, string> = {};
    const ok = validateVendorPoForm({
      action,
      fieldAccess,
      formMode,
      vendorId,
      creditDays,
      estimatedOrderDeliveryDate,
      lineItems,
      errors: e,
    });
    setErrors(e);
    if (!ok) {
      toast.error("Please fix the highlighted fields before continuing.");
    }
    return ok;
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

  const handleVendorSelect = (vendor: VendorOption) => {
    setVendorId(vendor.id);
    setSelectedVendor(vendor);
    onVendorChange?.(vendor.id);
  };

  const handleFormAction = (action: VendorPoFormSubmitAction) => {
    if (!validate(action)) return;
    onSubmit(getFormData(), action, selectedVendor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFormAction("submit");
  };

  const clearError = (key: string) => setErrors((p) => ({ ...p, [key]: "" }));

  const addRow = () => {
    if (lineItemsDisabled || !fieldAccess.canAddLines) return;
    setLineItems((prev) => [...prev, newVendorPOLineItem()]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.lineItems;
      return next;
    });
  };

  const removeRow = (id: string) => {
    if (lineItemsDisabled || !fieldAccess.canRemoveLines) return;
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`article_${id}`];
      delete next[`dup_article_${id}`];
      delete next[`qty_${id}`];
      delete next[`rate_${id}`];
      delete next[`gst_${id}`];
      return next;
    });
  };

  const onArticleInputChange = useCallback(
    (rowId: string, value: string) => {
      if (lineItemsDisabled || !fieldAccess.canEditUserLineFields) return;
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
    [lineItemsDisabled, fieldAccess.canEditUserLineFields]
  );

  const setLineItemArticle = (rowId: string, article: VendorPOArticle) => {
    if (lineItemsDisabled || !fieldAccess.canEditUserLineFields) return;
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
    if (lineItemsDisabled || !fieldAccess.canEditUserLineFields) return;
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
    if (lineItemsDisabled || !fieldAccess.canEditPricingFields) return;
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
    if (lineItemsDisabled || !fieldAccess.canEditPricingFields) return;
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
    if (lineItemsDisabled || !fieldAccess.canEditRemarks) return;
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
      {formMode === "user_draft" ? (
        <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-2">
          User role: enter vendor, delivery details, and article lines only. Save as draft — accounts will add rate & GST later.
        </p>
      ) : null}
      {formMode === "accounts_draft" ? (
        <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          Accounts role: review user-entered lines, add rate & GST, then submit to supplier. Header and article details are read-only.
        </p>
      ) : null}

      <VendorPOFormHeaderSection
        canEditHeader={fieldAccess.canEditHeader}
        vendorId={vendorId}
        selectedVendor={selectedVendor}
        creditDays={creditDays}
        estimatedOrderDeliveryDate={estimatedOrderDeliveryDate}
        errors={errors}
        onVendorSelect={handleVendorSelect}
        setCreditDays={setCreditDays}
        setEstimatedOrderDeliveryDate={setEstimatedOrderDeliveryDate}
        clearError={clearError}
      />

      <VendorPOLineItemsTable
        lineItems={lineItems}
        fieldAccess={fieldAccess}
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
        excelToolbar={
          showExcelImport && fieldAccess.canAddLines ? (
            <VendorPOExcelToolbar
              importing={excelImport.importing}
              disabled={!vendorId || lineItemsDisabled}
              disabledReason="Select a vendor first"
              fileInputRef={excelImport.fileInputRef}
              onDownloadTemplate={excelImport.handleDownloadTemplate}
              onFileChange={excelImport.handleFileChange}
            />
          ) : null
        }
      />

      <VendorPOOrderTotalsSection totals={totals} show={fieldAccess.showOrderTotals} />

      {fieldAccess.canEditRemarks ? (
        <div className="border-t pt-4">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
            rows={2}
            disabled={workflowLocked}
            placeholder="Additional notes about the purchase order..."
          />
        </div>
      ) : null}

      <VendorPOArticlePickerPortal
        articleOpen={fieldAccess.canEditUserLineFields ? articleOpen : null}
        dropdownPosition={dropdownPosition}
        articleDropdownRef={articleDropdownRef}
        filteredArticles={portalFiltered}
        onSelect={(a) => articleOpen && setLineItemArticle(articleOpen, a)}
      />

      <VendorPOFormActions
        showSaveDraft={fieldAccess.showSaveDraft}
        showSubmitToVendor={fieldAccess.showSubmitToVendor}
        isSubmitting={!!isSubmitting}
        saveDraftLabel={formMode === "accounts_draft" ? "Save pricing draft" : "Save Draft"}
        submitLabel={formMode === "accounts_draft" ? "Submit to Supplier" : "Submit to Supplier"}
        onCancel={onCancel}
        onSaveDraft={() => handleFormAction("draft")}
        workflowLocked={workflowLocked}
      />

      {showExcelImport ? (
        <VendorPOImportResultModal
          open={excelImport.modalOpen}
          title={excelImport.modalTitle}
          errors={excelImport.modalErrors}
          successMessage={excelImport.successMessage}
          onDownloadErrors={excelImport.handleDownloadErrors}
          onClose={excelImport.closeModal}
        />
      ) : null}
    </form>
  );
}
