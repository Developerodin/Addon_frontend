import type { ScanSession, ScanSessionItem, WhmsInvoice, WhmsInvoiceItem } from "@/shared/services/whmsFulfilmentService";
import type { WarehouseOrder } from "@/shared/services/whmsWarehouseOrderService";

/** Normalized billing line shown on preview and invoice detail pages. */
export type BillingLineRow = {
  srNo: number;
  styleCode: string;
  skuCode: string;
  size: string;
  shade: string;
  orderQty: number;
  scannedQty: number;
  billQty: number;
  rate?: number;
  amount?: number;
  scanStatus?: string;
};

/**
 * Builds a stable merge key for order, scan, and invoice line rows.
 * @param styleCode - Style code
 * @param size - Size
 * @param shade - Shade / colour
 * @param skuCode - SKU code
 */
export function billingLineKey(styleCode: string, size?: string, shade?: string, skuCode?: string): string {
  return [
    styleCode.trim().toUpperCase(),
    (size || "").trim().toUpperCase(),
    (shade || "").trim().toUpperCase(),
    (skuCode || "").trim().toUpperCase(),
  ].join("|");
}

/**
 * Flattens warehouse order style rows into comparable line quantities.
 * @param order - Warehouse order document
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
 * Builds pre-invoice billing preview lines from order + completed scan session.
 * Bill qty mirrors backend invoice generation (scanned qty > 0).
 * @param order - Warehouse order
 * @param scanSession - Latest scan session for the order
 */
export function buildBillingPreviewLines(order: WarehouseOrder, scanSession: ScanSession | null): BillingLineRow[] {
  const orderQtyMap = new Map<string, number>();
  for (const line of orderLinesFromWarehouseOrder(order)) {
    const key = billingLineKey(line.styleCode, line.size, line.shade);
    orderQtyMap.set(key, (orderQtyMap.get(key) || 0) + line.quantity);
  }

  const scanMap = new Map<string, ScanSessionItem>();
  for (const item of scanSession?.items || []) {
    scanMap.set(billingLineKey(item.styleCode, item.size, item.shade, item.skuCode), item);
  }

  const allKeys = new Set<string>([...orderQtyMap.keys(), ...scanMap.keys()]);

  return [...allKeys]
    .sort()
    .map((key, index) => {
      const scanItem = scanMap.get(key);
      const invoiceItem = scanItem && Number(scanItem.scannedQty || 0) > 0
        ? {
            styleCode: scanItem.styleCode,
            skuCode: scanItem.skuCode,
            size: scanItem.size || "",
            shade: scanItem.shade || "",
            quantity: Number(scanItem.scannedQty || 0),
          }
        : null;

      const [styleCode = "", size = "", shade = ""] = key.split("|");
      const orderQty = orderQtyMap.get(key) ?? scanItem?.expectedQty ?? 0;
      const scannedQty = scanItem?.scannedQty ?? 0;
      const billQty = invoiceItem?.quantity ?? 0;

      return {
        srNo: index + 1,
        styleCode: invoiceItem?.styleCode || scanItem?.styleCode || styleCode,
        skuCode: invoiceItem?.skuCode || scanItem?.skuCode || "",
        size: invoiceItem?.size || scanItem?.size || size,
        shade: invoiceItem?.shade || scanItem?.shade || shade,
        orderQty,
        scannedQty,
        billQty,
        scanStatus: scanItem?.status || "",
      };
    })
    .filter((row) => row.orderQty > 0 || row.scannedQty > 0);
}

/**
 * Converts a saved invoice into display rows for the detail page.
 * @param invoice - Invoice with line items
 */
export function buildInvoiceDetailLines(invoice: WhmsInvoice): BillingLineRow[] {
  return (invoice.items || []).map((item: WhmsInvoiceItem, index) => ({
    srNo: index + 1,
    styleCode: item.styleCode,
    skuCode: item.skuCode || "",
    size: item.size || "",
    shade: item.shade || "",
    orderQty: 0,
    scannedQty: 0,
    billQty: item.quantity,
    rate: item.rate,
    amount: item.amount,
  }));
}

/**
 * Totals for a billing line set.
 * @param lines - Billing line rows
 */
export function billingLineTotals(lines: BillingLineRow[]) {
  return {
    orderQty: lines.reduce((sum, row) => sum + row.orderQty, 0),
    scannedQty: lines.reduce((sum, row) => sum + row.scannedQty, 0),
    billQty: lines.reduce((sum, row) => sum + row.billQty, 0),
    amount: lines.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  };
}
