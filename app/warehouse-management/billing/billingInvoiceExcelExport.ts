import * as XLSX from "xlsx";
import {
  whmsInvoices,
  whmsScanning,
  type ScanSessionItem,
  type WhmsInvoice,
} from "@/shared/services/whmsFulfilmentService";
import {
  whmsWarehouseOrders,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";

/** Line identity for merging order, scan, and invoice rows. */
function lineKey(styleCode: string, size?: string, shade?: string, skuCode?: string): string {
  return [
    styleCode.trim().toUpperCase(),
    (size || "").trim().toUpperCase(),
    (shade || "").trim().toUpperCase(),
    (skuCode || "").trim().toUpperCase(),
  ].join("|");
}

/**
 * Flatten warehouse order style rows into comparable line quantities.
 * @param order - Warehouse order with single/multi pair lines
 */
function orderLinesFromWarehouseOrder(order: WarehouseOrder) {
  const rows: Array<{ styleCode: string; size?: string; shade?: string; quantity: number }> = [];
  for (const row of order.styleCodeSinglePair || []) {
    rows.push({
      styleCode: row.styleCode || "",
      shade: row.colour,
      quantity: Number(row.quantity || 0),
    });
  }
  for (const row of order.styleCodeMultiPair || []) {
    rows.push({
      styleCode: row.styleCode || "",
      shade: row.colour,
      quantity: Number(row.quantity || 0),
    });
  }
  return rows;
}

/**
 * Resolve display fields for a merged export line.
 * @param key - Normalized line key
 * @param invoiceItem - Matching invoice line, if any
 * @param scanItem - Matching scan line, if any
 */
function resolveLineFields(
  key: string,
  invoiceItem?: WhmsInvoice["items"][number],
  scanItem?: ScanSessionItem,
) {
  const [styleCode = "", size = "", shade = ""] = key.split("|");
  return {
    styleCode: invoiceItem?.styleCode || scanItem?.styleCode || styleCode,
    skuCode: invoiceItem?.skuCode || scanItem?.skuCode || "",
    size: invoiceItem?.size || scanItem?.size || size,
    shade: invoiceItem?.shade || scanItem?.shade || shade,
  };
}

/**
 * Downloads an invoice billing tracker Excel with order, scanned, and sending quantities.
 * @param invoice - Invoice row from billing list (full detail is fetched)
 * @returns Number of line rows exported
 */
export async function downloadBillingInvoiceExcel(invoice: WhmsInvoice): Promise<number> {
  const orderId = String(invoice.orderId);

  const [fullInvoice, scanSession, order] = await Promise.all([
    whmsInvoices.get(invoice.id),
    whmsScanning.getLatestScanSessionForOrder(orderId).catch(() => null),
    whmsWarehouseOrders.get(orderId).catch(() => null),
  ]);

  const orderQtyMap = new Map<string, number>();
  if (order) {
    for (const line of orderLinesFromWarehouseOrder(order)) {
      const key = lineKey(line.styleCode, line.size, line.shade);
      orderQtyMap.set(key, (orderQtyMap.get(key) || 0) + line.quantity);
    }
  }

  const scanMap = new Map<string, ScanSessionItem>();
  for (const item of scanSession?.items || []) {
    scanMap.set(lineKey(item.styleCode, item.size, item.shade, item.skuCode), item);
  }

  const invoiceMap = new Map<string, WhmsInvoice["items"][number]>();
  for (const item of fullInvoice.items || []) {
    invoiceMap.set(lineKey(item.styleCode, item.size, item.shade, item.skuCode), item);
  }

  const allKeys = new Set<string>([
    ...invoiceMap.keys(),
    ...scanMap.keys(),
    ...orderQtyMap.keys(),
  ]);

  const lineRows = [...allKeys]
    .sort()
    .map((key, index) => {
      const invoiceItem = invoiceMap.get(key);
      const scanItem = scanMap.get(key);
      const fields = resolveLineFields(key, invoiceItem, scanItem);
      const orderQty = orderQtyMap.get(key) ?? scanItem?.expectedQty ?? 0;
      const scannedQty = scanItem?.scannedQty ?? 0;
      const sendingQty = invoiceItem?.quantity ?? 0;

      return {
        "Sr No": index + 1,
        "Invoice #": fullInvoice.invoiceNumber,
        "Order #": fullInvoice.orderNumber || "",
        "Addon Order ID": fullInvoice.addonOrderId || "",
        Client: fullInvoice.clientName || "",
        "Style Code": fields.styleCode,
        SKU: fields.skuCode,
        Size: fields.size,
        Shade: fields.shade,
        "Order Qty": orderQty,
        "Scanned Qty": scannedQty,
        "Sending Qty (Invoice)": sendingQty,
        "Order vs Sending": sendingQty - orderQty,
        "Scanned vs Sending": sendingQty - scannedQty,
        "Scan Status": scanItem?.status || "",
        Rate: invoiceItem?.rate ?? "",
        Amount: invoiceItem?.amount ?? "",
      };
    });

  const totalOrderQty = lineRows.reduce((sum, row) => sum + Number(row["Order Qty"] || 0), 0);
  const totalScannedQty = lineRows.reduce((sum, row) => sum + Number(row["Scanned Qty"] || 0), 0);
  const totalSendingQty = lineRows.reduce((sum, row) => sum + Number(row["Sending Qty (Invoice)"] || 0), 0);

  const summaryRows = [
    { Field: "Invoice #", Value: fullInvoice.invoiceNumber },
    { Field: "Order #", Value: fullInvoice.orderNumber || "" },
    { Field: "Addon Order ID", Value: fullInvoice.addonOrderId || "" },
    { Field: "Client", Value: fullInvoice.clientName || "" },
    { Field: "Invoice Status", Value: fullInvoice.status },
    { Field: "Billed By", Value: fullInvoice.createdByName || "" },
    {
      Field: "Invoice Created",
      Value: fullInvoice.createdAt ? new Date(fullInvoice.createdAt).toLocaleString() : "",
    },
    { Field: "Scan Session Status", Value: scanSession?.status || "" },
    {
      Field: "Scan Completed",
      Value: scanSession?.completedAt ? new Date(scanSession.completedAt).toLocaleString() : "",
    },
    { Field: "Total Order Qty", Value: totalOrderQty },
    { Field: "Total Scanned Qty", Value: totalScannedQty },
    { Field: "Total Sending Qty", Value: totalSendingQty },
    { Field: "Total Order vs Sending", Value: totalSendingQty - totalOrderQty },
    { Field: "Total Scanned vs Sending", Value: totalSendingQty - totalScannedQty },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lineRows), "Line Items");

  const safeName = (fullInvoice.invoiceNumber || fullInvoice.id)
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);

  XLSX.writeFile(workbook, `${safeName || "invoice"}-billing-tracker.xlsx`);
  return lineRows.length;
}
