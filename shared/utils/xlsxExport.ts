import * as XLSX from "xlsx";

/**
 * Build a dated .xlsx filename.
 * @param prefix File prefix (e.g. core-report)
 */
export function datedXlsxFilename(prefix: string): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `${prefix}-${ts}.xlsx`;
}

/**
 * Download an array-of-arrays workbook as .xlsx.
 * @param filename Download filename
 * @param sheetName Worksheet name (trimmed to Excel's 31-char limit)
 * @param rows Header + data rows
 */
export function downloadXlsxAoa(
  filename: string,
  sheetName: string,
  rows: (string | number)[][],
): void {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
