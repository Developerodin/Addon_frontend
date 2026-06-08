import * as XLSX from "xlsx";

export interface GoodsReceivedOrderItemExportRow {
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  quantity: number;
  receivedQuantity: number;
  rate: number;
}

export interface GoodsReceivedOrderSummaryExport {
  orderNumber: string;
  supplier: string;
  orderDate: string;
  totalAmount: number;
  items: GoodsReceivedOrderItemExportRow[];
}

/**
 * Formats an ISO date string for Excel display.
 */
function formatOrderDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * Builds a safe filename stem from the PO number.
 */
function safeFileStem(orderNumber: string): string {
  const stem = (orderNumber || "purchase_order").replace(/[^\w\-]+/g, "_").replace(/_+/g, "_");
  return stem.slice(0, 80) || "purchase_order";
}

/**
 * Downloads the goods-received order summary and line items as a single `.xlsx` sheet.
 */
export function downloadGoodsReceivedOrderItemsExcel(
  summary: GoodsReceivedOrderSummaryExport
): void {
  const totalOrdered = summary.items.reduce((sum, row) => sum + (row.quantity || 0), 0);
  const totalReceived = summary.items.reduce((sum, row) => sum + (row.receivedQuantity || 0), 0);

  const rows: (string | number)[][] = [
    ["PO Number", summary.orderNumber],
    ["Supplier", summary.supplier],
    ["Order Date", formatOrderDate(summary.orderDate)],
    ["Total Amount", summary.totalAmount],
    [],
    ["Yarn Name", "Size/Count", "Shade Code", "Quantity", "Qty Received", "Rate"],
    ...summary.items.map((item) => [
      item.yarnName,
      item.sizeCount,
      item.shadeCode,
      item.quantity,
      item.receivedQuantity,
      item.rate,
    ]),
    [],
    ["Totals", "", "", totalOrdered, totalReceived, ""],
    ["Exported at", new Date().toLocaleString()],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Order Items");

  const dateStamp = new Date().toISOString().split("T")[0];
  const fileName = `${safeFileStem(summary.orderNumber)}_order_items_${dateStamp}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
