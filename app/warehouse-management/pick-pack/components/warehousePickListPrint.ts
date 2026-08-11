/**
 * Shared warehouse pick-list print layout (Pick & Pack batch panel + Order Flow modal).
 */
import type { PickListPrintPayload } from "@/shared/services/whmsFulfilmentService";
import type { PickListBatchDetail } from "@/shared/services/whmsPickListBatchService";
import { formatPickerLabel } from "./pickTableExport";
import { printHtmlViaHiddenFrame } from "./printHtmlViaHiddenFrame";

const escHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One printable pick line (batch item or order print payload row). */
export type WarehousePickListPrintLine = {
  styleCode: string;
  skuCode: string;
  size?: string;
  shade?: string;
  requiredQty: number;
  availableStock?: number;
};

type WarehousePickListPrintOptions = {
  title: string;
  subtitle: string;
  orderLabels: string[];
  clientNames?: string[];
  pickerName?: string;
  generatedByName?: string;
  items: WarehousePickListPrintLine[];
  footerNote?: string;
  printTitle: string;
};

/**
 * Stock display for a pick line.
 * @param availableStock - Live available quantity when known
 */
function formatLineStock(availableStock?: number): { text: string; noStock: boolean } {
  if (typeof availableStock !== "number" || Number.isNaN(availableStock)) {
    return { text: "NO STOCK", noStock: true };
  }
  if (availableStock <= 0) return { text: "NO STOCK", noStock: true };
  return { text: String(availableStock), noStock: false };
}

/**
 * Build order chip HTML for the print header.
 * @param labels - Display labels (order # · Addon: …)
 */
function formatOrderChipsHtml(labels: string[]): string {
  if (!labels.length) return "—";
  return labels.map((label) => `<span class="orders-chip">${escHtml(label)}</span>`).join("");
}

/**
 * Builds the full HTML document for the warehouse pick list print layout.
 * @param options - Print metadata and line items
 */
export function buildWarehousePickListPrintHtml(options: WarehousePickListPrintOptions): string {
  const {
    title,
    subtitle,
    orderLabels,
    clientNames,
    pickerName,
    generatedByName,
    items,
    footerNote,
    printTitle,
  } = options;
  const pickerLine = formatPickerLabel(pickerName);
  const orderChipsHtml = formatOrderChipsHtml(orderLabels);
  const clientChipsHtml = formatOrderChipsHtml(
    [...new Set((clientNames || []).map((n) => n.trim()).filter(Boolean))],
  );
  const hasClients = (clientNames || []).some((n) => String(n || "").trim());
  const totalRequired = items.reduce((s, i) => s + Number(i.requiredQty || 0), 0);
  const noStockCount = items.filter((i) => formatLineStock(i.availableStock).noStock).length;

  const stockWarningBlock =
    noStockCount > 0
      ? `<div class="stock-alert" role="alert">${noStockCount} style code${noStockCount === 1 ? "" : "s"} with <strong>NO STOCK</strong>.</div>`
      : "";

  const itemRows = items
    .map((item, index) => {
      const stock = formatLineStock(item.availableStock);
      const sizeShade = [item.size, item.shade].filter(Boolean).join(" · ") || "—";

      return `<tr class="${stock.noStock ? "no-stock" : ""}">
        <td style="text-align:center">${index + 1}</td>
        <td><strong>${escHtml(item.styleCode)}</strong><br><span class="sub">${escHtml(item.skuCode)}</span></td>
        <td>${escHtml(sizeShade)}</td>
        <td style="text-align:center">${item.requiredQty}</td>
        <td style="text-align:center" class="${stock.noStock ? "stock-none" : ""}">${escHtml(stock.text)}</td>
        <td class="pickup-qty-cell"></td>
        <td class="sign-cell"></td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><title>${escHtml(printTitle)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1a1a1a}
  h1{font-size:18px;margin-bottom:4px}
  h2{font-size:13px;font-weight:600;color:#5b21b6;margin-bottom:12px}
  .meta-block{margin-bottom:12px}
  .meta-line{font-size:13px;font-weight:600;color:#374151;margin-bottom:4px}
  .meta{font-size:12px;color:#666;margin-bottom:16px}
  .stock-alert{font-size:12px;font-weight:700;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;padding:8px 10px;margin-bottom:12px;border-radius:4px}
  .orders-chip{display:inline-block;background:#ede9fe;color:#5b21b6;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin:2px 4px 2px 0}
  table.main{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  table.main th,table.main td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}
  table.main th{background:#f3f4f6;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.4px}
  table.main tr:nth-child(even){background:#fafafa}
  table.main tr.no-stock{background:#fef2f2!important}
  td.stock-none{color:#b91c1c;font-weight:700;text-transform:uppercase}
  td.pickup-qty-cell,td.sign-cell{min-width:56px;min-height:28px}
  .sub{font-size:10px;color:#6b7280}
  .footer{margin-top:16px;font-size:11px;color:#555;border-top:1px solid #e5e7eb;padding-top:10px}
  .instructions{font-size:11px;color:#4b5563;background:#f9fafb;border:1px dashed #d1d5db;padding:8px 10px;margin-bottom:12px;border-radius:4px}
  @media print{body{padding:12px}.instructions{display:none}}
</style>
</head><body>
  <h1>${escHtml(title)}</h1>
  <h2>${escHtml(subtitle)}</h2>
  <div class="meta-block">
    <div class="meta-line"><strong>Orders:</strong> ${orderChipsHtml}</div>
    ${hasClients ? `<div class="meta-line"><strong>Client:</strong> ${clientChipsHtml}</div>` : ""}
    <div class="meta-line"><strong>Picker:</strong> ${escHtml(pickerLine)}</div>
    ${generatedByName ? `<div class="meta-line"><strong>Generated by:</strong> ${escHtml(generatedByName)}</div>` : ""}
  </div>
  <div class="instructions">
    Take this sheet to the warehouse. Enter picked quantities in the <strong>Picked Qty</strong> column by hand.
    Supervisor enters the same quantities on the Pick &amp; Pack screen after picking.
  </div>
  ${stockWarningBlock}
  <div class="meta">${items.length} style line${items.length === 1 ? "" : "s"} · Total required: ${totalRequired}</div>
  <table class="main">
    <thead>
      <tr>
        <th style="text-align:center;width:32px">#</th>
        <th>Style Code</th>
        <th>Size / Shade</th>
        <th style="text-align:center">Req Qty</th>
        <th style="text-align:center">Stock</th>
        <th style="text-align:center">Picked Qty</th>
        <th style="text-align:center;width:48px">✓</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="footer">
    Printed on ${new Date().toLocaleString()} · ${escHtml(subtitle)}
    ${footerNote ? ` · ${escHtml(footerNote)}` : ""}
  </div>
</body></html>`;
}

/**
 * Print a pick-list batch using the standard warehouse layout.
 * @param batch - Full batch detail from the API
 */
export function printBatchPickList(batch: PickListBatchDetail) {
  const items = (batch.items || []).map((item) => ({
    styleCode: item.styleCode,
    skuCode: item.skuCode,
    size: item.size,
    shade: item.shade,
    requiredQty: Number(item.requiredQty || 0),
    availableStock: item.availableStock,
  }));

  const orderLabels =
    batch.orders?.length
      ? batch.orders.map((o) => {
          const num = (o.orderNumber || o.id || "").trim() || "—";
          const addon = (o.addonOrderId || "").trim();
          return addon ? `${num} · Addon: ${addon}` : num;
        })
      : (batch.orderNumbers || []).map((n) => n);

  const clientNames = [
    ...new Set(
      (batch.orders || [])
        .map((o) => (o.clientName || "").trim())
        .filter(Boolean),
    ),
  ];

  const isCombined = batch.type === "combined";
  const typeLabel = isCombined ? "Combined Pick List" : "Pick List";

  const html = buildWarehousePickListPrintHtml({
    title: typeLabel,
    subtitle: batch.batchNumber,
    orderLabels,
    clientNames,
    pickerName: batch.pickerName,
    generatedByName: batch.createdByName,
    items,
    footerNote: isCombined ? "Combined orders — quantities aggregated by style code" : undefined,
    printTitle: `${typeLabel} – ${batch.batchNumber}`,
  });

  printHtmlViaHiddenFrame(html, `Print pick list — ${batch.batchNumber}`);
}

/**
 * Print a single order pick list (Order Flow modal) in the same layout as Pick & Pack batch print.
 * @param payload - Print payload from GET /pick-list/order/:orderId/print
 */
export function printOrderPickListFromPayload(payload: PickListPrintPayload) {
  const order = payload.order;
  const orderNumber = (order.orderNumber || order.id || "").trim() || "—";
  const addon = (order.addonOrderId || "").trim();
  const orderLabel = addon ? `${orderNumber} · Addon: ${addon}` : orderNumber;
  const clientName = (order.clientName || "").trim();

  const items: WarehousePickListPrintLine[] = (payload.items || []).map((item) => ({
    styleCode: item.styleCode,
    skuCode: item.skuCode,
    size: item.size,
    shade: item.shade,
    requiredQty: Number(item.quantity || 0),
    availableStock: item.availableStock,
  }));

  const html = buildWarehousePickListPrintHtml({
    title: "Pick List",
    subtitle: orderNumber,
    orderLabels: [orderLabel],
    clientNames: clientName ? [clientName] : undefined,
    pickerName: order.pickerName,
    items,
    printTitle: `Pick List – ${orderNumber}`,
  });

  const opened = printHtmlViaHiddenFrame(html, `Print pick list — ${orderNumber}`);
  if (!opened) {
    throw new Error("Could not open print dialog");
  }
}
