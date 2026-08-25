import type { BacklogReportDateRow, BacklogReportFloorColumn } from "@/shared/services/productionService";

/**
 * Escapes a CSV cell (quotes values that contain commas, quotes, or newlines).
 * @param value Cell value
 */
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Formats an ISO date key as M/D/YYYY.
 * @param iso YYYY-MM-DD
 */
function formatDateCell(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

/**
 * Downloads the date × floor backlog matrix as an Excel-compatible CSV.
 * @param year Selected year
 * @param month Selected month 1–12
 * @param floors Floor column defs
 * @param rows Date rows
 * @param asOfDate Last populated date key
 */
export function downloadBacklogReportCsv(
  year: number,
  month: number,
  floors: BacklogReportFloorColumn[],
  rows: BacklogReportDateRow[],
  asOfDate: string
): void {
  const headers = ["DATE", ...floors.map((f) => f.label), "Total"];
  const body = rows.map((row) => [
    formatDateCell(row.date),
    ...floors.map((f) => (row.floors[f.key] == null ? "" : Math.round(row.floors[f.key] as number))),
    row.total == null ? "" : Math.round(row.total),
  ]);

  const csvContent = [headers.map(csvCell).join(","), ...body.map((r) => r.map(csvCell).join(","))].join(
    "\n"
  );
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `production-backlog-report-${year}${String(month).padStart(2, "0")}-asof-${asOfDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
