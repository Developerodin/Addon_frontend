import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  warehouseOrderFlowStatusLabel,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import type { DispatchDetailsBulkImportResult } from "@/shared/services/whmsFulfilmentService";

const TEMPLATE_FILENAME = "dispatch-details-import-template.xlsx";

const DISPATCH_EXCEL_HEADERS = [
  "Order Number",
  "Order ID",
  "Client Name",
  "Flow Status",
  "Courier / Transport Company",
  "Tracking Number / AWB",
  "Vehicle Details",
  "Boxes / Cartons",
  "Shipping Remarks",
] as const;

export interface DispatchDetailsImportRow {
  rowNumber: number;
  orderNumber: string;
  orderId?: string;
  courierName?: string;
  trackingNumber?: string;
  vehicleDetails?: string;
  boxCount?: number | string;
  shippingRemarks?: string;
}

/**
 * Normalize Excel header cells for flexible column matching.
 * @param cell - Raw header cell
 */
export function dispatchImportHeaderKey(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, "");
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function rowToKeyMap(row: Record<string, unknown>): Map<string, unknown> {
  const map = new Map<string, unknown>();
  Object.entries(row).forEach(([key, value]) => {
    map.set(dispatchImportHeaderKey(key), value);
  });
  return map;
}

/**
 * Map a warehouse order to an export/template row.
 * @param order - Warehouse order
 */
function orderToDispatchExcelRow(order: WarehouseOrder) {
  return {
    "Order Number": order.orderNumber || "",
    "Order ID": order.id,
    "Client Name": order.clientName || "",
    "Flow Status": warehouseOrderFlowStatusLabel(String(order.flowStatus || "")),
    "Courier / Transport Company": order.dispatch?.courierName || "",
    "Tracking Number / AWB": order.dispatch?.trackingNumber || "",
    "Vehicle Details": order.dispatch?.vehicleDetails || "",
    "Boxes / Cartons": order.dispatch?.boxCount ?? "",
    "Shipping Remarks": order.dispatch?.shippingRemarks || "",
  };
}

/**
 * Build workbook for dispatch-details template or export.
 * @param orders - Optional orders to pre-fill
 */
function buildDispatchDetailsWorkbook(orders: WarehouseOrder[] = []) {
  const exampleRows =
    orders.length > 0
      ? orders.map(orderToDispatchExcelRow)
      : [
          {
            "Order Number": "WO-2026-00001",
            "Order ID": "",
            "Client Name": "Example Client",
            "Flow Status": "Ready to Dispatch",
            "Courier / Transport Company": "BlueDart",
            "Tracking Number / AWB": "AWB123456789",
            "Vehicle Details": "MH-12-AB-1234",
            "Boxes / Cartons": 2,
            "Shipping Remarks": "Handle with care",
          },
        ];

  const instructions = [
    ["Dispatch details bulk import"],
    [""],
    ["Fill shipment columns for each order. Courier and AWB can be added later after dispatch."],
    ["Order Number is required. Order ID is optional but helps when order numbers repeat."],
    ["Client Name and Flow Status are reference only — they are not imported."],
    ["Leave a shipment column blank to keep the existing value for that field."],
    ["Orders must already be dispatched, partial-dispatch, ready-for-pickup, or delivered."],
    [""],
    ["Columns"],
    ...DISPATCH_EXCEL_HEADERS.map((header) => [header]),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exampleRows), "DispatchDetails");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), "Instructions");
  return workbook;
}

/**
 * Download an empty dispatch-details import template.
 */
export function downloadDispatchDetailsTemplate(): void {
  const workbook = buildDispatchDetailsWorkbook();
  XLSX.writeFile(workbook, TEMPLATE_FILENAME);
}

/**
 * Export current dispatch orders with existing shipment details filled in.
 * @param orders - Orders from the dispatch workboard
 * @param tabLabel - active | shipped — used in filename
 */
export function exportDispatchDetailsExcel(orders: WarehouseOrder[], tabLabel: string): void {
  const workbook = buildDispatchDetailsWorkbook(orders);
  const date = new Date().toISOString().slice(0, 10);
  const safeTab = tabLabel.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  XLSX.writeFile(workbook, `dispatch-details-${safeTab}-${date}.xlsx`);
}

/**
 * Parse an uploaded dispatch-details Excel file into API import rows.
 * @param buf - File array buffer
 */
export function parseDispatchDetailsImportFile(buf: ArrayBuffer): {
  rows: DispatchDetailsImportRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const workbook = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((name) => dispatchImportHeaderKey(name) === "dispatchdetails") ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { rows: [], errors: ["No sheet found in workbook"] };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rawRows.length) {
    return { rows: [], errors: ["No data rows found"] };
  }

  const rows: DispatchDetailsImportRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const map = rowToKeyMap(raw);
    const orderNumber = str(map.get("ordernumber"));
    const orderId = str(map.get("orderid"));
    const courierName = str(map.get("couriertransportcompany") || map.get("couriername"));
    const trackingNumber = str(map.get("trackingnumberawb") || map.get("trackingnumber"));
    const vehicleDetails = str(map.get("vehicledetails"));
    const boxRaw = map.get("boxescartons") ?? map.get("boxcount");
    const shippingRemarks = str(map.get("shippingremarks"));

    if (!orderNumber && !orderId) {
      if (courierName || trackingNumber || vehicleDetails || str(boxRaw) || shippingRemarks) {
        errors.push(`Row ${rowNumber}: Order Number or Order ID is required`);
      }
      return;
    }

    if (orderNumber.toUpperCase() === "WO-2026-00001" && !orderId && !courierName && !trackingNumber) {
      return;
    }

    const row: DispatchDetailsImportRow = { rowNumber, orderNumber, orderId };
    if (courierName) row.courierName = courierName;
    if (trackingNumber) row.trackingNumber = trackingNumber;
    if (vehicleDetails) row.vehicleDetails = vehicleDetails;
    if (shippingRemarks) row.shippingRemarks = shippingRemarks;
    if (str(boxRaw) !== "") {
      const boxCount = Number(boxRaw);
      if (!Number.isFinite(boxCount) || boxCount < 0) {
        errors.push(`Row ${rowNumber}: Boxes / Cartons must be a number >= 0`);
        return;
      }
      row.boxCount = Math.floor(boxCount);
    }

    const hasAnyField =
      row.courierName ||
      row.trackingNumber ||
      row.vehicleDetails ||
      row.boxCount !== undefined ||
      row.shippingRemarks;
    if (!hasAnyField) {
      errors.push(`Row ${rowNumber}: fill at least one shipment column to update`);
      return;
    }

    rows.push(row);
  });

  return { rows, errors };
}

/**
 * Save parsed import rows to a result workbook for review.
 * @param result - Bulk import API response
 */
export function downloadDispatchImportResultReport(result: DispatchDetailsBulkImportResult): void {
  const successRows = result.updated.map((row) => ({
    "Row #": row.rowNumber,
    "Order Number": row.orderNumber || "",
    "Order ID": row.orderId,
    "Flow Status": row.flowStatus || "",
    Result: "Updated",
  }));
  const failedRows = result.failed.map((row) => ({
    "Row #": row.rowNumber,
    "Order Number": row.orderNumber || "",
    Result: "Failed",
    Message: row.message,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(successRows), "Updated");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(failedRows), "Failed");
  saveAs(
    new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })], {
      type: "application/octet-stream",
    }),
    `dispatch-import-result-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
