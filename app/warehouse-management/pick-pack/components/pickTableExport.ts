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
  const headers = ["Pair / Article", "Style Code", "Color", "Size", "Qty", "Pickup Qty"] as const;
  const skuGroups = groupPickItemsBySku(group.items);
  const dataRows: (string | number)[][] = [];

  for (const skuGroup of skuGroups) {
    dataRows.push([skuGroupLabel(skuGroup), "", "", "", skuGroup.totalQuantity, ""]);
    for (const item of skuGroup.items) {
      dataRows.push([
        "",
        item.styleCode || item.skuCode,
        item.shade || "—",
        item.size || "—",
        item.quantity,
        item.pickupQuantity,
      ]);
    }
  }

  const aoa: (string | number)[][] = [[`Pick List – ${group.orderNumber}`]];
  if (clientLine) aoa.push([`Client: ${clientLine}`]);
  aoa.push([...headers]);
  aoa.push(...dataRows);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colCount = headers.length;
  const merges: Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  if (clientLine) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } });
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
  const clientBlock = clientLine ? `<div class="client">Client: ${escHtml(clientLine)}</div>` : "";
  const skuGroups = groupPickItemsBySku(group.items);

  const groupBlocks = skuGroups
    .map((skuGroup) => {
      const itemRows = skuGroup.items
        .map(
          (item) =>
            `<tr>
              <td>${escHtml(item.styleCode || item.skuCode)}</td>
              <td>${escHtml(item.shade || "—")}</td>
              <td>${escHtml(item.size || "—")}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:center" class="pickup-qty-cell"></td>
            </tr>`,
        )
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
  h2{font-size:16px;margin-bottom:4px}
  .client{font-size:13px;font-weight:600;color:#374151;margin-bottom:8px}
  .meta{font-size:12px;color:#666;margin-bottom:16px}
  .sku-group{margin-bottom:16px;page-break-inside:avoid}
  .sku-group-title{font-size:12px;font-weight:700;background:#ede9fe;color:#5b21b6;padding:6px 10px;border:1px solid #d1d5db;border-bottom:none;text-transform:uppercase;letter-spacing:.3px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left}
  th{background:#f3f4f6;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
  tr:nth-child(even){background:#fafafa}
  td.pickup-qty-cell{min-height:1.5em}
  .summary{margin-top:12px;font-size:11px;color:#555}
  @media print{body{padding:12px}button{display:none!important}}
</style>
</head><body>
  <h2>Pick List – ${group.orderNumber}</h2>
  ${clientBlock}
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
