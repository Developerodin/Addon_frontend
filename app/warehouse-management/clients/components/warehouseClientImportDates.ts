export type OpeningDateParse =
  | { ok: true; iso?: string }
  | { ok: false; reason: 'placeholder' | 'invalid' | 'excelEmpty'; display?: string };

const PLACEHOLDER = /^(?:-|—|–|n\/?a|na|none|null|nil)$/i;

/** SheetJS prints Excel serial 0 as 1900/01/00. Excel itself shows 1899/12/31. */
const EXCEL_ZERO_DATE = /^(?:1900\/0?1\/0?0|1900-01-00|1899\/12\/31|1899-12-31)$/;

/**
 * Excel serial 0 is an empty date. The grid shows 1899/12/31, not 1900/01/00.
 */
function isExcelZeroDate(value: unknown, text: string): boolean {
  if (value === 0) return true;
  if (EXCEL_ZERO_DATE.test(text)) return true;
  if (value instanceof Date && !Number.isNaN(value.getTime()) && value.getFullYear() < 1901) {
    return true;
  }
  return false;
}

/**
 * Build a UTC calendar date, rejecting impossible days such as 31 Feb or day 0.
 */
function calendarDate(year: number, month: number, day: number): OpeningDateParse {
  if (year < 1901 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: 'invalid' };
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, reason: 'invalid' };
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return { ok: true, iso: `${year}-${mm}-${dd}` };
}

/**
 * Parse an Opening Date cell into YYYY-MM-DD.
 * Accepts Excel dates, YYYY-MM-DD, YYYY/MM/DD, and day-first DD.MM.YYYY / DD/MM/YYYY.
 * Blank is allowed. Placeholders and impossible dates are rejected.
 */
export function parseOpeningDateCell(value: unknown): OpeningDateParse {
  if (value === undefined || value === null || value === '') return { ok: true };
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { ok: false, reason: 'invalid' };
    if (isExcelZeroDate(value, '')) {
      return { ok: false, reason: 'excelEmpty', display: '1899/12/31' };
    }
    return calendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const text = String(value).trim();
  if (!text) return { ok: true };
  if (isExcelZeroDate(value, text)) {
    return { ok: false, reason: 'excelEmpty', display: '1899/12/31' };
  }
  if (PLACEHOLDER.test(text)) return { ok: false, reason: 'placeholder' };

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (Number.isFinite(serial) && serial > 1000 && serial < 600000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!Number.isNaN(date.getTime())) {
        return calendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      }
    }
  }

  const yearFirst = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yearFirst) return calendarDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));

  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirst) return calendarDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return calendarDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return { ok: false, reason: 'invalid' };
}
