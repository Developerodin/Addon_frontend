"use client";

import JsBarcode from "jsbarcode";
import { toast } from "react-hot-toast";
import {
  whmsPickListBatches,
  type PickListBatchBarcodeLabel,
} from "@/shared/services/whmsPickListBatchService";
import {
  buildLabelsForCount,
  countBarcodeLabels,
  type BarcodePrintMode,
} from "./BatchBarcodePrintModal";
import { printHtmlViaHiddenFrame } from "./printHtmlViaHiddenFrame";
import {
  buildProductLabelPrintDocument,
  buildProductStickerHtml,
} from "./productBarcodeLabelHtml";

export interface BarcodePrintResult {
  batchNumber: string;
  labels: PickListBatchBarcodeLabel[];
  quantity: number;
  mode: BarcodePrintMode;
  styleCode?: string;
  remarks?: string;
}

/**
 * Render barcode bars from this line's EAN. Unique SVG id so labels don't collide.
 * @param value - EAN from style-code master
 * @param uid - Unique id for this sticker group
 */
function renderLabelBarcodeSvg(value: string, uid: string): { svg: string; caption: string } {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", `ean-${uid}`);
  const raw = String(value || "").trim() || "0";
  const digits = raw.replace(/\D/g, "");
  const common = {
    height: 48,
    displayValue: false,
    margin: 0,
    marginTop: 0,
    marginBottom: 0,
  } as const;

  try {
    if (digits.length === 12 || digits.length === 13) {
      JsBarcode(svg, digits, { ...common, format: "EAN13", width: 1.45 });
    } else {
      JsBarcode(svg, raw, { ...common, format: "CODE128", width: 1.25 });
    }
  } catch (err) {
    console.warn("EAN-13 render failed, falling back to CODE128", err);
    try {
      JsBarcode(svg, raw, { ...common, format: "CODE128", width: 1.25 });
    } catch (fallbackErr) {
      console.error("Barcode render failed", fallbackErr);
    }
  }

  const encoded = digits.length === 12 ? `${digits}${ean13CheckDigit(digits)}` : digits;
  return { svg: svg.outerHTML, caption: formatBarcodeCaption(encoded || raw, raw) };
}

/**
 * Compute EAN-13 check digit for a 12-digit body.
 * @param body12 - First 12 digits
 */
function ean13CheckDigit(body12: string): string {
  const digits = body12.split("").map((ch) => Number(ch));
  const sum = digits.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

/**
 * Group EAN-13 as `8 904442 926442`; otherwise return the raw code.
 * @param encoded - Value JsBarcode encoded
 * @param fallback - Original barcode string
 */
function formatBarcodeCaption(encoded: string, fallback: string): string {
  const digits = String(encoded || "").replace(/\D/g, "");
  if (digits.length === 13) {
    return `${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}`;
  }
  return String(encoded || fallback || "").trim();
}

/**
 * Print 50×70mm statutory MRP stickers (EAN-13 + legal copy) for a batch.
 * @param batchNumber - Display batch number for print title
 * @param labels - Label payloads from the API
 */
export function printBatchBarcodeLabels(batchNumber: string, labels: PickListBatchBarcodeLabel[]) {
  if (!labels.length) {
    toast.error("No labels to print");
    return false;
  }

  const stickers = labels
    .map((label, index) => {
      const ean = String(label.eanCode || label.barcode || "").trim();
      const uid = `${index}-${String(label.styleCode || "").replace(/[^a-zA-Z0-9]/g, "")}-${ean}`;
      const { svg, caption } = renderLabelBarcodeSvg(ean, uid);
      const one = buildProductStickerHtml(label, svg, caption);
      return Array.from({ length: label.quantity }, () => one).join("");
    })
    .join("");

  const html = buildProductLabelPrintDocument(`Barcodes — ${batchNumber}`, stickers);
  return printHtmlViaHiddenFrame(html, `Print barcodes — ${batchNumber}`);
}

/**
 * Persist a barcode print event after labels are sent to the printer.
 * @param batchId - Pick-list batch id
 * @param result - Print metadata and label breakdown
 */
export async function logBarcodePrintEvent(batchId: string, result: BarcodePrintResult) {
  await whmsPickListBatches.logBarcodePrint(batchId, {
    styleCode: result.styleCode || "",
    mode: result.mode,
    quantity: result.quantity,
    remarks: result.remarks || "",
    labels: result.labels.map((label) => ({
      styleCode: label.styleCode,
      skuCode: label.skuCode,
      size: label.size,
      shade: label.shade,
      quantity: label.quantity,
    })),
  });
}

/**
 * Fetch, print, and log barcodes for a batch with all or custom label count.
 * @param batchId - Pick-list batch id
 * @param mode - Print all picked labels or a custom total
 * @param customQty - Label count when mode is custom
 * @param styleCode - Optional style filter
 */
export async function printBatchBarcodes(
  batchId: string,
  mode: BarcodePrintMode,
  customQty?: number,
  styleCode?: string,
  remarks?: string,
): Promise<BarcodePrintResult | null> {
  try {
    const payload = await whmsPickListBatches.barcodes(batchId, styleCode ? { styleCode } : undefined);
    const labels =
      mode === "custom" && customQty != null
        ? buildLabelsForCount(payload.labels, customQty)
        : payload.labels;
    if (!labels.length) {
      toast.error("No labels to print");
      return null;
    }

    const title = styleCode ? `${payload.batchNumber} — ${styleCode}` : payload.batchNumber;
    const printed = printBatchBarcodeLabels(title, labels);
    if (!printed) return null;

    const result: BarcodePrintResult = {
      batchNumber: payload.batchNumber,
      labels,
      quantity: countBarcodeLabels(labels),
      mode,
      styleCode,
      remarks: remarks?.trim() || "",
    };

    await logBarcodePrintEvent(batchId, result);
    return result;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to load barcodes");
    return null;
  }
}

/**
 * Fetch and print barcodes for one style code with all or custom label count.
 * @param batchId - Pick-list batch id
 * @param styleCode - Style code filter
 * @param mode - Print all picked labels or a custom total
 * @param customQty - Label count when mode is custom
 */
export async function printStyleBatchBarcodes(
  batchId: string,
  styleCode: string,
  mode: BarcodePrintMode,
  customQty?: number,
  remarks?: string,
): Promise<BarcodePrintResult | null> {
  return printBatchBarcodes(batchId, mode, customQty, styleCode, remarks);
}

/** @deprecated Use printBatchBarcodes with mode argument */
export async function printAllBatchBarcodes(batchId: string) {
  return printBatchBarcodes(batchId, "all");
}
