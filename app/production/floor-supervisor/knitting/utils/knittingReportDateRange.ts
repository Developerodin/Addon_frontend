const IST_TIMEZONE = "Asia/Kolkata";

/** Today as YYYY-MM-DD in Asia/Kolkata. */
export function getIstTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST_TIMEZONE }).format(new Date());
}

/** Default report window: first day of current IST month through today. */
export function getDefaultKnittingReportRange(): { startDate: string; endDate: string } {
  const endDate = getIstTodayKey();
  const end = new Date(`${endDate}T12:00:00`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(end);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const startDate = `${year}-${month}-01`;
  return { startDate, endDate };
}

export function isValidReportDateRange(startDate: string, endDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return false;
  }
  return startDate <= endDate;
}