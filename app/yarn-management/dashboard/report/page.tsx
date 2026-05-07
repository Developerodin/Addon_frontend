"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import YarnReportCalcInfoPopover from "./components/YarnReportCalcInfoPopover";
import {
  yarnInventoryService,
  YarnReportResponse,
  YarnReportSnapshotBoundsResponse,
} from "../services/yarnInventoryService";
import {
  DEFAULT_PAGE_SIZE,
  formatLocalYmd,
  minYmd,
  maxYmd,
} from "./yarnReportConstants";
import { YarnReportDataTable } from "./components/YarnReportDataTable";
import { YarnReportSnapshotControls } from "./components/YarnReportSnapshotControls";

const YarnReportPage = () => {
  const { hasSubPermission } = useNavigation();
  const now = new Date();
  const todayStr = formatLocalYmd(now);
  const firstOfMonthStr = formatLocalYmd(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const [startDate, setStartDate] = useState(() =>
    firstOfMonthStr > todayStr ? todayStr : firstOfMonthStr
  );
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<YarnReportResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [snapshotBounds, setSnapshotBounds] =
    useState<YarnReportSnapshotBoundsResponse | null>(null);
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [boundsError, setBoundsError] = useState<string | null>(null);

  /** Prevents repeat automatic loads when dates change; manual Submit always runs. */
  const autoFetchDoneRef = useRef(false);

  const hasPermission = hasSubPermission("/yarn-management", "Analytics & reports");

  /**
   * Loads yarn report rows from the API for the given snapshot date range.
   * @param sd - Start date YYYY-MM-DD
   * @param ed - End date YYYY-MM-DD
   * @param options - UI toggles for clearing the grid and success toast
   */
  const runReportFetch = useCallback(
    async (
      sd: string,
      ed: string,
      options?: { clearReport?: boolean; toastOnOk?: boolean }
    ) => {
      const clearReport = options?.clearReport ?? true;
      const toastOnOk = options?.toastOnOk ?? true;
      setSubmitError(null);
      if (clearReport) {
        setReport(null);
      }
      setLoading(true);
      try {
        const data = await yarnInventoryService.getYarnReport({
          start_date: sd,
          end_date: ed,
        });
        setReport(data);
        setCurrentPage(1);
        if (toastOnOk) {
          toast.success("Report loaded");
        }
      } catch (err) {
        console.error("Yarn report error:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load yarn report";
        setSubmitError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const endMaxUi = useMemo(() => {
    if (!snapshotBounds?.datePicker.endMax) return todayStr;
    return minYmd(todayStr, snapshotBounds.datePicker.endMax);
  }, [snapshotBounds, todayStr]);

  const startMinUi = snapshotBounds?.datePicker.startMin ?? "2020-01-01";

  const endMinUi = useMemo(() => {
    if (!snapshotBounds?.datePicker.endMin) return startDate;
    return maxYmd(startDate, snapshotBounds.datePicker.endMin);
  }, [snapshotBounds, startDate]);

  const startMaxUi = useMemo(() => {
    if (!snapshotBounds?.datePicker.startMax) return endDate;
    return minYmd(endDate, snapshotBounds.datePicker.startMax);
  }, [snapshotBounds, endDate]);

  const totalResults = report?.results?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize) || 1);

  const paginatedRows = useMemo(() => {
    const rows = report?.results ?? [];
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [report?.results, currentPage, pageSize]);

  /** Keeps current page in range when result count or page size changes. */
  useEffect(() => {
    if (!report) return;
    setCurrentPage((p) => (p > totalPages ? totalPages : p));
  }, [report, totalPages]);

  /** Load snapshot coverage for date picker hints and limits. */
  useEffect(() => {
    if (!hasPermission) return;
    let cancelled = false;
    setBoundsLoading(true);
    setBoundsError(null);
    yarnInventoryService
      .getYarnReportSnapshotBounds()
      .then((data) => {
        if (cancelled) return;
        setSnapshotBounds(data);
        if (data.widestValidReportRange) {
          setStartDate(data.widestValidReportRange.start_date);
          setEndDate(data.widestValidReportRange.end_date);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Yarn snapshot bounds:", err);
        setBoundsError(
          err instanceof Error ? err.message : "Could not load snapshot coverage"
        );
      })
      .finally(() => {
        if (!cancelled) setBoundsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasPermission]);

  /** Once snapshot bounds are ready, load the report immediately (no Submit required). */
  useEffect(() => {
    if (!hasPermission || boundsLoading || autoFetchDoneRef.current) return;
    if (!startDate || !endDate) return;

    let cancelled = false;
    void (async () => {
      try {
        await runReportFetch(startDate, endDate, { toastOnOk: false });
        if (!cancelled) {
          autoFetchDoneRef.current = true;
        }
      } catch {
        /* Errors surfaced via submitError / toast inside runReportFetch */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasPermission, boundsLoading, startDate, endDate, runReportFetch]);

  /**
   * Updates rows-per-page and resets to the first page so the slice stays valid.
   */
  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setCurrentPage(1);
  };

  /**
   * Start date cannot exceed end date or fall before earliest allowed opening chain.
   */
  const handleStartDateChange = (value: string) => {
    let next = value;
    if (next && next < startMinUi) {
      next = startMinUi;
    }
    if (next && next > startMaxUi) {
      next = startMaxUi;
    }
    setStartDate(next);
    if (next && endDate < next) {
      setEndDate(next);
    }
  };

  /**
   * End date cannot be before start, after today, or after latest closing snapshot.
   */
  const handleEndDateChange = (value: string) => {
    let capped = value > endMaxUi ? endMaxUi : value;
    if (capped < endMinUi) {
      capped = endMinUi;
    }
    setEndDate(capped);
    if (capped && startDate > capped) {
      setStartDate(capped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission) return;
    setSubmitError(null);
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (startDate > endDate) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    try {
      await runReportFetch(startDate, endDate, { toastOnOk: true });
    } catch {
      /* Errors handled inside runReportFetch */
    }
  };

  const handleDownloadExcel = () => {
    if (!report?.results?.length) {
      toast.error("No data to download");
      return;
    }

    const blankExcelRow = (): Record<string, string | number> => ({
      Store: "",
      "HSN Code": "",
      "Yarn Name": "",
      Brand: "",
      "Shade No": "",
      "Yarn Type": "",
      "Yarn Subtype": "",
      Count: "",
      "Color Family": "",
      "Pantone Color": "",
      Opening: "",
      PUR: "",
      "PUR Ret": "",
      "Issue to Knitting": "",
      "Returned from Knitting": "",
      Balance: "",
      Rate: "",
      Unit: "",
      "GST %": "",
      Amount: "",
    });

    setDownloading(true);
    try {
      const sheetData: Record<string, string | number>[] = report.results.map(
        (row) => ({
          Store: row.store,
          "HSN Code": row.hsnCode,
          "Yarn Name": row.yarnName,
          Brand: row.brand,
          "Shade No": row.shadeNumber,
          "Yarn Type": row.yarnType,
          "Yarn Subtype": row.yarnSubtype,
          Count: row.count,
          "Color Family": row.colorFamily,
          "Pantone Color": row.pantoneColorName,
          Opening: row.opening,
          PUR: row.pur,
          "PUR Ret": row.purRet,
          "Issue to Knitting": row.yarnIssueToKnitting,
          "Returned from Knitting": row.yarnReturnedFromKnitting,
          Balance: row.balance,
          Rate: row.rate,
          Unit: row.unit,
          "GST %": row.gstPercent,
          Amount: row.amount,
        })
      );

      const summary = report.meta?.summary;
      if (summary) {
        sheetData.push(blankExcelRow());
        sheetData.push({
          ...blankExcelRow(),
          Store:
            "— meta.summary totals (do not sum Balance column above) —",
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "uniqueYarnOpeningKgSum (dedup)",
          Opening: summary.uniqueYarnOpeningKgSum,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "sumDisplayedOpeningAcrossRowsKg (Σ table)",
          Opening: summary.sumDisplayedOpeningAcrossRowsKg,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "uniqueYarnClosingKgSum (dedup)",
          Balance: summary.uniqueYarnClosingKgSum,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "sumDisplayedBalanceAcrossRowsKg (Σ table)",
          Balance: summary.sumDisplayedBalanceAcrossRowsKg,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "snapshot yarns / report rows",
          Balance: `${summary.snapshotClosingYarnCatalogCount} / ${summary.reportRowCount}`,
        });
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Yarn Report");
      const fileName = `yarn-report_${report.startDate}_to_${report.endDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success("Downloaded");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to download Excel");
    } finally {
      setDownloading(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">
              Access Restricted
            </h3>
            <p className="text-[11px] text-gray-500 mb-4">
              You don&apos;t have permission to access Yarn Report.
            </p>
            <Link
              href="/yarn-management/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
            >
              <i className="ri-arrow-left-line"></i> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Report" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/yarn-management/dashboard"
                className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                aria-label="Back to dashboard"
              >
                <i className="ri-arrow-left-line text-lg"></i>
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Report</h1>
              <YarnReportCalcInfoPopover
                startDate={report?.startDate ?? startDate}
                endDate={report?.endDate ?? endDate}
                totalsSummary={report?.meta?.summary ?? null}
              />
              <Link
                href="/yarn-management/dashboard/analytics"
                className="ml-2 text-[10px] font-bold text-purple-700 hover:underline"
              >
                PO analytics &amp; charts
              </Link>
            </div>
          </div>

          <YarnReportSnapshotControls
            submitError={submitError}
            onDismissError={() => setSubmitError(null)}
            snapshotBounds={snapshotBounds}
            boundsLoading={boundsLoading}
            boundsError={boundsError}
            startDate={startDate}
            endDate={endDate}
            startMinUi={startMinUi}
            startMaxUi={startMaxUi}
            endMinUi={endMinUi}
            endMaxUi={endMaxUi}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onSubmit={handleSubmit}
            loading={loading}
            report={report}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            downloading={downloading}
            onDownloadExcel={handleDownloadExcel}
          />
        </div>

        {/* Excel-like table - read-only */}
        <YarnReportDataTable
          report={report}
          paginatedRows={paginatedRows}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalResults={totalResults}
          loading={loading}
          boundsLoading={boundsLoading}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default YarnReportPage;
