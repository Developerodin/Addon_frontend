import * as XLSX from "xlsx";
import type { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";

export interface PurchaseListExportItem {
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  quantity: number;
  receivedQuantity?: number;
  rate: number;
  gst: number;
  subTotal: number;
  estimatedDeliveryDate: string;
}

export interface PurchaseListExportOrder {
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: PurchaseOrderStatus | string;
  subTotal: number;
  totalGst: number;
  totalAmount: number;
  notes: string;
  items: PurchaseListExportItem[];
}

/**
 * Formats a date string for Excel display (DD-MM-YYYY).
 * @param value - ISO or parseable date string
 */
function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Maps purchase orders to flat Excel rows (one row per yarn item).
 * @param orders - Filtered purchase orders to export
 */
function toSheetRows(
  orders: PurchaseListExportOrder[]
): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];

  for (const order of orders) {
    const items = order.items?.length ? order.items : [null];

    for (const item of items) {
      rows.push({
        "PO Number": order.orderNumber,
        Supplier: order.supplier,
        "Order Date": formatDate(order.orderDate),
        "Expected Delivery": formatDate(order.expectedDelivery),
        Status: order.status,
        "Order Sub Total": order.subTotal,
        "Order GST": order.totalGst,
        "Order Total": order.totalAmount,
        Notes: order.notes || "",
        "Yarn Name": item?.yarnName ?? "",
        "Size/Count": item?.sizeCount ?? "",
        "Shade Code": item?.shadeCode ?? "",
        "Quantity (kg)": item?.quantity ?? "",
        "Received Qty (kg)": item?.receivedQuantity ?? "",
        Rate: item?.rate ?? "",
        "Item GST (%)": item?.gst ?? "",
        "Item Sub Total": item?.subTotal ?? "",
        "Item Est. Delivery": item?.estimatedDeliveryDate
          ? formatDate(item.estimatedDeliveryDate)
          : "",
      });
    }
  }

  return rows;
}

/**
 * Downloads purchase orders and yarn line items as an `.xlsx` workbook.
 * @param orders - Orders matching current list filters
 */
export function downloadPurchaseListExcel(
  orders: PurchaseListExportOrder[]
): void {
  const sheetData = toSheetRows(orders);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    sheetData.length > 0 ? sheetData : [{ "PO Number": "No data" }]
  );

  const colWidths = Object.keys(sheetData[0] ?? { A: "" }).map((key) => ({
    wch: Math.min(Math.max(key.length + 2, 12), 36),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Orders");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(workbook, `purchase-orders-${stamp}.xlsx`);
}
