"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { listVendors, getVendor } from "@/shared/services/vendorManagementService";
import vendorPurchaseOrderService from "@/shared/services/vendorPurchaseOrderService";
import type { VendorPOArticle, VendorPOFormData, VendorPOLineItem } from "../types";
import { buildVendorPoApiPayload } from "../components/vendorPoFormPayload";
import {
  downloadVendorPoImportErrors,
  downloadVendorPoOrderTemplate,
  parseVendorPoOrderFile,
} from "../utils/vendorPoOrderExcel";
import {
  flattenVendorPoImportErrors,
  resolveVendorPoOrderImport,
} from "../utils/vendorPoOrderExcelResolve";
import { hydrateVendorPoArticles } from "../utils/hydrateVendorPoArticles";

export type VendorPoExcelImportMode = "create" | "fill";

type FillResult = {
  vendorCode: string;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
  notes: string;
  lineItems: VendorPOLineItem[];
};

type Options = {
  mode: VendorPoExcelImportMode;
  articles?: VendorPOArticle[];
  vendorSelected?: boolean;
  onFill?: (result: FillResult) => boolean | void;
  onCreated?: () => Promise<void> | void;
};

/**
 * Shared Excel/CSV import for vendor PO list (create draft) and add form (fill lines).
 */
export function useVendorPoExcelImport({
  mode,
  articles = [],
  vendorSelected = false,
  onFill,
  onCreated,
}: Options) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Import Excel");
  const [modalErrors, setModalErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalErrors([]);
    setSuccessMessage("");
  }, []);

  const showErrors = useCallback((title: string, errors: string[]) => {
    setModalTitle(title);
    setModalErrors(errors);
    setSuccessMessage("");
    setModalOpen(true);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    try {
      downloadVendorPoOrderTemplate();
      toast.success("Template downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download template");
    }
  }, []);

  const handleDownloadErrors = useCallback(() => {
    downloadVendorPoImportErrors(modalErrors);
  }, [modalErrors]);

  const runFill = useCallback(
    async (file: File) => {
      if (!vendorSelected) {
        toast.error("Please select a vendor first");
        return;
      }
      const parsed = await parseVendorPoOrderFile(file);
      const resolved = resolveVendorPoOrderImport(parsed.header, parsed.items, articles);
      const allErrors = flattenVendorPoImportErrors(parsed.errors, resolved.errors);
      if (allErrors.length || !resolved.lineItems.length) {
        showErrors("Import failed", allErrors.length ? allErrors : ["No valid item rows to import."]);
        return;
      }
      const applied = onFill?.({
        vendorCode: resolved.header.vendorCode,
        creditDays: resolved.header.creditDays,
        estimatedOrderDeliveryDate: resolved.header.estimatedOrderDeliveryDate,
        notes: resolved.header.notes,
        lineItems: resolved.lineItems,
      });
      if (applied === false) return;
      toast.success(`${resolved.lineItems.length} item(s) added from Excel`);
    },
    [articles, onFill, showErrors, vendorSelected]
  );

  const runCreate = useCallback(
    async (file: File) => {
      const parsed = await parseVendorPoOrderFile(file);
      if (parsed.errors.length && !parsed.items.length) {
        showErrors("Import failed", parsed.errors);
        return;
      }
      if (!parsed.header.vendorCode) {
        showErrors("Import failed", parsed.errors.length ? parsed.errors : ["Vendor Code is required."]);
        return;
      }
      if (!parsed.header.estimatedOrderDeliveryDate) {
        showErrors("Import failed", [
          ...parsed.errors,
          "Estimated Order Delivery Date is required (YYYY-MM-DD).",
        ]);
        return;
      }
      if (parsed.header.creditDays < 0) {
        showErrors("Import failed", [...parsed.errors, "Credit Days must be 0 or greater."]);
        return;
      }

      const listed = await listVendors({
        vendorCode: parsed.header.vendorCode.trim().toUpperCase(),
        page: 1,
        limit: 5,
      });
      const vendorMatch =
        listed.results.find(
          (v) =>
            String(v.header?.vendorCode || "").trim().toUpperCase() ===
            parsed.header.vendorCode.trim().toUpperCase()
        ) ?? listed.results[0];
      if (!vendorMatch?.id) {
        showErrors("Import failed", [
          ...parsed.errors,
          `Vendor code "${parsed.header.vendorCode}" was not found.`,
        ]);
        return;
      }

      const vendor = await getVendor(vendorMatch.id, { populate: "products" });
      const catalog = await hydrateVendorPoArticles(vendor.products || []);
      if (!catalog.length) {
        showErrors("Import failed", [
          `Vendor "${vendor.header.vendorCode}" has no products in its catalog.`,
        ]);
        return;
      }

      const resolved = resolveVendorPoOrderImport(parsed.header, parsed.items, catalog);
      const allErrors = flattenVendorPoImportErrors(parsed.errors, resolved.errors);
      if (allErrors.length || !resolved.lineItems.length) {
        showErrors("Import failed", allErrors.length ? allErrors : ["No valid item rows to import."]);
        return;
      }

      const formData: VendorPOFormData = {
        vendorId: vendor.id,
        creditDays: resolved.header.creditDays,
        estimatedOrderDeliveryDate: resolved.header.estimatedOrderDeliveryDate,
        remarks: resolved.header.notes,
        lineItems: resolved.lineItems,
      };
      const payload = buildVendorPoApiPayload(
        formData,
        { id: vendor.id, vendorName: vendor.header.vendorName },
        "draft"
      );
      const created = await vendorPurchaseOrderService.create(payload);
      const n = resolved.lineItems.length;
      toast.success(`Draft ${created.vpoNumber} created with ${n} item${n === 1 ? "" : "s"}.`);
      await onCreated?.();
    },
    [onCreated, showErrors]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setImporting(true);
      try {
        if (mode === "fill") {
          await runFill(file);
        } else {
          await runCreate(file);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to import Excel";
        showErrors("Import failed", [message]);
      } finally {
        setImporting(false);
      }
    },
    [mode, runCreate, runFill, showErrors]
  );

  return {
    fileInputRef,
    importing,
    modalOpen,
    modalTitle,
    modalErrors,
    successMessage,
    closeModal,
    handleDownloadTemplate,
    handleDownloadErrors,
    handleFileChange,
  };
}
