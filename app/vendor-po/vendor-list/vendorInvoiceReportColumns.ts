import * as XLSX from "xlsx";
import type { VendorInvoiceReportRow } from "@/shared/services/vendorInvoiceReportService";

const HEADER_TH =
  "px-1.5 py-2 text-center text-[11px] font-bold text-gray-900 uppercase tracking-wide border border-gray-400 bg-yellow-300";

const CELL =
  "px-1.5 py-2 border border-gray-200 text-[12px] text-[#323251]";

/**
 * Format an ISO date as M/D/YYYY to match the source spreadsheet.
 * @param value ISO date string or null
 */
export function formatSheetDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * Format invoice value as an unformatted integer (spreadsheet style).
 * @param value Numeric invoice / PO total
 */
export function formatInvoiceValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return String(Math.round(Number(value)));
}

/**
 * Display a qty cell; empty string when null.
 * @param value Number or null
 */
export function formatQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return String(value);
}

/**
 * SHORT/EXC: blank when null/0 (API already nulls zeros).
 * @param value Signed difference Invoice Qty − STN Qty
 */
export function formatShortExc(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return String(value);
}

export const invoiceReportThClass = HEADER_TH;
export const invoiceReportTdClass = CELL;
export const invoiceReportTdCenter = `${CELL} text-center`;
export const invoiceReportTdLeft = `${CELL} text-left`;

/**
 * Map a report row to Excel columns matching the on-screen table.
 * @param row API report row
 */
export function toInvoiceReportExcelRow(row: VendorInvoiceReportRow): Record<string, string | number> {
  return {
    "Vendor Name": row.vendorName || "",
    "PO Number": row.poNumber || "",
    "PO Date": formatSheetDate(row.poDate),
    "Invoice No": row.invoiceNo || "",
    "Inv Date": formatSheetDate(row.invDate),
    "Recd Dt": formatSheetDate(row.recdDt),
    "Invoice Value": row.invoiceValue == null ? "" : Math.round(Number(row.invoiceValue)),
    "No of Box": row.noOfBox == null ? "" : row.noOfBox,
    "Invoice Qty": row.invoiceQty,
    "WH Transfer Qty / STN Qty": row.stnQty,
    M1: row.m1,
    M2: row.m2,
    M3: row.m3,
    M4: row.m4,
    "VM4/PR": row.vm4,
    "SHORT/EXC": formatShortExc(row.shortExc),
    "PENDING INWARD": row.pendingInward,
  };
}

/**
 * Download the current filter set as .xlsx.
 * @param rows Report rows to export
 * @param scope Filename suffix: this page vs full report
 */
export function downloadVendorInvoiceReportExcel(
  rows: VendorInvoiceReportRow[],
  scope: "page" | "full" = "full",
): void {
  const sheetRows = rows.length ? rows.map(toInvoiceReportExcelRow) : [{ Message: "No rows" }];
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");
  XLSX.writeFile(wb, `vendor-invoice-report-${scope}.xlsx`);
}
