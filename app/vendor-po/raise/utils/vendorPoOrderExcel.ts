/**
 * Vendor PO Excel/CSV template download and client-side parse.
 * XLSX: Order + Items + Instructions sheets. CSV: header columns repeated per item row.
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const VENDOR_PO_ORDER_SHEET = "Order";
export const VENDOR_PO_ITEMS_SHEET = "Items";
export const VENDOR_PO_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const VENDOR_PO_MAX_ITEM_ROWS = 3000;

const ORDER_HEADERS = [
  "Vendor Code",
  "Credit Days",
  "Estimated Order Delivery Date",
  "Notes",
] as const;

const ITEM_HEADERS = [
  "Article Vendor Code",
  "Factory Code",
  "Quantity",
  "Rate",
  "GST (%)",
  "Estimated Delivery Date",
] as const;

export type ParsedVendorPoOrderHeader = {
  vendorCode: string;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
  notes: string;
};

export type ParsedVendorPoItemRow = {
  rowNumber: number;
  articleVendorCode: string;
  factoryCode: string;
  quantity: number;
  rate: number;
  gstRate: number;
  estimatedDeliveryDate: string;
};

export type ParsedVendorPoOrderFile = {
  header: ParsedVendorPoOrderHeader;
  items: ParsedVendorPoItemRow[];
  errors: string[];
};

/**
 * Default estimated delivery: first day of next month (YYYY-MM-DD).
 */
function defaultEstDelivery(): string {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return first.toISOString().split("T")[0];
}

/**
 * Parse Excel serial date or date string to YYYY-MM-DD.
 */
export function parseVendorPoExcelDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  const dateStr = String(value).trim();
  if (!dateStr) return "";

  if (/^\d+\.?\d*$/.test(dateStr)) {
    const serial = parseFloat(dateStr);
    if (serial > 0 && serial < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
  }

  const parts = dateStr.match(/^(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})$/);
  if (parts) {
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    const p3 = parseInt(parts[3], 10);
    let y: number;
    let m: number;
    let day: number;
    if (parts[1].length === 4) {
      y = p1;
      m = p2 - 1;
      day = p3;
    } else {
      day = p1;
      m = p2 - 1;
      y = p3;
      if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    }
    const d = new Date(Date.UTC(y, m, day));
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  return "";
}

/**
 * Read a trimmed string from a row by matching header aliases (case-insensitive).
 */
function strFromRow(row: Record<string, unknown>, keys: string[]): string {
  const key = Object.keys(row).find((k) => keys.includes(k.trim().toLowerCase()));
  if (key == null) return "";
  const v = row[key];
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Parse a numeric cell; empty → 0.
 */
function numFromRow(row: Record<string, unknown>, keys: string[]): number {
  const raw = strFromRow(row, keys);
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Whether a cell looks like a template example (e.g. "e.g. V001").
 */
function isExampleValue(value: string): boolean {
  return /^e\.g\.?\b/i.test(value.trim());
}

/**
 * Build and download the vendor PO order Excel template.
 */
export function downloadVendorPoOrderTemplate(): void {
  const wb = XLSX.utils.book_new();
  const edd = defaultEstDelivery();

  const orderWs = XLSX.utils.aoa_to_sheet([
    [...ORDER_HEADERS],
    ["e.g. V001", 30, edd, ""],
  ]);
  orderWs["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, orderWs, VENDOR_PO_ORDER_SHEET);

  const itemsWs = XLSX.utils.aoa_to_sheet([
    [...ITEM_HEADERS],
    ["e.g. VC-1001", "FC-1001", 100, 50, 5, edd],
    ["", "", "", "", "", ""],
  ]);
  itemsWs["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, itemsWs, VENDOR_PO_ITEMS_SHEET);

  const instructions = [
    { Field: "LAYOUT", Description: "XLSX: fill Order (1 row) and Items (one row per article). CSV: repeat Order columns on every item row." },
    { Field: "Vendor Code", Description: "Required. Vendor master code (header.vendorCode). One file = one order." },
    { Field: "Credit Days", Description: "Optional. Must be 0 or greater. Defaults to 0." },
    { Field: "Estimated Order Delivery Date", Description: "Required. YYYY-MM-DD." },
    { Field: "Notes", Description: "Optional order notes." },
    { Field: "Article Vendor Code", Description: "Primary article key — Product vendorCode (same as the article picker)." },
    { Field: "Factory Code", Description: "Fallback if Article Vendor Code is blank. Must belong to the vendor catalog." },
    { Field: "Quantity", Description: "Required. Must be greater than 0." },
    { Field: "Rate / GST (%)", Description: "Optional on draft. Required later when submitting to supplier." },
    { Field: "Estimated Delivery Date (Items)", Description: "Optional per-line EDD. YYYY-MM-DD." },
    { Field: "UNIQUENESS", Description: "Each article may appear only once. Duplicate vendor/factory codes in the file are rejected." },
    { Field: "CATALOG", Description: "Every article must already be assigned to that vendor. Unknown codes abort the import — no PO is created." },
    { Field: "LIMITS", Description: `Max ${VENDOR_PO_MAX_ITEM_ROWS} item rows. Max file size 10MB. .xlsx, .xls, .csv.` },
  ];
  const instWs = XLSX.utils.json_to_sheet(instructions);
  instWs["!cols"] = [{ wch: 36 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, instWs, "Instructions");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    "vendor-po-order-template.xlsx"
  );
}

/**
 * Download a row-error report as xlsx.
 */
export function downloadVendorPoImportErrors(errors: string[]): void {
  const wb = XLSX.utils.book_new();
  const rows = errors.map((message) => ({ Error: message }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Error: "No errors" }]);
  ws["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    "vendor-po-import-errors.xlsx"
  );
}

function emptyHeader(): ParsedVendorPoOrderHeader {
  return { vendorCode: "", creditDays: 0, estimatedOrderDeliveryDate: "", notes: "" };
}

/**
 * Parse header fields from a row that may use Order or combined CSV column names.
 */
function parseHeaderFromRow(row: Record<string, unknown>): ParsedVendorPoOrderHeader {
  const vendorCode = strFromRow(row, ["vendor code", "vendorcode", "vendor_code"]);
  const notes = strFromRow(row, ["notes", "remarks"]);
  const creditDays = numFromRow(row, ["credit days", "creditdays", "credit_days"]);
  const estimatedOrderDeliveryDate = parseVendorPoExcelDate(
    strFromRow(row, [
      "estimated order delivery date",
      "estimatedorderdeliverydate",
      "order delivery date",
      "edd",
    ]) || undefined
  );
  return {
    vendorCode: isExampleValue(vendorCode) ? "" : vendorCode,
    creditDays: creditDays >= 0 ? creditDays : 0,
    estimatedOrderDeliveryDate,
    notes,
  };
}

/**
 * Parse one item row. Returns null for blank/example rows.
 */
function parseItemFromRow(
  row: Record<string, unknown>,
  rowNumber: number
): { item: ParsedVendorPoItemRow | null; error?: string } {
  const articleVendorCode = strFromRow(row, [
    "article vendor code",
    "articlevendorcode",
    "article_vendor_code",
    "article code",
    "vendor article code",
  ]);
  const factoryCode = strFromRow(row, ["factory code", "factorycode", "factory_code"]);
  const quantity = numFromRow(row, ["quantity", "qty", "ordered qty", "orderedqty"]);
  const rate = numFromRow(row, ["rate", "rate (₹)"]);
  const gstRate = numFromRow(row, ["gst (%)", "gst", "gst%"]);
  const estimatedDeliveryDate = parseVendorPoExcelDate(
    strFromRow(row, [
      "estimated delivery date",
      "line estimated delivery date",
      "line edd",
      "item edd",
    ])
  );

  const avc = isExampleValue(articleVendorCode) ? "" : articleVendorCode;
  const fc = isExampleValue(factoryCode) ? "" : factoryCode;
  if (isExampleValue(articleVendorCode) || isExampleValue(factoryCode)) {
    return { item: null };
  }
  const blank =
    !avc &&
    !fc &&
    quantity === 0 &&
    rate === 0 &&
    gstRate === 0 &&
    !estimatedDeliveryDate;
  if (blank) return { item: null };

  if (!avc && !fc) {
    return { item: null, error: `Row ${rowNumber}: Article Vendor Code or Factory Code is required.` };
  }
  if (quantity <= 0) {
    return { item: null, error: `Row ${rowNumber}: Quantity must be greater than 0.` };
  }

  return {
    item: {
      rowNumber,
      articleVendorCode: avc,
      factoryCode: fc,
      quantity,
      rate: rate >= 0 ? rate : 0,
      gstRate: gstRate >= 0 ? gstRate : 0,
      estimatedDeliveryDate,
    },
  };
}

function sheetToRows(ws: XLSX.WorkSheet | undefined): Record<string, unknown>[] {
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
}

function findSheet(wb: XLSX.WorkBook, name: string): XLSX.WorkSheet | undefined {
  const found = wb.SheetNames.find((n) => n.trim().toLowerCase() === name.toLowerCase());
  return found ? wb.Sheets[found] : undefined;
}

/**
 * Collect item rows from a sheet, appending parse errors.
 */
function collectItems(
  rows: Record<string, unknown>[],
  errors: string[],
  headerRowOffset: number
): ParsedVendorPoItemRow[] {
  const items: ParsedVendorPoItemRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (items.length >= VENDOR_PO_MAX_ITEM_ROWS) {
      errors.push(`Too many item rows. Maximum is ${VENDOR_PO_MAX_ITEM_ROWS}.`);
      break;
    }
    const { item, error } = parseItemFromRow(rows[i], i + headerRowOffset);
    if (error) errors.push(error);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Parse an uploaded .xlsx/.xls/.csv ArrayBuffer into one order header + item rows.
 */
export function parseVendorPoOrderBuffer(buffer: ArrayBuffer, fileName: string): ParsedVendorPoOrderFile {
  const errors: string[] = [];
  const isCsv = /\.csv$/i.test(fileName);
  const wb = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: false,
  });

  const orderSheet = findSheet(wb, VENDOR_PO_ORDER_SHEET);
  const itemsSheet = findSheet(wb, VENDOR_PO_ITEMS_SHEET);

  let header = emptyHeader();
  let items: ParsedVendorPoItemRow[] = [];

  if (!isCsv && (orderSheet || itemsSheet)) {
    const orderRows = sheetToRows(orderSheet);
    if (orderRows.length) {
      header = parseHeaderFromRow(orderRows[0]);
    }
    const itemRows = sheetToRows(itemsSheet ?? wb.Sheets[wb.SheetNames[0]]);
    items = collectItems(itemRows, errors, 2);
  } else {
    const first = wb.Sheets[wb.SheetNames[0]];
    const rows = sheetToRows(first);
    if (!rows.length) {
      return { header, items: [], errors: ["No data rows in the file."] };
    }
    header = parseHeaderFromRow(rows[0]);
    items = collectItems(rows, errors, 2);
  }

  if (!items.length && !errors.length) {
    errors.push("No valid item rows. Fill Article Vendor Code (or Factory Code) and Quantity.");
  }

  return { header, items, errors };
}

/**
 * Read a File as ArrayBuffer and parse it. Rejects oversized files.
 */
export async function parseVendorPoOrderFile(file: File): Promise<ParsedVendorPoOrderFile> {
  if (file.size > VENDOR_PO_MAX_FILE_BYTES) {
    return {
      header: emptyHeader(),
      items: [],
      errors: ["File is larger than 10MB. Split the order or save as CSV."],
    };
  }
  const buffer = await file.arrayBuffer();
  return parseVendorPoOrderBuffer(buffer, file.name);
}
