import type { YarnReportRow } from "../services/yarnInventoryService";

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** Local calendar YYYY-MM-DD (avoid UTC drift from `toISOString()` on date inputs). */
export const formatLocalYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const minYmd = (a: string, b: string) => (a <= b ? a : b);
export const maxYmd = (a: string, b: string) => (a >= b ? a : b);

export const YARN_REPORT_COLUMNS: { key: keyof YarnReportRow; label: string }[] = [
  { key: "store", label: "Store" },
  { key: "hsnCode", label: "HSN Code" },
  { key: "yarnName", label: "Yarn Name" },
  { key: "brand", label: "Brand" },
  { key: "shadeNumber", label: "Shade No" },
  { key: "yarnType", label: "Yarn Type" },
  { key: "yarnSubtype", label: "Yarn Subtype" },
  { key: "count", label: "Count" },
  { key: "colorFamily", label: "Color Family" },
  { key: "pantoneColorName", label: "Pantone Color" },
  { key: "opening", label: "Opening" },
  { key: "pur", label: "PUR" },
  { key: "purRet", label: "PUR Ret" },
  { key: "yarnIssueToKnitting", label: "Issue to Knitting" },
  { key: "yarnReturnedFromKnitting", label: "Returned from Knitting" },
  { key: "balance", label: "Balance" },
  { key: "rate", label: "Rate" },
  { key: "unit", label: "Unit" },
  { key: "gstPercent", label: "GST %" },
  { key: "amount", label: "Amount" },
];
