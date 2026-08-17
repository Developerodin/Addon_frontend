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
  type BarcodePrintDestination,
  type BarcodePrintMode,
} from "./BatchBarcodePrintModal";
import { printHtmlViaHiddenFrame } from "./printHtmlViaHiddenFrame";
import {
  buildProductLabelPrintDocument,
  buildProductStickerHtml,
  buildSingleProductLabelDocument,
} from "./productBarcodeLabelHtml";
import { printHtmlLabelsViaQz } from "@/shared/utils/qzTrayOther";
import { PRODUCT_LABEL_SIZE_MM } from "./productBarcodeLabelConstants";

/** Rasterize JsBarcode SVG at ~2× 203dpi so QZ JavaFX HTML print stays sharp. */
const QZ_BARCODE_PNG_W = 720;
const QZ_BARCODE_PNG_H = 224;

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
 * Rasterize SVG markup to a PNG data URL for QZ Tray HTML printing.
 * QZ pixel HTML uses JavaFX WebView, which is unreliable with JsBarcode SVG rects.
 * @param svgMarkup - Raw SVG from JsBarcode
 * @param widthPx - Output width
 * @param heightPx - Output height
 */
async function svgMarkupToPngDataUrl(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
): Promise<string> {
  const svg = svgMarkup.includes("xmlns")
    ? svgMarkup
    : svgMarkup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to rasterize barcode SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Expand label groups into one sticker HTML fragment per physical copy.
 * @param labels - API label groups with quantities
 * @param barcodeMarkup - SVG or `<img>` markup to embed
 */
function expandStickerMarkup(
  labels: PickListBatchBarcodeLabel[],
  barcodeMarkup: (label: PickListBatchBarcodeLabel, index: number) => { markup: string; caption: string },
): string[] {
  const pages: string[] = [];
  labels.forEach((label, index) => {
    const { markup, caption } = barcodeMarkup(label, index);
    const one = buildProductStickerHtml(label, markup, caption);
    const qty = Math.max(0, Number(label.quantity || 0));
    for (let i = 0; i < qty; i += 1) pages.push(one);
  });
  return pages;
}

/**
 * Print 50×70mm statutory MRP stickers via QZ Tray (pixel HTML) or browser dialog.
 * @param batchNumber - Display batch number for print title
 * @param labels - Label payloads from the API
 * @param destination - QZ Tray thermal print or browser fallback
 */
export async function printBatchBarcodeLabels(
  batchNumber: string,
  labels: PickListBatchBarcodeLabel[],
  destination: BarcodePrintDestination = "qz",
): Promise<boolean> {
  if (!labels.length) {
    toast.error("No labels to print");
    return false;
  }

  if (destination === "browser") {
    const stickers = expandStickerMarkup(labels, (label, index) => {
      const ean = String(label.eanCode || label.barcode || "").trim();
      const uid = `${index}-${String(label.styleCode || "").replace(/[^a-zA-Z0-9]/g, "")}-${ean}`;
      const { svg, caption } = renderLabelBarcodeSvg(ean, uid);
      return { markup: svg, caption };
    }).join("");
    const html = buildProductLabelPrintDocument(`Barcodes — ${batchNumber}`, stickers);
    return printHtmlViaHiddenFrame(html, `Print barcodes — ${batchNumber}`);
  }

  try {
    const unique = labels.map((label, index) => {
      const ean = String(label.eanCode || label.barcode || "").trim();
      const uid = `${index}-${String(label.styleCode || "").replace(/[^a-zA-Z0-9]/g, "")}-${ean}`;
      const { svg, caption } = renderLabelBarcodeSvg(ean, uid);
      return { label, svg, caption };
    });

    const pngByIndex = await Promise.all(
      unique.map((row) => svgMarkupToPngDataUrl(row.svg, QZ_BARCODE_PNG_W, QZ_BARCODE_PNG_H)),
    );

    const pages = expandStickerMarkup(labels, (_label, index) => {
      const row = unique[index];
      const img = `<img src="${pngByIndex[index]}" alt="" width="${QZ_BARCODE_PNG_W}" height="${QZ_BARCODE_PNG_H}" />`;
      return { markup: img, caption: row.caption };
    }).map((sticker) => buildSingleProductLabelDocument(sticker));

    const result = await printHtmlLabelsViaQz(pages, {
      widthMm: PRODUCT_LABEL_SIZE_MM.width,
      heightMm: PRODUCT_LABEL_SIZE_MM.height,
    });

    if (!result.success) {
      toast.error(result.error || "QZ Tray print failed");
      return false;
    }
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "QZ Tray print failed");
    return false;
  }
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
 * @param remarks - Optional print-history remark
 * @param destination - QZ Tray thermal print or browser fallback
 */
export async function printBatchBarcodes(
  batchId: string,
  mode: BarcodePrintMode,
  customQty?: number,
  styleCode?: string,
  remarks?: string,
  destination: BarcodePrintDestination = "qz",
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
    const printed = await printBatchBarcodeLabels(title, labels, destination);
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
  destination: BarcodePrintDestination = "qz",
): Promise<BarcodePrintResult | null> {
  return printBatchBarcodes(batchId, mode, customQty, styleCode, remarks, destination);
}

/** @deprecated Use printBatchBarcodes with mode argument */
export async function printAllBatchBarcodes(batchId: string) {
  return printBatchBarcodes(batchId, "all");
}
