import type { DailyProductionSummaryRow } from "@/shared/services/productionService";

/**
 * Presentation helpers shared by the Daily Production Summary table and its CSV export.
 *
 * Row order and labels come from the API so the two never drift. These helpers only add
 * display concerns: indenting defect rows under their parent floor, and disambiguating
 * the repeated "M2" / "M3" / "M4" labels for screen readers and CSV columns.
 */

/**
 * True when the row is an M2/M3/M4 defect bucket rather than a floor's own output.
 * @param row Report row
 */
export function isDefectRow(row: DailyProductionSummaryRow): boolean {
  return row.kind === "defect";
}

/**
 * True when the row reports M1 (good quality) booked on a QC floor.
 * @param row Report row
 */
export function isM1Row(row: DailyProductionSummaryRow): boolean {
  return row.kind === "m1";
}

/**
 * True when the row should be visually indented as a child of the floor above it.
 * "Knitting M4" already names its floor, so only the bare M2/M3/M4 rows indent.
 * @param row Report row
 */
export function isNestedDefectRow(row: DailyProductionSummaryRow): boolean {
  return isDefectRow(row) && /^M[234]$/.test(row.label);
}

/**
 * Fully qualified row label, used for CSV cells and accessible names.
 * Turns a bare "M3" into "Checking M3" so repeated labels stay distinguishable.
 * @param row Report row
 */
export function getQualifiedRowLabel(row: DailyProductionSummaryRow): string {
  if (isNestedDefectRow(row) && row.sourceFloor) {
    return `${row.sourceFloor} ${row.label}`;
  }
  return row.label;
}

/**
 * Explains where a row's numbers come from, for the cell title attribute.
 * @param row Report row
 */
export function getRowSourceDescription(row: DailyProductionSummaryRow): string {
  if (isDefectRow(row)) {
    return `${row.category} booked on ${row.sourceFloor} that day`;
  }
  if (isM1Row(row)) {
    return `M1 (good quality) booked on ${row.sourceFloor} that day`;
  }
  return `Qty transferred off ${row.floor} that day`;
}

/**
 * Formats a qty cell. Future dates arrive as null and render as an em dash.
 * @param value Qty or null
 */
export function formatQtyCell(value: number | null | undefined): string {
  if (value == null) return "—";
  return Math.round(value).toLocaleString();
}

/**
 * Formats an ISO date key as M/D/YYYY, matching the backlog report's column headers.
 * @param iso YYYY-MM-DD
 */
export function formatDateHeader(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}
