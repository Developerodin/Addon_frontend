"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import yarnGrnService, {
  YarnGrn,
  type YarnGrnMonthlySummaryRow,
  type YarnGrnMonthlySummaryTotals,
} from '@/shared/services/yarnGrnService';
import GrnDetailDrawer from '@/shared/components/grn/GrnDetailDrawer';
import GrnMonthlySummaryTable from './GrnMonthlySummaryTable';
import { downloadGrnMonthlySummaryExcel } from './grnMonthlySummaryExport';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FIRST_SELECTABLE_YEAR = 2023;
const PAGE_LIMIT = 50;

const EMPTY_TOTALS: YarnGrnMonthlySummaryTotals = {
  grnCount: 0,
  lineCount: 0,
  boxes: 0,
  qty: 0,
  amount: 0,
  gst: 0,
  grandTotal: 0,
};

/**
 * Current calendar year/month in Asia/Kolkata.
 */
function getIstYearMonth(): { year: number; month: number } {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const [year, month] = key.split('-');
  return { year: Number(year), month: Number(month) };
}

/**
 * Year options from the first selectable year through the current IST year.
 * @param currentYear - current IST year
 */
function yearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = FIRST_SELECTABLE_YEAR; y <= currentYear; y += 1) years.push(y);
  return years;
}

const inputClass =
  'bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5';

/**
 * Monthly yarn-line register: IST month picker, supplier filter, table, Excel.
 */
export default function GrnMonthlySummaryTab() {
  const istNow = useMemo(() => getIstYearMonth(), []);
  const [year, setYear] = useState(istNow.year);
  const [month, setMonth] = useState(istNow.month);
  const [supplierDraft, setSupplierDraft] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<YarnGrnMonthlySummaryRow[]>([]);
  const [totals, setTotals] = useState<YarnGrnMonthlySummaryTotals>(EMPTY_TOTALS);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [appliedYear, setAppliedYear] = useState(istNow.year);
  const [appliedMonth, setAppliedMonth] = useState(istNow.month);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [active, setActive] = useState<YarnGrn | null>(null);
  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await yarnGrnService.getMonthlySummary({
        year,
        month,
        supplierName: supplierName || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      if (reqIdRef.current !== reqId) return;
      setResults(res.results || []);
      setTotals(res.totals || EMPTY_TOTALS);
      setTotalPages(res.totalPages || 0);
      setTotalResults(res.totalResults || 0);
      setAppliedYear(res.year);
      setAppliedMonth(res.month);
      setIsLoading(false);
    } catch (err: unknown) {
      if (reqIdRef.current !== reqId) return;
      const message = err instanceof Error ? err.message : 'Failed to load monthly summary';
      setError(message);
      setResults([]);
      setTotals(EMPTY_TOTALS);
      setIsLoading(false);
    }
  }, [year, month, supplierName, page]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Apply the supplier draft and reset to page 1.
   */
  const applySupplier = () => {
    setSupplierName(supplierDraft.trim());
    setPage(1);
  };

  /**
   * Open the GRN detail drawer from a summary row.
   * @param grnId - YarnGrn id
   */
  const handleView = async (grnId: string) => {
    if (!grnId) return;
    try {
      const full = await yarnGrnService.getGrnById(grnId);
      setActive(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GRN';
      toast.error(message);
    }
  };

  /**
   * Download every yarn line for the selected month as Excel.
   */
  const handleExport = async () => {
    if (totalResults === 0) {
      toast.error('No rows to export for this month.');
      return;
    }
    setExporting(true);
    try {
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      const count = await downloadGrnMonthlySummaryExcel(
        { year, month, supplierName: supplierName || undefined },
        `yarn-grn-summary_${ym}`
      );
      if (count === 0) toast.error('No rows to export.');
      else toast.success(`Downloaded ${count} line(s) to Excel.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Excel export failed';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const selectedLabel = `${MONTH_LABELS[month - 1]} ${year}`;
  const isStale = appliedYear !== year || appliedMonth !== month;
  const pending = isLoading || isStale;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-600">Year</span>
            <select
              className={inputClass}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Select summary year"
            >
              {yearOptions(istNow.year).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-600">Month</span>
            <select
              className={inputClass}
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Select summary month"
            >
              {MONTH_LABELS.map((label, idx) => (
                <option key={label} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-600">Supplier</span>
            <input
              type="search"
              className={`${inputClass} w-44`}
              placeholder="All suppliers"
              value={supplierDraft}
              onChange={(e) => setSupplierDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySupplier();
              }}
              aria-label="Filter by supplier name"
            />
          </label>
          <button
            type="button"
            onClick={applySupplier}
            className="px-3 py-1.5 text-white text-[11px] font-bold rounded bg-purple-600 hover:bg-purple-700 transition-colors"
            aria-label="Apply supplier filter"
          >
            Apply
          </button>
          <p className="text-[11px] font-medium text-gray-500" aria-live="polite">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-purple-700">
                <span
                  className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"
                  aria-hidden
                />
                Loading {selectedLabel}…
              </span>
            ) : (
              `${MONTH_LABELS[appliedMonth - 1]} ${appliedYear}`
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isLoading || exporting || totalResults === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
          aria-label="Download monthly summary as Excel"
        >
          <i
            className={`ri-file-excel-2-line text-white ${exporting ? 'animate-pulse' : ''}`}
            aria-hidden
          />
          {exporting ? 'Exporting…' : 'Download Excel'}
        </button>
      </div>

      <GrnMonthlySummaryTable
        results={results}
        totals={totals}
        isLoading={pending}
        error={error}
        page={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        onView={(grnId) => void handleView(grnId)}
      />

      <GrnDetailDrawer
        grn={active}
        onClose={() => setActive(null)}
        onUpdated={(updated) => {
          setActive(updated);
          void load();
        }}
      />
    </>
  );
}
