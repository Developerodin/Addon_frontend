/**
 * Escape a cell value for CSV export (RFC-style quoting).
 * @param value - Raw cell value
 */
export function csvCell(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Trigger a CSV download in the browser (Excel-compatible).
 * @param filename - Download filename
 * @param rows - CSV rows including header row
 */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csvContent = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format an ISO timestamp for CSV export.
 * @param value - ISO date string
 */
export function formatTimestampForCsv(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

/**
 * Build a dated export filename prefix.
 * @param prefix - File prefix (e.g. m2-entries)
 */
export function datedExportFilename(prefix: string): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `${prefix}-${ts}.csv`;
}
