"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type DailyProductionSummaryResponse,
} from "@/shared/services/productionService";
import DownloadExcelButton from "./DownloadExcelButton";
import DailyProductionSummaryTable from "./DailyProductionSummaryTable";
import { downloadDailyProductionSummaryCsv } from "./dailyProductionSummaryExport";

export interface DailyProductionSummaryTabProps {
  /** Increment from parent header Refresh to reload this tab. */
  refreshNonce?: number;
  /** Reports in-flight state so the page header Refresh spinner can follow. */
  onLoadingChange?: (loading: boolean) => void;
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const FIRST_SELECTABLE_YEAR = 2023;

/**
 * Current calendar year/month in Asia/Kolkata.
 */
function getIstYearMonth(): { year: number; month: number } {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [year, month] = key.split("-");
  return { year: Number(year), month: Number(month) };
}

/**
 * Year options from the first selectable year through the current IST year.
 * @param currentYear Current IST year
 */
function yearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = FIRST_SELECTABLE_YEAR; y <= currentYear; y += 1) years.push(y);
  return years;
}

/**
 * Production supervisor tab: Details × date matrix of daily production quantity (IST).
 *
 * QC floors (Checking, Secondary Checking, Final Checking) report M1 booked that day; other
 * floors report the quantity transferred off that day; M2/M3/M4 rows come from the
 * dedicated defect ledgers.
 */
export default function DailyProductionSummaryTab({
  refreshNonce = 0,
  onLoadingChange,
}: DailyProductionSummaryTabProps) {
  const istNow = useMemo(() => getIstYearMonth(), []);
  const [year, setYear] = useState(istNow.year);
  const [month, setMonth] = useState(istNow.month);
  const [includeExtraRows, setIncludeExtraRows] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [report, setReport] = useState<DailyProductionSummaryResponse | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const response = await productionService.getDailyProductionSummary({
        year,
        month,
        includeExtraRows,
      });
      // A newer period was selected while this request was in flight; drop the stale payload.
      if (requestId !== requestIdRef.current) return;
      if (response.success && response.data) {
        setReport(response.data);
      } else {
        toast.error(response.error?.message || "Failed to load daily production summary");
        setReport(null);
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to load daily production summary";
      toast.error(message);
      setReport(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }
  }, [year, month, includeExtraRows, onLoadingChange]);

  useEffect(() => {
    void load();
  }, [load, refreshNonce]);

  const rows = report?.rows ?? [];

  // The table always belongs to the period the API answered with, which can lag the selects.
  const appliedLabel = report ? `${MONTH_LABELS[report.month - 1]} ${report.year}` : "";
  const selectedLabel = `${MONTH_LABELS[month - 1]} ${year}`;
  const isStale =
    Boolean(report) &&
    (report?.year !== year ||
      report?.month !== month ||
      report?.includeExtraRows !== includeExtraRows);
  // Covers the render frame between a control change and the fetch effect, so the old table
  // is never presented as if it belonged to the newly picked period.
  const pending = loading || isStale;

  return (
    <div>
      <div className="p-[10px] mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-600">Year</span>
          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Select report year"
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
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Select report month"
          >
            {MONTH_LABELS.map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            checked={includeExtraRows}
            onChange={(e) => setIncludeExtraRows(e.target.checked)}
          />
          <span className="text-[11px] font-bold text-gray-600">Show Re-Boarding</span>
        </label>

        <p className="text-[11px] font-medium text-gray-500" aria-live="polite">
          {pending ? (
            <span className="inline-flex items-center gap-1.5 text-purple-700">
              <span
                className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"
                aria-hidden="true"
              />
              Loading {selectedLabel}…
            </span>
          ) : appliedLabel ? (
            <>
              Showing <span className="font-bold text-gray-700">{appliedLabel}</span>
            </>
          ) : (
            <>Showing {selectedLabel}</>
          )}
        </p>

        <button
          type="button"
          className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="How daily production quantity is calculated"
          aria-expanded={showFormula}
          title="How this report is calculated"
          onClick={() => setShowFormula((open) => !open)}
        >
          <i className="ri-information-line text-sm" aria-hidden="true" />
        </button>

        <DownloadExcelButton
          onClick={() => {
            if (!report) return;
            downloadDailyProductionSummaryCsv(report);
          }}
          disabled={pending || rows.length === 0}
          ariaLabel="Download daily production summary as CSV"
        />
      </div>

      {showFormula && (
        <div className="mx-[10px] mb-2 rounded border border-purple-100 bg-purple-50/60 px-3 py-2 text-[11px] text-gray-700 space-y-1">
          <p>
            All days are IST calendar days (00:00–23:59, Asia/Kolkata). Future days are blank.
          </p>
          <p>
            <strong>Knitting, Rosso, Washing, Boarding, Silicon, Branding</strong> = qty transferred
            off that floor that day. If a knitting machine holds 3,000 and moves 1,000 to the next
            floor, that day&apos;s knitting production is 1,000; all machines are summed.{" "}
            <strong>Ready For Dispatch</strong> = qty transferred off the Dispatch floor.
          </p>
          <p>
            <strong>Checking, Secondary Checking, Final Checking</strong> = M1 (good quality) booked
            on that floor that day. Each one&apos;s <strong>M2 / M3 / M4</strong> rows are the defect
            qty booked on the same floor that day, so the floor row plus its M2, M3 and M4 rows add
            up to everything inspected there that day.
          </p>
          <p>
            <strong>Knitting M4</strong> = M4 booked on Knitting that day. Repair sends back to an
            earlier floor are excluded, since they are not forward production.
          </p>
        </div>
      )}

      {(report?.warnings?.length ?? 0) > 0 && (
        <div
          className="mx-[10px] mb-2 rounded border border-amber-200 bg-amber-50 px-3 py-2"
          role="note"
          aria-label="Data availability notes for this report"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
            <i className="ri-alert-line text-sm" aria-hidden="true" />
            Data availability
          </p>
          <ul className="list-disc pl-5 pt-1 space-y-0.5 text-[11px] text-amber-800">
            {report?.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {pending && rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20"
          role="status"
          aria-live="polite"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <i className="ri-inbox-line text-xl text-gray-200" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO PRODUCTION DATA</h3>
        </div>
      ) : (
        <div className="relative" aria-busy={pending}>
          {pending && (
            <div className="absolute inset-0 z-30 flex items-start justify-center bg-white/60 backdrop-blur-[1px]">
              <p className="mt-16 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-700 shadow-sm">
                <span
                  className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"
                  aria-hidden="true"
                />
                Loading {selectedLabel}…
              </p>
            </div>
          )}
          <div className={`overflow-x-auto ${pending ? "opacity-40" : ""}`}>
            {report && (
              <DailyProductionSummaryTable report={report} periodLabel={appliedLabel} />
            )}
          </div>
          <p className="px-[10px] py-2 text-[11px] text-gray-500">
            {appliedLabel} — total production across all rows{" "}
            <span className="font-bold text-gray-700">
              {Math.round(report?.grandTotal ?? 0).toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
