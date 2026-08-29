"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type BacklogReportDateRow,
  type BacklogReportResponse,
} from "@/shared/services/productionService";
import DownloadExcelButton from "./DownloadExcelButton";
import { downloadBacklogReportCsv } from "./backlogReportExport";
import BacklogQtyCell from "./BacklogQtyCell";

export interface BacklogReportTabProps {
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

/**
 * Current calendar year/month in Asia/Kolkata.
 */
function getIstYearMonth(): { year: number; month: number } {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [year, month] = key.split("-");
  return { year: Number(year), month: Number(month) };
}

/**
 * Formats YYYY-MM-DD as M/D/YYYY.
 * @param iso Date key
 */
function formatDateCell(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

/**
 * Year options from 2023 through the current IST year.
 */
function yearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = 2023; y <= currentYear; y += 1) years.push(y);
  return years;
}

/**
 * Table rows: today only, or the full month when Show all is on.
 * Months without a today row (past/future) always show the whole period.
 * @param rows API date rows for the selected month
 * @param showAll Whether the user expanded to the full month
 */
function visibleBacklogRows(rows: BacklogReportDateRow[], showAll: boolean): BacklogReportDateRow[] {
  if (showAll) return rows;
  const todayRows = rows.filter((row) => row.isToday);
  return todayRows.length > 0 ? todayRows : rows;
}

/**
 * Production supervisor tab: DATE × floors pending qty (no M2/M3/M4).
 */
export default function BacklogReportTab({
  refreshNonce = 0,
  onLoadingChange,
}: BacklogReportTabProps) {
  const istNow = useMemo(() => getIstYearMonth(), []);
  const [year, setYear] = useState(istNow.year);
  const [month, setMonth] = useState(istNow.month);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [report, setReport] = useState<BacklogReportResponse | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const response = await productionService.getBacklogReport({ year, month });
      // A newer period was selected while this request was in flight; drop the stale payload.
      if (requestId !== requestIdRef.current) return;
      if (response.success && response.data) {
        setReport(response.data);
      } else {
        toast.error(response.error?.message || "Failed to load backlog report");
        setReport(null);
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to load backlog report";
      toast.error(message);
      setReport(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }
  }, [year, month, onLoadingChange]);

  useEffect(() => {
    void load();
  }, [load, refreshNonce]);

  const rows = report?.rows ?? [];
  const hasTodayRow = rows.some((row) => row.isToday);
  const visibleRows = useMemo(() => visibleBacklogRows(rows, showAll), [rows, showAll]);
  const floors = report?.floors ?? [];
  const asOfDate = report?.asOf?.date;
  const asOfLabel = asOfDate ? formatDateCell(asOfDate) : "";

  // The table always belongs to the period the API answered with, which can lag the selects.
  const appliedLabel = report ? `${MONTH_LABELS[report.month - 1]} ${report.year}` : "";
  const selectedLabel = `${MONTH_LABELS[month - 1]} ${year}`;
  const isStale = Boolean(report) && (report?.year !== year || report?.month !== month);
  // Covers the render frame between a select change and the fetch effect, so the old table
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
            onChange={(e) => {
              setYear(Number(e.target.value));
              setShowAll(false);
            }}
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
            onChange={(e) => {
              setMonth(Number(e.target.value));
              setShowAll(false);
            }}
            aria-label="Select report month"
          >
            {MONTH_LABELS.map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {hasTodayRow && (
          <button
            type="button"
            className="px-2.5 py-1.5 text-[11px] font-bold rounded border border-gray-200 bg-white text-[#495057] hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-pressed={showAll}
            aria-label={showAll ? "Show today's backlog row only" : "Show all days in the selected month"}
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? "Show today" : "Show all"}
          </button>
        )}
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
              Showing{" "}
              <span className="font-bold text-gray-700">
                {hasTodayRow && !showAll ? "today" : appliedLabel}
              </span>
            </>
          ) : (
            <>Showing {selectedLabel}</>
          )}
        </p>
        <button
          type="button"
          className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="How backlog pending qty is calculated"
          aria-expanded={showFormula}
          title="How this report is calculated"
          onClick={() => setShowFormula((open) => !open)}
        >
          <i className="ri-information-line text-sm" aria-hidden="true" />
        </button>
        <DownloadExcelButton
          onClick={() => {
            if (!report) return;
            downloadBacklogReportCsv(
              report.year,
              report.month,
              report.floors,
              report.rows,
              report.asOf.date
            );
          }}
          disabled={pending || visibleRows.length === 0}
          ariaLabel="Download backlog report as CSV"
        />
      </div>

      {showFormula && (
        <div className="mx-[10px] mb-2 rounded border border-purple-100 bg-purple-50/60 px-3 py-2 text-[11px] text-gray-700 space-y-1">
          <p>
            <strong>Pending qty</strong> on a floor = qty received onto that floor by that IST date minus qty
            transferred off it. Today uses live received − transferred. Future days are blank.
          </p>
          <p>
            <strong>Upcoming</strong> (today only, +N under pending) is qty in ACTIVE production containers
            waiting to be accepted on that floor — transferred off the previous floor, not yet in received.
            Vendor containers are excluded.
          </p>
          <p>
            <strong>Total</strong> under a today cell with Upcoming is pending + upcoming. The date-row Total
            column is factory pending; its third line is factory pending + all upcoming. Footer is as-of the last
            populated day, not the sum of dates.
          </p>
        </div>
      )}

      {pending && visibleRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <i className="ri-inbox-line text-xl text-gray-200" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO BACKLOG DATA</h3>
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
            <table
              className="w-max min-w-full border-collapse border border-gray-300 [border-spacing:0]"
              aria-label="Backlog report pending quantity by date and floor"
            >
              <thead>
                <tr className="bg-gray-50/80">
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-gray-50 px-2 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 whitespace-nowrap"
                  >
                    DATE
                  </th>
                  {floors.map((floor) => (
                    <th
                      key={floor.key}
                      scope="col"
                      className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 whitespace-nowrap"
                    >
                      {floor.label}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 whitespace-nowrap"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.date} className={row.isToday ? "bg-purple-50/70" : "bg-white"}>
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 px-2 py-1.5 text-left text-[11px] font-bold border border-gray-300 whitespace-nowrap ${
                        row.isToday ? "bg-purple-50 text-purple-700" : "bg-white text-[#495057]"
                      }`}
                    >
                      {formatDateCell(row.date)}
                    </th>
                    {floors.map((floor) => (
                      <BacklogQtyCell
                        key={floor.key}
                        pending={row.floors[floor.key]}
                        upcoming={row.upcoming?.[floor.key]}
                        pendingLabel={`${floor.label} pending`}
                      />
                    ))}
                    <BacklogQtyCell
                      pending={row.total}
                      upcoming={row.upcomingTotal}
                      emphasize
                      pendingLabel="factory pending"
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {asOfLabel && (
            <p className="px-[10px] py-2 text-[11px] text-gray-500">
              {appliedLabel} — as of {asOfLabel}: factory floor pending{" "}
              <span className="font-bold text-gray-700">
                {Math.round(report?.asOf.total ?? 0).toLocaleString()}
              </span>
              {(report?.asOf.upcomingTotal ?? 0) > 0 ? (
                <>
                  {" "}
                  +{" "}
                  <span className="font-bold text-purple-700">
                    {Math.round(report?.asOf.upcomingTotal ?? 0).toLocaleString()} upcoming
                  </span>
                  {" = "}
                  <span className="font-bold text-gray-800">
                    {(
                      Math.round(report?.asOf.total ?? 0) + Math.round(report?.asOf.upcomingTotal ?? 0)
                    ).toLocaleString()}
                  </span>
                </>
              ) : null}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
