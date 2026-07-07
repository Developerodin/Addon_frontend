import * as XLSX from "xlsx";
import type { Range } from "xlsx";
import { saveAs } from "file-saver";
import type { PickListOrderGroup, PickListOrderItem } from "../types";

/** Items grouped under one pair/article SKU code. */
export interface PickSkuGroup {
  skuCode: string;
  isPair: boolean;
  items: PickListOrderItem[];
  totalQuantity: number;
}

/**
 * Build compact client label (name and/or type) for print/export.
 */
export function formatClientLabel(args: { clientName?: string; clientType?: string }): string | null {
  const name = (args.clientName ?? "").trim();
  const type = (args.clientType ?? "").trim();
  if (!name && !type) return null;
  if (name && type) return `${name} • ${type}`;
  return name || type;
}

/**
 * Picker label for print/export headers.
 * @param pickerName - Assigned picker on the order group
 */
export function formatPickerLabel(pickerName?: string): string {
  const name = (pickerName ?? "").trim();
  return name ? name : "Not assigned";
}

/**
 * Addon order ID line for print/export when set on the warehouse order.
 * @param addonOrderId - External / customer reference from warehouse order
 */
export function formatAddonOrderLine(addonOrderId?: string): string | null {
  const id = (addonOrderId ?? "").trim();
  if (!id) return null;
  return id;
}

/**
 * Stock cell text + whether the line has no usable stock.
 * @param item - Pick list line
 */
export function formatPickLineStock(item: PickListOrderItem): { text: string; noStock: boolean } {
  const stock = item.availableStock;
  if (typeof stock !== "number" || Number.isNaN(stock)) {
    return { text: "NO STOCK", noStock: true };
  }
  if (stock <= 0) return { text: "NO STOCK", noStock: true };
  return { text: String(stock), noStock: false };
}

/**
 * Count pick lines with zero or unknown stock.
 * @param items - Order pick lines
 */
export function countNoStockPickLines(items: PickListOrderItem[]): number {
  return items.filter((item) => formatPickLineStock(item).noStock).length;
}

/**
 * Group pick lines by pair/article SKU so multi-style pairs print together.
 * @param items - Flat pick list lines for one order
 * @returns Groups sorted by first appearance of each SKU
 */
export function groupPickItemsBySku(items: PickListOrderItem[]): PickSkuGroup[] {
  const map = new Map<string, PickListOrderItem[]>();

  for (const item of items) {
    const key = (item.skuCode || item.styleCode || "").trim();
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  return [...map.entries()].map(([skuCode, groupItems]) => {
    const isPair = groupItems.length > 1 || groupItems.some((row) => row.skuCode !== row.styleCode);
    return {
      skuCode,
      isPair,
      items: groupItems,
      totalQuantity: groupItems.reduce((sum, row) => sum + row.quantity, 0),
    };
  });
}

/**
 * Label for a SKU group header in print/export output.
 * @param group - Grouped pick lines
 */
function skuGroupLabel(group: PickSkuGroup): string {
  if (group.isPair) {
    return `Pair: ${group.skuCode} · ${group.items.length} style${group.items.length === 1 ? "" : "s"}`;
  }
  return `Article: ${group.skuCode}`;
}

const escHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Download pick list for an order as Excel, grouped by pair/article SKU.
 * @param group - Order pick group
 */
export function downloadOrderExcel(group: PickListOrderGroup) {
  const clientLine = formatClientLabel({ clientName: group.clientName, clientType: group.clientType });
  const pickerLine = formatPickerLabel(group.pickerName);
  const addonOrderLine = formatAddonOrderLine(group.addonOrderId);
  const headers = ["Pair / Article", "Style Code", "Color", "Size", "Qty", "Stock", "Pickup Qty"] as const;
  const skuGroups = groupPickItemsBySku(group.items);
  const dataRows: (string | number)[][] = [];

  for (const skuGroup of skuGroups) {
    dataRows.push([skuGroupLabel(skuGroup), "", "", "", skuGroup.totalQuantity, "", ""]);
    for (const item of skuGroup.items) {
      const stock = formatPickLineStock(item);
      dataRows.push([
        "",
        item.styleCode || item.skuCode,
        item.shade || "—",
        item.size || "—",
        item.quantity,
        stock.text,
        item.pickupQuantity,
      ]);
    }
  }

  const aoa: (string | number)[][] = [[`Pick List – ${group.orderNumber}`]];
  if (addonOrderLine) aoa.push([`Addon order ID: ${addonOrderLine}`]);
  if (clientLine) aoa.push([`Client: ${clientLine}`]);
  aoa.push([`Picker: ${pickerLine}`]);
  const noStockCount = countNoStockPickLines(group.items);
  if (noStockCount > 0) {
    aoa.push([`Warning: ${noStockCount} line${noStockCount === 1 ? "" : "s"} with NO STOCK`]);
  }
  aoa.push([...headers]);
  aoa.push(...dataRows);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colCount = headers.length;
  const merges: Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  let mergeRow = 1;
  if (addonOrderLine) {
    merges.push({ s: { r: mergeRow, c: 0 }, e: { r: mergeRow, c: colCount - 1 } });
    mergeRow += 1;
  }
  if (clientLine) {
    merges.push({ s: { r: mergeRow, c: 0 }, e: { r: mergeRow, c: colCount - 1 } });
    mergeRow += 1;
  }
  merges.push({ s: { r: mergeRow, c: 0 }, e: { r: mergeRow, c: colCount - 1 } });
  if (noStockCount > 0) {
    mergeRow += 1;
    merges.push({ s: { r: mergeRow, c: 0 }, e: { r: mergeRow, c: colCount - 1 } });
  }
  ws["!merges"] = merges;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pick List");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${group.orderNumber}-pick-list.xlsx`);
}

/**
 * Open a print window for an order pick list, grouped pair/article wise.
 * @param group - Order pick group
 */
export function printOrderPickList(group: PickListOrderGroup) {
  const clientLine = formatClientLabel({ clientName: group.clientName, clientType: group.clientType });
  const pickerLine = formatPickerLabel(group.pickerName);
  const addonOrderLine = formatAddonOrderLine(group.addonOrderId);
  const noStockCount = countNoStockPickLines(group.items);
  const addonBlock = addonOrderLine
    ? `<div class="meta-line"><strong>Addon order ID:</strong> ${escHtml(addonOrderLine)}</div>`
    : "";
  const clientBlock = clientLine ? `<div class="meta-line"><strong>Client:</strong> ${escHtml(clientLine)}</div>` : "";
  const pickerBlock = `<div class="meta-line"><strong>Picker:</strong> ${escHtml(pickerLine)}</div>`;
  const stockWarningBlock =
    noStockCount > 0
      ? `<div class="stock-alert" role="alert">${noStockCount} style code${noStockCount === 1 ? "" : "s"} with <strong>NO STOCK</strong> — see Stock column below.</div>`
      : "";
  const skuGroups = groupPickItemsBySku(group.items);

  const groupBlocks = skuGroups
    .map((skuGroup) => {
      const itemRows = skuGroup.items
        .map((item) => {
          const stock = formatPickLineStock(item);
          return `<tr class="${stock.noStock ? "no-stock" : ""}">
              <td>${escHtml(item.styleCode || item.skuCode)}</td>
              <td>${escHtml(item.shade || "—")}</td>
              <td>${escHtml(item.size || "—")}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:center" class="${stock.noStock ? "stock-none" : ""}">${escHtml(stock.text)}</td>
              <td style="text-align:center" class="pickup-qty-cell"></td>
            </tr>`;
        })
        .join("");

      return `<div class="sku-group">
        <div class="sku-group-title">${escHtml(skuGroupLabel(skuGroup))} · Total Qty: ${skuGroup.totalQuantity}</div>
        <table>
          <thead>
            <tr>
              <th>Style Code</th>
              <th>Color</th>
              <th>Size</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:center">Stock</th>
              <th style="text-align:center">Pickup Qty</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html><head><title>Pick List – ${group.orderNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1a1a1a}
  h2{font-size:16px;margin-bottom:6px}
  .meta-block{margin-bottom:12px}
  .meta-line{font-size:13px;font-weight:600;color:#374151;margin-bottom:4px}
  .meta{font-size:12px;color:#666;margin-bottom:16px}
  .stock-alert{font-size:12px;font-weight:700;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;padding:8px 10px;margin-bottom:12px;border-radius:4px}
  .sku-group{margin-bottom:16px;page-break-inside:avoid}
  .sku-group-title{font-size:12px;font-weight:700;background:#ede9fe;color:#5b21b6;padding:6px 10px;border:1px solid #d1d5db;border-bottom:none;text-transform:uppercase;letter-spacing:.3px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left}
  th{background:#f3f4f6;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
  tr:nth-child(even){background:#fafafa}
  tr.no-stock{background:#fef2f2!important}
  td.stock-none{color:#b91c1c;font-weight:700;text-transform:uppercase}
  td.pickup-qty-cell{min-height:1.5em}
  .summary{margin-top:12px;font-size:11px;color:#555}
  @media print{body{padding:12px}button{display:none!important}}
</style>
</head><body>
  <h2>Pick List – ${escHtml(group.orderNumber)}</h2>
  <div class="meta-block">
    ${addonBlock}
    ${clientBlock}
    ${pickerBlock}
  </div>
  ${stockWarningBlock}
  <div class="meta">${group.totalItems} items · ${skuGroups.length} pair/article group${skuGroups.length === 1 ? "" : "s"} · Total Qty: ${group.totalQuantity} · Picked: ${group.totalPickupQuantity}</div>
  ${groupBlocks}
  <div class="summary">Printed on ${new Date().toLocaleString()}</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
