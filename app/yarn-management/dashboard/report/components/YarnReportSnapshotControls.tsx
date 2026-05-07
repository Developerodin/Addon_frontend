"use client";

import React from "react";
import type {
  YarnReportResponse,
  YarnReportSnapshotBoundsResponse,
} from "../../services/yarnInventoryService";
import { PAGE_SIZE_OPTIONS } from "../yarnReportConstants";

export interface YarnReportSnapshotControlsProps {
  submitError: string | null;
  onDismissError: () => void;
  snapshotBounds: YarnReportSnapshotBoundsResponse | null;
  boundsLoading: boolean;
  boundsError: string | null;
  startDate: string;
  endDate: string;
  startMinUi: string;
  startMaxUi: string;
  endMinUi: string;
  endMaxUi: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  report: YarnReportResponse | null;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  downloading: boolean;
  onDownloadExcel: () => void;
}

/**
 * Snapshot bounds notice, date range form, dedup summary strip, and Excel export row.
 */
export function YarnReportSnapshotControls({
  submitError,
  onDismissError,
  snapshotBounds,
  boundsLoading,
  boundsError,
  startDate,
  endDate,
  startMinUi,
  startMaxUi,
  endMinUi,
  endMaxUi,
  onStartDateChange,
  onEndDateChange,
  onSubmit,
  loading,
  report,
  pageSize,
  onPageSizeChange,
  downloading,
  onDownloadExcel,
}: YarnReportSnapshotControlsProps) {
  return (
    <>
      {submitError && (
        <div
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-extrabold text-red-900 mb-0.5">
                Failed to load yarn report
              </div>
              <div className="break-words">{submitError}</div>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded hover:bg-red-100 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              aria-label="Dismiss error"
            >
              <i className="ri-close-line text-base" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-50 rounded border border-gray-100"
      >
        <div className="w-full basis-full space-y-1.5">
          {boundsLoading && (
            <p className="text-[10px] text-gray-500" role="status">
              Loading snapshot coverage…
            </p>
          )}
          {boundsError && (
            <p
              className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5"
              role="status"
            >
              {boundsError} — date limits fall back to calendar only.
            </p>
          )}
          {snapshotBounds &&
            !boundsLoading &&
            snapshotBounds.earliestSnapshotDate &&
            snapshotBounds.latestSnapshotDate && (
              <p
                className="text-[11px] leading-snug text-emerald-900 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-2"
                role="note"
              >
                <span className="font-bold text-emerald-950">
                  Closing snapshot dates on file:{" "}
                </span>
                <span className="font-mono font-semibold">
                  {snapshotBounds.earliestSnapshotDate}
                </span>
                {" → "}
                <span className="font-mono font-semibold">
                  {snapshotBounds.latestSnapshotDate}
                </span>
                <span className="text-emerald-800">
                  {" "}
                  ({snapshotBounds.distinctSnapshotDates} day
                  {snapshotBounds.distinctSnapshotDates === 1 ? "" : "s"},{" "}
                  {snapshotBounds.totalSnapshotRows.toLocaleString()} rows).{" "}
                </span>
                {snapshotBounds.widestValidReportRange ? (
                  <span className="text-emerald-800">
                    Widest valid range:{" "}
                    <span className="font-mono font-semibold">
                      {snapshotBounds.widestValidReportRange.start_date}
                    </span>
                    {" — "}
                    <span className="font-mono font-semibold">
                      {snapshotBounds.widestValidReportRange.end_date}
                    </span>
                    .{" "}
                  </span>
                ) : null}
                <span className="text-emerald-800/95">
                  {snapshotBounds.yarnReportHelp}
                </span>
              </p>
            )}
          {snapshotBounds &&
            !boundsLoading &&
            !snapshotBounds.earliestSnapshotDate && (
              <p
                className="text-[11px] text-amber-900 bg-amber-50 border border-amber-100 rounded px-2.5 py-2"
                role="note"
              >
                No yarn daily closing snapshots yet — run the nightly snapshot job or
                backfill before this report can load.
              </p>
            )}
        </div>
        <div>
          <label
            htmlFor="yarn-report-start-date"
            className="block text-[10px] font-bold text-gray-500 mb-1"
          >
            Start Date
          </label>
          <input
            id="yarn-report-start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={startMaxUi}
            min={startMinUi}
            className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            required
            aria-label="Report start date"
          />
        </div>
        <div>
          <label
            htmlFor="yarn-report-end-date"
            className="block text-[10px] font-bold text-gray-500 mb-1"
          >
            End Date
          </label>
          <input
            id="yarn-report-end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={endMinUi}
            max={endMaxUi}
            className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            required
            aria-label="Report end date"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line animate-spin text-xs" />
              Loading
            </>
          ) : (
            <>
              <i className="ri-file-list-3-line text-xs" />
              Submit
            </>
          )}
        </button>
      </form>

      {report?.meta?.summary ? (
        <div
          className="mx-[10px] mb-4 rounded border border-blue-100 bg-blue-50/90 px-3 py-2.5"
          role="region"
          aria-label="Dedup yarn snapshot totals"
        >
          <div className="text-[10px] font-extrabold text-blue-950 mb-1.5">
            Snapshot totals (compare to inventory — not Σ Balance column)
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-blue-950">
            <div className="flex flex-wrap gap-1 justify-between gap-x-2">
              <dt className="text-blue-900/90">Opening snapshot date</dt>
              <dd className="font-mono font-semibold">
                {report.meta.openingSnapshotDate}
              </dd>
            </div>
            <div className="flex flex-wrap gap-1 justify-between gap-x-2">
              <dt className="text-blue-900/90">Closing snapshot date</dt>
              <dd className="font-mono font-semibold">
                {report.meta.closingSnapshotDate}
              </dd>
            </div>
            <div className="flex flex-wrap gap-1 justify-between gap-x-2 sm:col-span-2">
              <dt className="text-blue-900/90">uniqueYarnClosingKgSum (dedup kg)</dt>
              <dd className="font-mono font-bold">
                {report.meta.summary.uniqueYarnClosingKgSum.toLocaleString()} kg
              </dd>
            </div>
            <div className="flex flex-wrap gap-1 justify-between gap-x-2 sm:col-span-2">
              <dt className="text-blue-900/90">Σ Balance across table rows</dt>
              <dd className="font-mono font-semibold">
                {report.meta.summary.sumDisplayedBalanceAcrossRowsKg.toLocaleString()}{" "}
                kg
                <span className="font-sans font-normal text-blue-900/80 ml-1">
                  (inflates when one yarn spans multiple rows)
                </span>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {report && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="yarn-report-page-size"
              className="text-[10px] font-bold text-gray-500 whitespace-nowrap"
            >
              Rows per page
            </label>
            <select
              id="yarn-report-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onDownloadExcel}
            disabled={downloading || !report.results?.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs" />
                Downloading
              </>
            ) : (
              <>
                <i className="ri-download-2-line text-xs" />
                Download Excel
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
