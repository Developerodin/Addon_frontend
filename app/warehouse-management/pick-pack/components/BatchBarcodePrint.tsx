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

export interface BarcodePrintResult {
  batchNumber: string;
  labels: PickListBatchBarcodeLabel[];
  quantity: number;
  mode: BarcodePrintMode;
  styleCode?: string;
}

/**
 * Print barcode labels (CODE128) for a batch or single style code.
 * @param batchNumber - Display batch number for print title
 * @param labels - Label payloads from the API
 */
export function printBatchBarcodeLabels(batchNumber: string, labels: PickListBatchBarcodeLabel[]) {
  if (!labels.length) {
    toast.error("No labels to print");
    return false;
  }

  const blocks = labels
    .map((label) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, label.barcode, {
        format: "CODE128",
        width: 2,
        height: 55,
        displayValue: true,
        fontSize: 13,
        margin: 8,
      });
      const metaParts = [
        label.styleCode,
        label.size ? label.size : "",
        label.shade ? label.shade : "",
      ].filter(Boolean);
      const eanLine = label.eanCode && label.eanCode !== label.barcode ? `<div class="ean">EAN ${label.eanCode}</div>` : "";
      const one = `<div class="label">
          ${svg.outerHTML}
          <div class="meta">${metaParts.join(" · ")}</div>
          ${eanLine}
        </div>`;
      return Array.from({ length: label.quantity }, () => one).join("");
    })
    .join("");

  const html = `<!doctype html><html><head><title>Barcodes — ${batchNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 12px; }
      .label { display: inline-block; border: 1px dashed #bbb; padding: 6px 10px; margin: 4px; text-align: center; page-break-inside: avoid; }
      .meta { font-size: 11px; color: #333; margin-top: 2px; }
      .ean { font-size: 10px; color: #666; margin-top: 1px; }
    </style></head><body>${blocks}</body></html>`;

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
): Promise<BarcodePrintResult | null> {
  return printBatchBarcodes(batchId, mode, customQty, styleCode);
}

/** @deprecated Use printBatchBarcodes with mode argument */
export async function printAllBatchBarcodes(batchId: string) {
  return printBatchBarcodes(batchId, "all");
}
