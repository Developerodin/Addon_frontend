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
 * Pending cell for CSV; future days are blank.
 * @param value Qty or null
 */
function pendingCsv(value: number | null | undefined): string | number {
  return value == null ? "" : Math.round(value);
}

/**
 * Upcoming cell for CSV; only today has values.
 * @param row Date row
 * @param floorKey Floor key
 */
function upcomingCsv(row: BacklogReportDateRow, floorKey: string): string | number {
  if (!row.isToday) return "";
  const qty = row.upcoming?.[floorKey];
  return qty && qty > 0 ? Math.round(qty) : "";
}

/**
 * Combined pending + upcoming for CSV; blank when not today or there is no upcoming.
 * @param row Date row
 * @param pending Pending qty
 * @param upcoming Upcoming qty
 */
function combinedCsv(
  row: BacklogReportDateRow,
  pending: number | null | undefined,
  upcoming: number | undefined
): string | number {
  if (!row.isToday || pending == null) return "";
  const up = upcoming && upcoming > 0 ? Math.round(upcoming) : 0;
  if (up <= 0) return "";
  return Math.round(pending) + up;
}

/**
 * Downloads the date × floor backlog matrix as an Excel-compatible CSV.
 * Pending columns stay as-is; today also writes Floor (upcoming) columns.
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
  const headers = [
    "DATE",
    ...floors.map((f) => f.label),
    "Total",
    ...floors.map((f) => `${f.label} (upcoming)`),
    "Total (upcoming)",
    ...floors.map((f) => `${f.label} (total)`),
    "Total (pending + upcoming)",
  ];
  const body = rows.map((row) => [
    formatDateCell(row.date),
    ...floors.map((f) => pendingCsv(row.floors[f.key])),
    pendingCsv(row.total),
    ...floors.map((f) => upcomingCsv(row, f.key)),
    row.isToday && row.upcomingTotal && row.upcomingTotal > 0
      ? Math.round(row.upcomingTotal)
      : "",
    ...floors.map((f) => combinedCsv(row, row.floors[f.key], row.upcoming?.[f.key])),
    combinedCsv(row, row.total, row.upcomingTotal),
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
